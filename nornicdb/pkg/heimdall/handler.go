package heimdall

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strings"
	"time"
)

// Handler provides HTTP endpoints for Bifrost chat.
// Uses standard HTTP/SSE - no external dependencies required.
// Bifrost is the rainbow bridge that connects to Heimdall.
//
// Endpoints:
//   - GET  /api/bifrost/status           - Heimdall and Bifrost status
//   - POST /api/bifrost/chat/completions - Chat with Heimdall
//   - GET  /api/bifrost/events           - SSE stream for real-time events
type Handler struct {
	manager  *Manager
	bifrost  *Bifrost
	config   Config
	database DatabaseReader
	metrics  MetricsReader
}

// NewHandler creates a Bifrost HTTP handler.
// Returns nil if Heimdall is disabled (manager is nil).
// Automatically creates Bifrost bridge when Heimdall is enabled.
func NewHandler(manager *Manager, cfg Config, db DatabaseReader, metrics MetricsReader) *Handler {
	if manager == nil {
		return nil
	}
	// Bifrost is automatically enabled when Heimdall is enabled
	bifrost := NewBifrost(cfg)
	return &Handler{
		manager:  manager,
		bifrost:  bifrost,
		config:   cfg,
		database: db,
		metrics:  metrics,
	}
}

// Bifrost returns the BifrostBridge for plugin communication.
// Returns NoOpBifrost if Bifrost is not available.
func (h *Handler) Bifrost() BifrostBridge {
	if h.bifrost == nil {
		return &NoOpBifrost{}
	}
	return h.bifrost
}

// ServeHTTP routes requests to appropriate handlers.
func (h *Handler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	switch {
	case r.URL.Path == "/api/bifrost/status":
		h.handleStatus(w, r)
	case r.URL.Path == "/api/bifrost/chat/completions":
		h.handleChatCompletions(w, r)
	case r.URL.Path == "/api/bifrost/events":
		h.handleEvents(w, r)
	default:
		http.NotFound(w, r)
	}
}

// handleStatus returns Heimdall status and stats.
// GET /api/bifrost/status
func (h *Handler) handleStatus(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	stats := h.manager.Stats()

	// Include Bifrost stats if available
	var bifrostStats map[string]interface{}
	if h.bifrost != nil {
		bifrostStats = h.bifrost.Stats()
	} else {
		bifrostStats = map[string]interface{}{
			"enabled":          false,
			"connection_count": 0,
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"status": "ok",
		"model":  h.config.Model,
		"heimdall": map[string]interface{}{
			"enabled": h.config.Enabled,
			"stats":   stats,
		},
		"bifrost": bifrostStats,
	})
}

// handleEvents provides an SSE stream for real-time Bifrost events.
// GET /api/bifrost/events
//
// This endpoint allows clients to receive real-time notifications, messages,
// and system events from Heimdall and its plugins.
func (h *Handler) handleEvents(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Verify Bifrost is enabled
	if h.bifrost == nil {
		http.Error(w, "Bifrost not enabled", http.StatusServiceUnavailable)
		return
	}

	// Set SSE headers
	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")
	w.Header().Set("X-Accel-Buffering", "no") // Disable nginx buffering

	flusher, ok := w.(http.Flusher)
	if !ok {
		http.Error(w, "Streaming not supported", http.StatusInternalServerError)
		return
	}

	// Generate client ID
	clientID := generateID()

	// Register this connection with Bifrost
	h.bifrost.RegisterClient(clientID, w, flusher)
	defer h.bifrost.UnregisterClient(clientID)

	// Send initial connection message
	connMsg := BifrostMessage{
		Type:      "connected",
		Timestamp: time.Now().Unix(),
		Content:   "Connected to Bifrost",
		Data: map[string]interface{}{
			"client_id": clientID,
		},
	}
	data, _ := json.Marshal(connMsg)
	fmt.Fprintf(w, "data: %s\n\n", string(data))
	flusher.Flush()

	// Keep connection alive until client disconnects
	<-r.Context().Done()
}

// sendCancellationResponse sends a cancellation response to the client.
// This is called when a lifecycle hook cancels the request.
func (h *Handler) sendCancellationResponse(w http.ResponseWriter, requestID, phase, cancelledBy, reason string) {
	// Log the cancellation
	log.Printf("[Bifrost] Request %s cancelled in %s by %s: %s", requestID, phase, cancelledBy, reason)

	// Send notification via Bifrost if available
	if h.bifrost != nil {
		h.bifrost.SendNotification("warning", "Request Cancelled",
			fmt.Sprintf("Request cancelled by %s: %s", cancelledBy, reason))
	}

	// Build cancellation response (OpenAI-compatible format)
	resp := ChatResponse{
		ID:      requestID,
		Object:  "chat.completion",
		Model:   h.config.Model,
		Created: time.Now().Unix(),
		Choices: []ChatChoice{
			{
				Index: 0,
				Message: &ChatMessage{
					Role: "assistant",
					Content: fmt.Sprintf("⚠️ Request cancelled by plugin\n\n"+
						"**Phase:** %s\n"+
						"**Cancelled by:** %s\n"+
						"**Reason:** %s",
						phase, cancelledBy, reason),
				},
				FinishReason: "stop",
			},
		},
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resp)
}

// handleChatCompletions handles OpenAI-compatible chat completion requests via Bifrost.
// POST /api/bifrost/chat/completions
//
// Non-streaming returns JSON response.
// Streaming uses Server-Sent Events (SSE) - standard HTTP, no WebSocket needed.
//
// Request Lifecycle:
//  1. PrePrompt hook - plugins can modify prompt context
//  2. Build prompt with immutable ActionPrompt first
//  3. Send to Heimdall SLM
//  4. PreExecute hook - plugins can validate/modify before action runs
//  5. Execute action
//  6. PostExecute hook - plugins can log/update state
func (h *Handler) handleChatCompletions(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req ChatRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Default model if not specified (BYOM: only one model loaded)
	if req.Model == "" {
		req.Model = h.config.Model
	}

	// Extract user message for lifecycle context
	userMessage := ""
	for i := len(req.Messages) - 1; i >= 0; i-- {
		if req.Messages[i].Role == "user" {
			userMessage = req.Messages[i].Content
			break
		}
	}

	// Create PromptContext with immutable ActionPrompt
	requestID := generateID()
	promptCtx := &PromptContext{
		RequestID:    requestID,
		RequestTime:  time.Now(),
		ActionPrompt: ActionPrompt(), // IMMUTABLE - always first
		UserMessage:  userMessage,
		Messages:     req.Messages,
		Examples:     defaultExamples(),
		PluginData:   make(map[string]interface{}),
	}
	// Set Bifrost for notifications (fire-and-forget SSE messages)
	promptCtx.SetBifrost(h.bifrost)

	// === Phase 1: PrePrompt hooks (optional) ===
	// Plugins that implement PrePromptHook can modify the prompt context
	// Plugins can call promptCtx.Cancel() to abort the request
	CallPrePromptHooks(promptCtx)
	if promptCtx.Cancelled() {
		log.Printf("[Bifrost] Request cancelled by %s: %s", promptCtx.CancelledBy(), promptCtx.CancelReason())
		h.sendCancellationResponse(w, promptCtx.RequestID, "PrePrompt", promptCtx.CancelledBy(), promptCtx.CancelReason())
		return
	}

	// === Phase 2: Build final prompt ===
	// ActionPrompt is always at the start (immutable)
	systemContent := promptCtx.BuildFinalPrompt()
	systemMsg := ChatMessage{Role: "system", Content: systemContent}

	// Validate token budget before proceeding
	if err := promptCtx.ValidateTokenBudget(); err != nil {
		budgetInfo := promptCtx.GetBudgetInfo()
		log.Printf("[Bifrost] Token budget exceeded: %v (system: %d, user: %d, total: %d)",
			err, budgetInfo.SystemTokens, budgetInfo.UserTokens, budgetInfo.TotalTokens)
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	// Build messages: system + user message
	messages := []ChatMessage{systemMsg}
	for _, msg := range promptCtx.Messages {
		if msg.Role != "system" { // Skip original system messages
			messages = append(messages, msg)
		}
	}

	prompt := BuildPrompt(messages)

	// Generation params
	params := GenerateParams{
		MaxTokens:   req.MaxTokens,
		Temperature: req.Temperature,
		TopP:        req.TopP,
		TopK:        40,
		StopTokens:  []string{"<|im_end|>", "<|endoftext|>", "</s>"},
	}
	if params.MaxTokens == 0 {
		params.MaxTokens = h.config.MaxTokens
	}
	if params.Temperature == 0 {
		params.Temperature = h.config.Temperature
	}

	ctx, cancel := context.WithTimeout(r.Context(), 60*time.Second)
	defer cancel()

	// Store PromptContext in request context for later phases
	lifecycleCtx := &requestLifecycle{
		promptCtx: promptCtx,
		requestID: requestID,
		database:  h.database,
		metrics:   h.metrics,
	}

	if req.Stream {
		h.handleStreamingResponse(w, ctx, prompt, params, req.Model, lifecycleCtx)
	} else {
		h.handleNonStreamingResponse(w, ctx, prompt, params, req.Model, lifecycleCtx)
	}
}

// requestLifecycle holds state through the request lifecycle for hooks.
type requestLifecycle struct {
	promptCtx *PromptContext
	requestID string
	database  DatabaseReader
	metrics   MetricsReader
}

// defaultExamples returns built-in examples for action mapping.
// These help Heimdall understand common user intents and map them to actions.
func defaultExamples() []PromptExample {
	return []PromptExample{
		// === STATUS & METRICS ===
		{UserSays: "status", ActionJSON: `{"action": "heimdall.watcher.status", "params": {}}`},
		{UserSays: "what is the status", ActionJSON: `{"action": "heimdall.watcher.status", "params": {}}`},
		{UserSays: "show me metrics", ActionJSON: `{"action": "heimdall.watcher.metrics", "params": {}}`},
		{UserSays: "database stats", ActionJSON: `{"action": "heimdall.watcher.db_stats", "params": {}}`},
		{UserSays: "health check", ActionJSON: `{"action": "heimdall.watcher.status", "params": {}}`},

		// === COUNTING & STATISTICS ===
		{UserSays: "how many nodes", ActionJSON: `{"action": "heimdall.watcher.query", "params": {"cypher": "MATCH (n) RETURN count(n) AS total_nodes"}}`},
		{UserSays: "count all relationships", ActionJSON: `{"action": "heimdall.watcher.query", "params": {"cypher": "MATCH ()-[r]->() RETURN count(r) AS total_relationships"}}`},
		{UserSays: "what labels exist", ActionJSON: `{"action": "heimdall.watcher.query", "params": {"cypher": "CALL db.labels() YIELD label RETURN label"}}`},
		{UserSays: "show relationship types", ActionJSON: `{"action": "heimdall.watcher.query", "params": {"cypher": "CALL db.relationshipTypes() YIELD relationshipType RETURN relationshipType"}}`},

		// === SAMPLING & EXPLORATION ===
		{UserSays: "show me some nodes", ActionJSON: `{"action": "heimdall.watcher.query", "params": {"cypher": "MATCH (n) RETURN n LIMIT 10"}}`},
		{UserSays: "sample Person nodes", ActionJSON: `{"action": "heimdall.watcher.query", "params": {"cypher": "MATCH (n:Person) RETURN n LIMIT 5"}}`},
		{UserSays: "show relationships", ActionJSON: `{"action": "heimdall.watcher.query", "params": {"cypher": "MATCH (a)-[r]->(b) RETURN a, type(r), b LIMIT 10"}}`},

		// === SEARCHING ===
		{UserSays: "find nodes with name Alice", ActionJSON: `{"action": "heimdall.watcher.query", "params": {"cypher": "MATCH (n {name: 'Alice'}) RETURN n"}}`},
		{UserSays: "search for nodes containing test", ActionJSON: `{"action": "heimdall.watcher.query", "params": {"cypher": "MATCH (n) WHERE n.name CONTAINS 'test' RETURN n LIMIT 20"}}`},

		// === AGGREGATIONS ===
		{UserSays: "nodes per label", ActionJSON: `{"action": "heimdall.watcher.query", "params": {"cypher": "MATCH (n) RETURN labels(n) AS label, count(n) AS count ORDER BY count DESC"}}`},
		{UserSays: "relationship distribution", ActionJSON: `{"action": "heimdall.watcher.query", "params": {"cypher": "MATCH ()-[r]->() RETURN type(r) AS type, count(r) AS count ORDER BY count DESC"}}`},

		// === GRAPH ANALYSIS ===
		{UserSays: "find highly connected nodes", ActionJSON: `{"action": "heimdall.watcher.query", "params": {"cypher": "MATCH (n)-[r]-() RETURN n, count(r) AS connections ORDER BY connections DESC LIMIT 10"}}`},
		{UserSays: "orphan nodes", ActionJSON: `{"action": "heimdall.watcher.query", "params": {"cypher": "MATCH (n) WHERE NOT (n)--() RETURN n LIMIT 20"}}`},
	}
}

// handleNonStreamingResponse generates complete response with lifecycle hooks.
func (h *Handler) handleNonStreamingResponse(w http.ResponseWriter, ctx context.Context, prompt string, params GenerateParams, model string, lifecycle *requestLifecycle) {
	response, err := h.manager.Generate(ctx, prompt, params)
	if err != nil {
		http.Error(w, fmt.Sprintf("Generation error: %v", err), http.StatusInternalServerError)
		return
	}

	// Try to parse action command from response
	log.Printf("[Bifrost] SLM response: %s", response)
	finalResponse := response
	if parsedAction := h.tryParseAction(response); parsedAction != nil {
		log.Printf("[Bifrost] Action detected: %s with params: %v", parsedAction.Action, parsedAction.Params)

		// === Phase 4: PreExecute hooks ===
		preExecCtx := &PreExecuteContext{
			RequestID:   lifecycle.requestID,
			RequestTime: lifecycle.promptCtx.RequestTime,
			Action:      parsedAction.Action,
			Params:      parsedAction.Params,
			RawResponse: response,
			PluginData:  lifecycle.promptCtx.PluginData,
			Database:    lifecycle.database,
			Metrics:     lifecycle.metrics,
		}
		// Set Bifrost for notifications (fire-and-forget SSE messages)
		preExecCtx.SetBifrost(h.bifrost)

		// === Phase 4: PreExecute hooks (optional) ===
		// Plugins that implement PreExecuteHook can validate/modify params
		preExecResult := CallPreExecuteHooks(preExecCtx)
		if preExecCtx.Cancelled() {
			log.Printf("[Bifrost] Request cancelled by %s: %s", preExecCtx.CancelledBy(), preExecCtx.CancelReason())
			h.sendCancellationResponse(w, lifecycle.requestID, "PreExecute", preExecCtx.CancelledBy(), preExecCtx.CancelReason())
			return
		}

		if !preExecResult.Continue {
			finalResponse = preExecResult.AbortMessage
			if finalResponse == "" {
				finalResponse = "Action aborted by plugin"
			}
		} else {
			// === Phase 5: Execute action ===
			startTime := time.Now()
			actCtx := ActionContext{
				Context:     ctx,
				UserMessage: prompt,
				Params:      parsedAction.Params,
				Bifrost:     h.bifrost,
				Database:    h.database,
				Metrics:     h.metrics,
			}
			result, err := ExecuteAction(parsedAction.Action, actCtx)
			execDuration := time.Since(startTime)

			if err != nil {
				log.Printf("[Bifrost] Action execution failed: %v", err)
				finalResponse = fmt.Sprintf("Action failed: %v", err)
			} else if result != nil {
				log.Printf("[Bifrost] Action result: success=%v message=%s", result.Success, result.Message)
				// Format action result as response
				if result.Success {
					finalResponse = result.Message
					if result.Data != nil && len(result.Data) > 0 {
						dataJSON, _ := json.MarshalIndent(result.Data, "", "  ")
						finalResponse += "\n\n```json\n" + string(dataJSON) + "\n```"
					}
				} else {
					finalResponse = "Action failed: " + result.Message
				}
			}

			// === Phase 6: PostExecute hooks ===
			// Uses optional interface - plugins that don't implement PostExecuteHook are skipped
			postExecCtx := &PostExecuteContext{
				RequestID:  lifecycle.requestID,
				Action:     parsedAction.Action,
				Params:     parsedAction.Params,
				Result:     result,
				Duration:   execDuration,
				PluginData: lifecycle.promptCtx.PluginData,
			}
			CallPostExecuteHooks(postExecCtx)
		}
	} else {
		log.Printf("[Bifrost] No action detected in response")
	}

	resp := ChatResponse{
		ID:      lifecycle.requestID,
		Object:  "chat.completion", // OpenAI API compatible
		Model:   model,
		Created: time.Now().Unix(),
		Choices: []ChatChoice{
			{
				Index: 0,
				Message: &ChatMessage{
					Role:    "assistant",
					Content: finalResponse,
				},
				FinishReason: "stop",
			},
		},
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resp)
}

// tryParseAction parses action JSON from SLM response.
// Format: {"action": "heimdall.watcher.status", "params": {}}
func (h *Handler) tryParseAction(response string) *ParsedAction {
	response = strings.TrimSpace(response)

	// Find JSON in response
	start := strings.Index(response, "{")
	if start == -1 {
		log.Printf("[Bifrost] tryParseAction: no JSON start found")
		return nil
	}
	end := strings.LastIndex(response, "}")
	if end == -1 || end <= start {
		log.Printf("[Bifrost] tryParseAction: no JSON end found")
		return nil
	}

	jsonStr := response[start : end+1]
	log.Printf("[Bifrost] tryParseAction: parsing JSON: %s", jsonStr)

	var parsed ParsedAction
	if err := json.Unmarshal([]byte(jsonStr), &parsed); err != nil {
		log.Printf("[Bifrost] tryParseAction: JSON parse error: %v", err)
		return nil
	}

	if parsed.Action == "" {
		log.Printf("[Bifrost] tryParseAction: no action field")
		return nil
	}

	log.Printf("[Bifrost] tryParseAction: looking up action: %s", parsed.Action)
	actions := ListHeimdallActions()
	log.Printf("[Bifrost] tryParseAction: registered actions: %v", actions)

	if _, ok := GetHeimdallAction(parsed.Action); !ok {
		log.Printf("[Bifrost] tryParseAction: action NOT FOUND: %s", parsed.Action)
		return nil
	}

	log.Printf("[Bifrost] tryParseAction: action FOUND: %s", parsed.Action)
	return &parsed
}

// handleStreamingResponse uses Server-Sent Events (SSE) for streaming with lifecycle hooks.
// SSE is standard HTTP - works with any HTTP client, no WebSocket needed.
// After streaming completes, checks for action commands and executes them.
func (h *Handler) handleStreamingResponse(w http.ResponseWriter, ctx context.Context, prompt string, params GenerateParams, model string, lifecycle *requestLifecycle) {
	// Set SSE headers
	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")
	w.Header().Set("X-Accel-Buffering", "no") // Disable nginx buffering

	flusher, ok := w.(http.Flusher)
	if !ok {
		http.Error(w, "Streaming not supported", http.StatusInternalServerError)
		return
	}

	id := lifecycle.requestID

	// === Send queued notifications from PrePrompt hooks inline ===
	// This ensures proper ordering - notifications appear before the AI response
	notifications := lifecycle.promptCtx.DrainNotifications()
	for _, notif := range notifications {
		icon := "ℹ️"
		switch notif.Type {
		case "error":
			icon = "❌"
		case "warning":
			icon = "⚠️"
		case "success":
			icon = "✅"
		case "progress":
			icon = "🔄"
		}

		notifChunk := ChatResponse{
			ID:      id,
			Object:  "chat.completion.chunk",
			Model:   model,
			Created: time.Now().Unix(),
			Choices: []ChatChoice{
				{
					Index: 0,
					Delta: &ChatMessage{
						Role:    "heimdall",
						Content: fmt.Sprintf("[Heimdall]: %s %s: %s\n", icon, notif.Title, notif.Message),
					},
				},
			},
		}
		data, _ := json.Marshal(notifChunk)
		fmt.Fprintf(w, "data: %s\n\n", data)
		flusher.Flush()
	}

	// Collect full response to check for actions
	var fullResponse strings.Builder

	// Stream tokens
	err := h.manager.GenerateStream(ctx, prompt, params, func(token string) error {
		fullResponse.WriteString(token)

		chunk := ChatResponse{
			ID:      id,
			Object:  "chat.completion.chunk", // OpenAI API streaming format
			Model:   model,
			Created: time.Now().Unix(),
			Choices: []ChatChoice{
				{
					Index: 0,
					Delta: &ChatMessage{
						Content: token,
					},
				},
			},
		}

		data, _ := json.Marshal(chunk)
		fmt.Fprintf(w, "data: %s\n\n", data)
		flusher.Flush()
		return nil
	})

	if err != nil {
		// Send error event
		fmt.Fprintf(w, "data: {\"error\": \"%s\"}\n\n", err.Error())
		flusher.Flush()
		return
	}

	// Check if response contains an action command
	response := fullResponse.String()
	log.Printf("[Bifrost] Streaming complete, checking for action: %s", response)

	if parsedAction := h.tryParseAction(response); parsedAction != nil {
		log.Printf("[Bifrost] Action detected in stream: %s", parsedAction.Action)

		// === Phase 4: PreExecute hooks ===
		preExecCtx := &PreExecuteContext{
			RequestID:   lifecycle.requestID,
			RequestTime: lifecycle.promptCtx.RequestTime,
			Action:      parsedAction.Action,
			Params:      parsedAction.Params,
			RawResponse: response,
			PluginData:  lifecycle.promptCtx.PluginData,
			Database:    lifecycle.database,
			Metrics:     lifecycle.metrics,
		}
		// Set Bifrost for notifications (fire-and-forget SSE messages)
		preExecCtx.SetBifrost(h.bifrost)

		// === PreExecute hooks (optional) ===
		// Plugins that implement PreExecuteHook can validate/modify params
		preExecResult := CallPreExecuteHooks(preExecCtx)
		cancelled := preExecCtx.Cancelled()
		if cancelled {
			log.Printf("[Bifrost] Request cancelled by %s: %s", preExecCtx.CancelledBy(), preExecCtx.CancelReason())
			// Send cancellation as SSE chunk
			cancelChunk := ChatResponse{
				ID:      id,
				Object:  "chat.completion.chunk",
				Model:   model,
				Created: time.Now().Unix(),
				Choices: []ChatChoice{
					{
						Index: 0,
						Delta: &ChatMessage{
							Content: fmt.Sprintf("\n\n⚠️ Request cancelled by %s: %s",
								preExecCtx.CancelledBy(), preExecCtx.CancelReason()),
						},
					},
				},
			}
			data, _ := json.Marshal(cancelChunk)
			fmt.Fprintf(w, "data: %s\n\n", data)
			flusher.Flush()
		}

		if !cancelled {
			// === Send PreExecute notifications inline ===
			preExecNotifications := preExecCtx.DrainNotifications()
			for _, notif := range preExecNotifications {
				icon := "ℹ️"
				switch notif.Type {
				case "error":
					icon = "❌"
				case "warning":
					icon = "⚠️"
				case "success":
					icon = "✅"
				case "progress":
					icon = "🔄"
				}
				notifChunk := ChatResponse{
					ID:      id,
					Object:  "chat.completion.chunk",
					Model:   model,
					Created: time.Now().Unix(),
					Choices: []ChatChoice{
						{
							Index: 0,
							Delta: &ChatMessage{
								Role:    "heimdall",
								Content: fmt.Sprintf("[Heimdall]: %s %s: %s\n", icon, notif.Title, notif.Message),
							},
						},
					},
				}
				data, _ := json.Marshal(notifChunk)
				fmt.Fprintf(w, "data: %s\n\n", data)
				flusher.Flush()
			}

			var actionResponse string
			var result *ActionResult
			var execDuration time.Duration

			if !preExecResult.Continue {
				actionResponse = preExecResult.AbortMessage
				if actionResponse == "" {
					actionResponse = "Action aborted by plugin"
				}
			} else {
				// === Phase 5: Execute action ===
				startTime := time.Now()
				actCtx := ActionContext{
					Context:     ctx,
					UserMessage: prompt,
					Params:      parsedAction.Params,
					Bifrost:     h.bifrost,
					Database:    h.database,
					Metrics:     h.metrics,
				}

				var err error
				result, err = ExecuteAction(parsedAction.Action, actCtx)
				execDuration = time.Since(startTime)

				if err != nil {
					log.Printf("[Bifrost] Action execution failed: %v", err)
					actionResponse = fmt.Sprintf("Action failed: %v", err)
				} else if result != nil {
					log.Printf("[Bifrost] Action result: success=%v", result.Success)

					if result.Success {
						actionResponse = "\n\n" + result.Message
						if result.Data != nil && len(result.Data) > 0 {
							dataJSON, _ := json.MarshalIndent(result.Data, "", "  ")
							actionResponse += "\n\n```json\n" + string(dataJSON) + "\n```"
						}
					} else {
						actionResponse = "\n\nAction failed: " + result.Message
					}
				}

				// === Phase 6: PostExecute hooks (optional) ===
				// Plugins that implement PostExecuteHook get notified
				postExecCtx := &PostExecuteContext{
					RequestID:  lifecycle.requestID,
					Action:     parsedAction.Action,
					Params:     parsedAction.Params,
					Result:     result,
					Duration:   execDuration,
					PluginData: lifecycle.promptCtx.PluginData,
				}
				CallPostExecuteHooks(postExecCtx)

				// === Send PostExecute notifications inline ===
				postExecNotifications := postExecCtx.DrainNotifications()
				for _, notif := range postExecNotifications {
					icon := "ℹ️"
					switch notif.Type {
					case "error":
						icon = "❌"
					case "warning":
						icon = "⚠️"
					case "success":
						icon = "✅"
					case "progress":
						icon = "🔄"
					}
					notifChunk := ChatResponse{
						ID:      id,
						Object:  "chat.completion.chunk",
						Model:   model,
						Created: time.Now().Unix(),
						Choices: []ChatChoice{
							{
								Index: 0,
								Delta: &ChatMessage{
									Role:    "heimdall",
									Content: fmt.Sprintf("[Heimdall]: %s %s: %s\n", icon, notif.Title, notif.Message),
								},
							},
						},
					}
					data, _ := json.Marshal(notifChunk)
					fmt.Fprintf(w, "data: %s\n\n", data)
					flusher.Flush()
				}
			}

			// Send action result chunk
			resultChunk := ChatResponse{
				ID:      id,
				Object:  "chat.completion.chunk",
				Model:   model,
				Created: time.Now().Unix(),
				Choices: []ChatChoice{
					{
						Index: 0,
						Delta: &ChatMessage{
							Content: actionResponse,
						},
					},
				},
			}
			data, _ := json.Marshal(resultChunk)
			fmt.Fprintf(w, "data: %s\n\n", data)
			flusher.Flush()
		}
	}

	// Send final chunk with finish_reason (OpenAI format)
	doneChunk := ChatResponse{
		ID:      id,
		Object:  "chat.completion.chunk", // OpenAI API streaming format
		Model:   model,
		Created: time.Now().Unix(),
		Choices: []ChatChoice{
			{
				Index:        0,
				Delta:        &ChatMessage{},
				FinishReason: "stop",
			},
		},
	}
	data, _ := json.Marshal(doneChunk)
	fmt.Fprintf(w, "data: %s\n\n", data)
	// OpenAI sends [DONE] to signal stream end
	fmt.Fprintf(w, "data: [DONE]\n\n")
	flusher.Flush()
}

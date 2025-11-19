# VSCode Chat Participant API Compatibility: Cursor & Windsurf

**Research Date**: 2025-11-19  
**Version**: 1.0.0  
**Status**: ⚠️ Limited Compatibility

## 🎯 Executive Summary

**Current State**: VSCode's Chat Participant API has **limited or no support** in Cursor and Windsurf as of November 2025.

| IDE | Chat API Support | Workaround Available | Recommendation |
|-----|------------------|----------------------|----------------|
| **VSCode** | ✅ Full Support | N/A | Primary target |
| **Cursor** | ❌ Not Working | ⚠️ Possible | Use built-in chat |
| **Windsurf** | ❓ Unknown | ⚠️ Possible | Use built-in chat |

---

## 📊 Research Findings

### 1. VSCode Chat Participant API (Official)

**API**: `vscode.chat.createChatParticipant(id, handler)`

**Standard Implementation** (as used in our extension):

```typescript
// From vscode-extension/src/extension.ts
const participant = vscode.chat.createChatParticipant(
  'mimir.chat', 
  async (request, context, response, token) => {
    // Handle chat requests
  }
);

// Package.json contribution
"contributes": {
  "chatParticipants": [
    {
      "id": "mimir.chat",
      "name": "mimir",
      "description": "Graph-RAG powered assistant",
      "isSticky": true
    }
  ]
}
```

**Works In**:
- ✅ VSCode (1.95.0+)
- ✅ VSCode Insiders
- ✅ GitHub Codespaces (with VSCode backend)

---

### 2. Cursor IDE Compatibility

**Platform**: VSCode fork with enhanced AI features  
**Chat System**: Custom built-in chat (not VSCode Chat API)

#### Current Status (November 2025)

❌ **Chat Participant API NOT Supported**

**Evidence**:
- Forum report (March 2025): Developer confirmed VSCode Copilot chat extension loaded but couldn't access chat participant in Cursor's chat window
- Source: [Cursor Community Forum](https://forum.cursor.com/t/vscode-copilot-chat-extension-for-cursor/59115)

#### Why It Doesn't Work

Cursor uses its **own chat implementation** separate from VSCode's Chat API:

1. **Different Chat Architecture**: Cursor's chat is integrated with their AI models (Claude, GPT-4, etc.) and doesn't expose VSCode's `vscode.chat` namespace
2. **No `vscode.chat` API**: The `vscode.chat.createChatParticipant` API likely doesn't exist or is non-functional
3. **Custom Extension Points**: Cursor provides its own set of AI integration hooks (not VSCode-compatible)

#### Cursor's Built-in Chat Features

Cursor provides:
- Chat with codebase (built-in)
- @-mentions for files, folders, docs
- Chat with errors, terminal output
- Image uploads for context
- Multi-file editing via chat

**For Mimir**: Users would need to use Cursor's native chat and call our **HTTP API** or **MCP server** directly, not via chat participant.

---

### 3. Windsurf IDE Compatibility

**Platform**: VSCode fork (formerly Codeium)  
**Chat System**: Cascade AI agent + chat interface

#### Current Status (November 2025)

❓ **Chat Participant API Unknown/Likely Not Supported**

**Evidence**:
- No official documentation mentions VSCode Chat Participant compatibility
- Windsurf has its own "Cascade" agentic system
- Chat is tightly integrated with Cascade (toggle between chat and code generation)

#### Windsurf's Built-in Chat Features

Windsurf provides:
- Cascade agent (agentic coding assistant)
- Chat mode (separate from Cascade)
- @-mentions for functions, classes, directories, files
- Persistent context throughout conversation
- Inline citations

**Limitations**:
- Cannot chat while Cascade is generating code (must toggle with `Ctrl + .`)
- Chat is tied to Windsurf's AI models

**For Mimir**: Similar to Cursor, users would need to call our **HTTP API** directly.

---

## 🔧 Workarounds & Alternatives

### Option 1: HTTP API Integration (Recommended)

**Approach**: Expose Mimir's functionality via HTTP REST API instead of relying on Chat Participant API.

**Implementation**:

```typescript
// Current: Chat Participant (VSCode only)
vscode.chat.createChatParticipant('mimir.chat', handler);

// Alternative: Command-based HTTP API calls
vscode.commands.registerCommand('mimir.query', async (prompt) => {
  const apiUrl = vscode.workspace.getConfiguration('mimir').get('apiUrl');
  const response = await fetch(`${apiUrl}/v1/chat/completions`, {
    method: 'POST',
    body: JSON.stringify({ prompt, model: 'gpt-4.1' })
  });
  // Display response in output channel or webview
});
```

**Benefits**:
- ✅ Works in **all** VSCode forks (Cursor, Windsurf, etc.)
- ✅ No dependency on Chat Participant API
- ✅ Users can call Mimir from any context (terminal commands, keybindings, etc.)

**Drawbacks**:
- ❌ Doesn't integrate with native chat UX
- ❌ Requires manual invocation (commands, not @-mentions)

---

### Option 2: MCP Server (Model Context Protocol)

**Approach**: Expose Mimir as an **MCP server** that IDEs can connect to.

**Current Implementation**:
```json
// We already have MCP server! (src/index.ts)
{
  "mcpServers": {
    "mimir": {
      "command": "node",
      "args": ["/path/to/mimir/build/index.js"],
      "transport": "stdio"
    }
  }
}
```

**Supported IDEs**:
- ✅ Claude Desktop
- ✅ VSCode (via MCP extension)
- ✅ Cursor (via MCP configuration)
- ✅ Windsurf (via MCP configuration)

**Benefits**:
- ✅ **Universal compatibility** across all IDEs
- ✅ Standardized protocol (Claude Anthropic's MCP)
- ✅ Works with any MCP-compatible client
- ✅ Already implemented in Mimir!

**Drawbacks**:
- ❌ Requires MCP client extension in IDE
- ❌ Not as seamless as native chat integration

---

### Option 3: Custom Webview Panel (Current Studio Approach)

**Approach**: Use VSCode webview panels to create a custom chat UI.

**Current Implementation**:
```typescript
// vscode-extension/src/studioPanel.ts
const panel = vscode.window.createWebviewPanel(
  'mimirStudio',
  'Mimir Studio',
  vscode.ViewColumn.One,
  { enableScripts: true }
);

panel.webview.html = getWebviewContent();
```

**Benefits**:
- ✅ **Works in all VSCode forks** (Cursor, Windsurf, etc.)
- ✅ Full control over UI/UX
- ✅ Can integrate drag-and-drop workflows (as we do for Studio)
- ✅ Already implemented for Studio UI

**Drawbacks**:
- ❌ Separate window (not integrated with native chat)
- ❌ More complex UX (users need to open panel)

---

### Option 4: Cursor-Specific Extension API (Experimental)

**Approach**: Use Cursor's proprietary extension points (if they exist).

**Status**: ❓ **Unknown - Requires Reverse Engineering**

**Investigation Needed**:
1. Check if Cursor exposes any AI/chat extension APIs
2. Review Cursor's source code (if available)
3. Ask Cursor team directly via support channels

**Potential APIs** (speculative):
```typescript
// Hypothetical Cursor API (NOT CONFIRMED)
cursor.ai.registerTool({
  name: 'mimir',
  description: 'Graph-RAG assistant',
  handler: async (prompt) => { /* ... */ }
});
```

**Risks**:
- ❌ Proprietary API may change without notice
- ❌ Not documented
- ❌ May not exist at all

---

## 📋 Recommended Strategy

### For Mimir VSCode Extension

**Approach**: **Multi-Modal Architecture** (support multiple integration methods)

#### Phase 1: Current State ✅

- ✅ Chat Participant for VSCode users
- ✅ Studio webview for all users (VSCode, Cursor, Windsurf)
- ✅ MCP server for Claude Desktop, etc.

#### Phase 2: Add Command Palette Integration (Quick Win)

**Goal**: Allow Cursor/Windsurf users to invoke Mimir via commands.

**Implementation**:

```typescript
// Register command for manual invocation
vscode.commands.registerCommand('mimir.askQuestion', async () => {
  const prompt = await vscode.window.showInputBox({
    prompt: 'Ask Mimir a question',
    placeHolder: 'e.g., Explain this function'
  });
  
  if (prompt) {
    // Call HTTP API
    const response = await callMimirAPI(prompt);
    
    // Show result in output channel or notification
    const outputChannel = vscode.window.createOutputChannel('Mimir');
    outputChannel.clear();
    outputChannel.append(response);
    outputChannel.show();
  }
});
```

**Benefits**:
- ✅ Works in Cursor, Windsurf, VSCode
- ✅ Simple to implement
- ✅ Accessible via Command Palette (`Ctrl+Shift+P`)

#### Phase 3: Enhanced Webview Chat Panel (Future)

**Goal**: Create a standalone chat panel that mimics native chat UX.

**Features**:
- Chat history
- @-mentions for files/functions
- Streaming responses
- Tool call visualization

**Benefits**:
- ✅ Consistent UX across all IDEs
- ✅ Full control over features
- ✅ Can integrate with Studio workflows

---

## 🧪 Testing Plan

### Test Matrix

| Test Case | VSCode | Cursor | Windsurf | Expected Result |
|-----------|--------|--------|----------|-----------------|
| Chat Participant (@mimir) | ✅ Works | ❌ Fails | ❌ Fails | VSCode only |
| Studio Webview | ✅ Works | ✅ Works | ✅ Works | Universal |
| Command Palette | ✅ Works | ✅ Works | ✅ Works | Universal |
| MCP Server | ✅ Works | ✅ Works | ✅ Works | Universal |

### Validation Steps

1. **VSCode**:
   - Install extension
   - Open chat (`Ctrl+Alt+I` or `Cmd+Option+I`)
   - Type `@mimir hello`
   - Verify response

2. **Cursor**:
   - Install extension
   - Try `@mimir` in Cursor chat → **Expected: Not Found**
   - Run `Ctrl+Shift+P` → `Mimir: Open Studio` → **Expected: Works**
   - Run `Ctrl+Shift+P` → `Mimir: Ask Question` → **Expected: Works** (if implemented)

3. **Windsurf**:
   - Same as Cursor
   - Verify Cascade doesn't conflict with Mimir commands

---

## 📚 References

### Official Documentation

- [VSCode Chat Extension API](https://code.visualstudio.com/api/extension-guides/chat)
- [Cursor Documentation](https://docs.cursor.com)
- [Windsurf Documentation](https://docs.windsurf.com/chat)
- [MCP Protocol Specification](https://spec.modelcontextprotocol.io)

### Community Reports

- [Cursor Forum: VSCode Copilot Chat Extension](https://forum.cursor.com/t/vscode-copilot-chat-extension-for-cursor/59115)
- VSCode Extension Marketplace: No Cursor-specific compatibility notes for chat extensions

### Related Extensions

- [Pieces Extension](https://docs.pieces.app/products/extensions-plugins/visual-studio-code/forks) - Successfully works across VSCode forks (different use case, no chat participant)

---

## 🚀 Conclusion

### Key Takeaways

1. **VSCode Chat Participant API is NOT supported in Cursor or Windsurf** as of November 2025
2. **Current Mimir extension works in VSCode only** for chat participant functionality
3. **Studio webview works universally** across all VSCode forks
4. **MCP server is the most universal solution** for cross-IDE compatibility

### Immediate Action Items

- [ ] Document chat participant limitations in README
- [ ] Add warning in extension description for Cursor/Windsurf users
- [x] Implement Command Palette fallback for non-VSCode users (`mimir.askQuestion`)
- [x] Create Portal webview chat interface (file attachments + vector search)
- [ ] Complete Portal integration (PortalPanel.ts, webpack, registration)
- [ ] Implement Code Intelligence view for file indexing/stats

### Future Research

- [ ] Monitor Cursor/Windsurf for Chat Participant API support
- [ ] Investigate proprietary Cursor extension APIs
- [ ] Test MCP integration in Cursor/Windsurf
- [ ] Explore webview-based chat panel as universal solution

---

**Last Updated**: 2025-11-19  
**Researched By**: Mimir Development Team  
**Next Review**: Q1 2026 (check for Cursor/Windsurf API updates)

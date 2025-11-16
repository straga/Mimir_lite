# Mimir Portal UI User Guide

## Table of Contents
1. [Overview](#overview)
2. [Getting Started](#getting-started)
3. [Chat Interface](#chat-interface)
4. [Model Selection](#model-selection)
5. [Chatmode & Preambles](#chatmode--preambles)
6. [File Attachments](#file-attachments)
7. [Memory Management](#memory-management)
8. [Advanced Features](#advanced-features)
9. [Keyboard Shortcuts](#keyboard-shortcuts)
10. [Troubleshooting](#troubleshooting)

---

## Overview

The Mimir Portal is your gateway to AI-powered knowledge retrieval and conversation. It provides a sophisticated chat interface with Graph-RAG (Retrieval-Augmented Generation) capabilities, allowing you to interact with AI models while leveraging your organization's knowledge base.

**Key Features:**
- 🤖 **Dynamic Model Selection** - Choose from available OpenAI-compatible models
- 🎭 **Customizable Chatmodes** - Switch between specialized agent behaviors
- 📎 **File Attachments** - Upload images, PDFs, and documents
- 🧠 **Memory Persistence** - Save conversations for semantic recall
- 🔍 **Semantic Search** - Automatic context retrieval from indexed knowledge
- ⚡ **Streaming Responses** - Real-time AI response generation

---

## Getting Started

### Initial Landing Screen

When you first open the Mimir Portal, you'll see the landing screen with the Eye of Mimir.

<img width="911" height="493" alt="image" src="https://github.com/user-attachments/assets/bd3e8a75-ca07-4cda-8457-d432ab9704d7" />

**Elements:**
- **Eye of Mimir Icon** - Centered with golden glow effect
- **Greeting Text** - "How may I give counsel?" with subtitle
- **Input Box** - Large, centered text area for your first message
- **Header Controls** - Model selector, chatmode selector, and Studio button

### First Message

Simply type your question or request in the input box and press Enter (or click the Send button).

<img width="1015" height="515" alt="image" src="https://github.com/user-attachments/assets/f52c064e-280e-4551-b32c-ddcd6bdee327" />

---

## Chat Interface

### Message Display

Messages are displayed in a conversational format with distinct styling for user and assistant messages.

<img width="1346" height="1320" alt="image" src="https://github.com/user-attachments/assets/a3e643dc-d51f-4b47-8b19-ca289d5dff9e" />

**Message Components:**
- **User Messages** (Blue background)
  - Aligned to the right
  - Blue avatar with user icon
  - Timestamp below message
  
- **Assistant Messages** (Dark gray background)
  - Aligned to the left
  - Gold avatar with sparkles icon
  - Supports markdown formatting (bold, code blocks, lists)
  - Real-time streaming display

### Streaming Responses

Watch as AI responses appear word-by-word in real-time.


**Streaming Indicators:**
- Gold border pulse animation around input box
- Animated bouncing dots in new message
- "Processing..." status in UI

### Markdown Support

Assistant responses support rich markdown formatting for better readability.

<img width="1294" height="1296" alt="image" src="https://github.com/user-attachments/assets/a9d1bc79-d1f2-44b1-a188-d4beeb6722c5" />

**Supported Markdown:**
- **Headers** (`#`, `##`, `###`)
- **Bold** (`**text**`) and _Italic_ (`*text*`)
- **Code blocks** with syntax highlighting
- **Inline code** (`\`code\``)
- **Lists** (ordered and unordered)
- **Links** and **blockquotes**
- **Tables** (via GitHub Flavored Markdown)

---

## Model Selection

### Available Models Dropdown

The model selector dynamically loads available models from your configured API endpoint.

<img width="642" height="695" alt="image" src="https://github.com/user-attachments/assets/bb3993f0-f903-4c23-8664-26a7a2396091" />

**Features:**
- Automatically fetches models from `/v1/models` endpoint
- Shows "Loading..." while fetching
- Falls back to default if API unavailable

### Setting Default Model

Save your preferred model for future sessions.

**Steps:**
1. Select your preferred model from dropdown
2. Click "Save as Default" text below the dropdown
3. Text changes to "✓ Default Model" (in gold)
4. Model will auto-select on next visit

**Persistence:**
- Saved to browser localStorage (`mimir-default-model` key)
- Survives page refreshes and browser restarts
- Per-device setting (not synced across devices)

---

## Chatmode & Preambles

### Predefined Chatmodes

Choose from 17+ specialized agent behaviors for different tasks.

<img width="735" height="781" alt="image" src="https://github.com/user-attachments/assets/07fac2cf-cabd-4c5a-bbb0-42b65068e559" />

**Popular Chatmodes:**
- **Mimir V2** - Default comprehensive assistant with memory
- **Debug** - Technical troubleshooting and debugging
- **Research** - Deep research with citations and sources
- **Mini** - Concise, minimal responses
- **Regex** - Regular expression expert
- **PM** - Project management and planning
- **QC** - Quality control and code review

### Custom Preamble

Create your own chatmode with custom instructions.

**Creating Custom Preamble:**

1. **Click Plus Button** - Opens custom preamble modal

<img width="1081" height="968" alt="image" src="https://github.com/user-attachments/assets/4d0b8e3c-0280-45fe-9e02-176cd370bdb5" />

2. **Enter Instructions** - Paste or type your system prompt

```markdown
Example Custom Preamble:

# SQL Database Expert

You are a specialized PostgreSQL database administrator with 10+ years of experience.

Your capabilities:
- Write optimized SQL queries
- Design normalized database schemas
- Troubleshoot performance issues
- Explain complex queries in simple terms

Always:
- Use PostgreSQL-specific syntax
- Include EXPLAIN ANALYZE for complex queries
- Consider index usage
- Provide both the solution and educational explanation
```

3. **Save & Use** - Stores to localStorage, activates immediately

**Custom Preamble Features:**
- Stored in localStorage (`mimir-custom-preamble` key)
- Appears as "Custom" option in chatmode dropdown (gold color)
- Sent as `system` role message in API calls
- Editable - Click Plus to open and modify
- Can be cleared via "Clear Saved" button in modal

### Preamble vs Custom System Prompt

**When chatmode is selected:**
- Backend loads corresponding preamble file
- RAG context injected automatically
- Preamble name sent in API request

**When Custom is selected:**
- Your custom text used as system prompt
- Sent directly in messages array
- Backend does NOT load file-based preamble
- RAG context still injected if available

---

## File Attachments

### Adding Files

Multiple ways to attach files to your messages.

**Three Methods:**

1. **Click Paperclip Icon**
   - Opens file browser dialog
   - Select one or multiple files
   - Supports: JPG, PNG, GIF, WebP, PDF, TXT
   - Max size: 10MB per file

2. **Drag & Drop**
   - Drag files from desktop/folder
   - Drop onto input area
   - Gold border appears when hovering
   - Batch upload supported

3. **Paste from Clipboard**
   - Copy image (Ctrl+C / Cmd+C)
   - Click in input box
   - Paste (Ctrl+V / Cmd+V)
   - Works with screenshots

### File Previews

Attached files appear as thumbnail previews above the input box.

![File Preview Thumbnails - Screenshot should show: 3-4 file attachments displayed as thumbnails above input box - mix of images and PDF icons, each with filename, X button visible on hover]

**Preview Features:**
- **Images** - Show thumbnail preview
- **PDFs/Text** - Show document icon + filename
- **Hover to Remove** - X button appears in top-right corner
- **Click to View** - Opens full size in new tab (images only)

### Sending with Attachments

Files are included with your message when you press Send.

![Message with Attachments - Screenshot should show: User message bubble containing text + 2 image thumbnails below text, both images clickable]

**Attachment Display in Messages:**
- Shown above message text
- Clickable for full-size view
- Retained in conversation history
- Not re-uploaded on page refresh (stored in memory only)

---

## Memory Management

### Saving Conversations to Memory

Persist important conversations for later semantic retrieval.

![Save Memory Button - Screenshot should show: Header bar with "Save Memory" button visible (only appears when messages exist), Memory rune icon visible, button highlighted]

**How to Save:**

1. Have an active conversation with messages
2. Click "Save Memory" button in header
3. Confirmation dialog appears with Memory ID

![Memory Saved Dialog - Screenshot should show: Browser alert dialog displaying "✅ Conversation saved to memory!" with Memory ID shown below, OK button]

**What Gets Saved:**
- All messages in current conversation (user + assistant)
- Message content and timestamps
- Conversation structure and flow
- Automatically indexed with embeddings

**Memory Retrieval:**
- Happens automatically via semantic search
- When you ask questions, similar past conversations are retrieved
- RAG system injects relevant context from saved memories
- No manual searching required - it's transparent

### Memory Search in Action

See how past memories inform current responses.

![Memory Context Injected - Screenshot should show: Console/developer tools showing "✅ Found 3 relevant documents" log message, semantic search happening, similarity scores visible]

**Behind the Scenes:**
1. You ask: "How do I fix the authentication bug?"
2. System searches memories with embeddings
3. Finds similar past conversation about auth
4. Injects context before AI responds
5. AI response includes insights from past solution

**Memory Storage:**
- Stored in Neo4j graph database
- Searchable by semantic meaning (not keywords)
- Permanent until manually deleted
- Accessible via semantic search tool

---

## Advanced Features

### New Chat Button

Start a fresh conversation without losing context.

![New Chat Button - Screenshot should show: "New Chat" button in header with rotating arrows icon, only visible when messages exist, button highlighted]

**When to Use:**
- Start unrelated conversation
- Clear cluttered discussion
- Reset context for new topic
- Testing different approaches

**What Happens:**
- All messages cleared from screen
- Attached files removed
- Input box cleared
- Returns to Eye of Mimir landing screen
- Previous conversation NOT saved (unless you saved to memory first)

### File Indexing Sidebar

Access file browsing and indexing controls (when available).

![File Indexing Sidebar - Screenshot should show: Left sidebar slid out, showing file tree or indexing controls, toggle button visible]

**Features:**
- Browse indexed files and folders
- Trigger re-indexing
- View indexing status
- Access file management tools

### Orchestration Studio

Link to advanced multi-agent orchestration features.

![Studio Button - Screenshot should show: "Studio" button in header with orchestration icon, button highlighted]

**Access:**
- Click "Studio" button in header
- Opens orchestration interface
- Create and manage agent workflows
- Advanced users only

---

## Keyboard Shortcuts

Efficient navigation and controls for power users.

| Shortcut | Action |
|----------|--------|
| `Enter` | Send message |
| `Shift + Enter` | New line in message |
| `Ctrl/Cmd + V` | Paste image from clipboard |
| `Escape` | Close modal dialogs |
| `Ctrl/Cmd + A` (in input) | Select all input text |

**File Input:**
- Click paperclip or drag files for attachment

**Modal Controls:**
- `Tab` - Navigate between buttons
- `Enter` - Activate focused button
- `Escape` - Cancel/close

---

## Troubleshooting

### Common Issues

#### "Loading..." in Model Selector

**Cause:** Cannot connect to `/v1/models` API endpoint

**Solutions:**
- Check server is running (port 9042)
- Verify network connectivity
- Check browser console for errors
- Fallback to default model will activate

#### Custom Preamble Not Appearing

**Cause:** Not saved to localStorage or browser storage cleared

**Solutions:**
- Re-create custom preamble via Plus button
- Check browser allows localStorage
- Verify not in incognito/private mode

#### File Upload Failed

**Cause:** File too large or unsupported type

**Solutions:**
- Check file size (max 10MB)
- Verify file type (images, PDF, TXT only)
- Try compressing image
- Convert file to supported format

#### Messages Not Streaming

**Cause:** Network issue or server not responding

**Solutions:**
- Check server logs for errors
- Verify streaming enabled in server config
- Refresh page and retry
- Check browser console for fetch errors

#### RAG Context Not Appearing

**Cause:** No indexed files or semantic search disabled

**Solutions:**
- Index files via File Indexing sidebar
- Verify Neo4j database running
- Check embeddings service available
- Ensure semantic search enabled in config

### Debug Mode

Enable chatmode "Debug" for detailed troubleshooting assistance:

![Debug Mode - Screenshot should show: Chatmode dropdown with "Debug" selected, assistant providing detailed technical response with error codes and stack traces]

**Debug Mode Features:**
- Verbose technical explanations
- Error code analysis
- Stack trace interpretation
- Diagnostic suggestions

### Browser Console

Check browser developer tools for detailed error messages.

![Browser Console - Screenshot should show: Chrome/Firefox DevTools console open, showing Mimir API logs, semantic search messages, and any error messages]

**Useful Console Messages:**
- `🔍 Performing semantic search...` - RAG search started
- `✅ Found X relevant documents` - Context retrieved
- `🤖 Calling Copilot API...` - Model request sent
- `❌ Chat completion error:` - Error details

**How to Open Console:**
- Chrome/Edge: `F12` or `Ctrl+Shift+I` (Windows) / `Cmd+Option+I` (Mac)
- Firefox: `F12` or `Ctrl+Shift+K` (Windows) / `Cmd+Option+K` (Mac)
- Safari: `Cmd+Option+C` (Mac, enable Developer menu first)

---

## Best Practices

### Effective Prompting

**DO:**
- ✅ Be specific and clear
- ✅ Provide context when needed
- ✅ Use appropriate chatmode for task
- ✅ Break complex requests into steps
- ✅ Save important conversations to memory

**DON'T:**
- ❌ Be vague or ambiguous
- ❌ Assume AI knows unstated context
- ❌ Mix unrelated topics in one chat
- ❌ Expect memory without saving explicitly

### Model Selection Strategy

- **Quick Questions:** Use faster/smaller models
- **Complex Analysis:** Use larger/more capable models
- **Specialized Tasks:** Switch chatmode first, then choose model
- **Consistency:** Save your preferred model as default

### Memory Management

**When to Save:**
- After solving complex problems
- When discovering important insights
- After detailed technical discussions
- When creating reference documentation

**When NOT to Save:**
- Casual/trivial conversations
- Temporary troubleshooting
- Test messages
- Duplicate information

### File Attachments Best Practices

- **Compress large images** before uploading
- **Use PDFs** for documents instead of images when possible
- **Name files descriptively** for easy reference
- **Remove attachments** when switching topics
- **Verify preview** before sending

---

## Getting Help

### Resources

- **Main Documentation:** [README.md](../README.md)
- **API Documentation:** [API Guide](./API_DOCUMENTATION.md)
- **Architecture:** [Architecture Overview](./architecture/)
- **Agent Configuration:** [AGENTS.md](./AGENTS.md)

### Support Channels

- **GitHub Issues:** Report bugs and feature requests
- **Discussions:** Ask questions and share tips
- **Wiki:** Community-contributed guides

### Contributing

Help improve this guide:
1. Take missing screenshots
2. Report unclear sections
3. Suggest additional topics
4. Submit pull requests with improvements

---

**Version:** 1.0.0  
**Last Updated:** November 16, 2025  
**Maintainer:** Mimir Development Team

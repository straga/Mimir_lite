import { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, User, Paperclip, X, Image as ImageIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { EyeOfMimir } from '../components/EyeOfMimir';
import { OrchestrationStudioIcon } from '../components/OrchestrationStudioIcon';
import { FileIndexingSidebar } from '../components/FileIndexingSidebar';
import { MemoryRuneIcon } from '../components/MemoryRuneIcon';
import { apiClient } from '../utils/api';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  attachments?: AttachedFile[];
}

interface AttachedFile {
  file: File;
  preview: string;
  id: string;
}

export function Portal() {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [savingMemory, setSavingMemory] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  const ALLOWED_FILE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf', 'text/plain'];

  // Set page title
  useEffect(() => {
    document.title = 'The Well of Mímir - Seek Ancient Wisdom';
  }, []);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [input]);

  // File handling functions
  const validateFile = (file: File): string | null => {
    if (file.size > MAX_FILE_SIZE) {
      return `File "${file.name}" is too large. Maximum size is 10MB.`;
    }
    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      return `File type "${file.type}" is not supported. Allowed types: images, PDF, text files.`;
    }
    return null;
  };

  const createFilePreview = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const addFiles = async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    const validFiles: AttachedFile[] = [];

    for (const file of fileArray) {
      const error = validateFile(file);
      if (error) {
        alert(error);
        continue;
      }

      try {
        const preview = await createFilePreview(file);
        validFiles.push({
          file,
          preview,
          id: `${Date.now()}-${Math.random()}`,
        });
      } catch (error) {
        console.error('Error creating preview:', error);
      }
    }

    if (validFiles.length > 0) {
      setAttachedFiles(prev => [...prev, ...validFiles]);
    }
  };

  const removeFile = (id: string) => {
    setAttachedFiles(prev => prev.filter(f => f.id !== id));
  };

  // Click to upload
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      addFiles(e.target.files);
      // Reset input so same file can be selected again
      e.target.value = '';
    }
  };

  // Drag and drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      addFiles(e.dataTransfer.files);
    }
  };

  // Clipboard paste
  const handleSaveAsMemory = async () => {
    if (messages.length === 0 || savingMemory) return;

    setSavingMemory(true);
    try {
      const result = await apiClient.saveConversationAsMemory(messages);
      console.log('✅ Conversation saved as memory:', result.memoryId);
      
      // Show success feedback (you could add a toast notification here)
      alert(`✅ Conversation saved to memory!\n\nMemory ID: ${result.memoryId}\n\nThis conversation can now be recalled through semantic search.`);
    } catch (error) {
      console.error('Failed to save conversation:', error);
      alert('❌ Failed to save conversation to memory. Please try again.');
    } finally {
      setSavingMemory(false);
    }
  };

  const handlePaste = async (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    const files: File[] = [];
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.kind === 'file') {
        const file = item.getAsFile();
        if (file) {
          files.push(file);
        }
      }
    }

    if (files.length > 0) {
      e.preventDefault(); // Prevent pasting file path as text
      await addFiles(files);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!input.trim() && attachedFiles.length === 0) || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim() || '[Attachment only]',
      timestamp: new Date(),
      attachments: attachedFiles.length > 0 ? [...attachedFiles] : undefined,
    };

    setMessages(prev => [...prev, userMessage]);
    const currentInput = input.trim();
    setInput('');
    setAttachedFiles([]);
    setIsLoading(true);

    try {
      // Call OpenAI-compatible RAG-enhanced chat API with streaming
      const response = await fetch('/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [
            { role: 'user', content: currentInput }
          ],
          stream: true,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error ${response.status}`);
      }

      if (!response.body) {
        throw new Error('No response body');
      }

      // Process OpenAI-compatible SSE stream
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let assistantMessageContent = '';
      
      // Create initial assistant message
      const assistantMessageId = (Date.now() + 1).toString();
      const assistantMessage: Message = {
        id: assistantMessageId,
        role: 'assistant',
        content: '',
        timestamp: new Date(),
      };
      
      setMessages(prev => [...prev, assistantMessage]);
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          // Skip comments (status messages)
          if (line.startsWith(':')) {
            console.debug('Status:', line.slice(2));
            continue;
          }
          
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') break;
            
            try {
              const parsed = JSON.parse(data);
              // OpenAI-compatible format: choices[0].delta.content
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) {
                assistantMessageContent += content;
                
                // Update the assistant message with accumulated content
                setMessages(prev => 
                  prev.map(msg => 
                    msg.id === assistantMessageId 
                      ? { ...msg, content: assistantMessageContent }
                      : msg
                  )
                );
              }
            } catch (e) {
              // Skip invalid JSON
              console.debug('Skipping invalid JSON:', data.substring(0, 100));
            }
          }
        }
      }
      
      // Ensure final message is set
      if (!assistantMessageContent) {
        throw new Error('No response content received');
      }
      
    } catch (error: any) {
      console.error('Chat error:', error);
      // Show error message
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `I apologize, but I encountered an error: ${error.message}. Please try again.`,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const hasMessages = messages.length > 0;

  return (
    <div className="h-screen flex flex-col bg-norse-night">
      {/* File Indexing Drawer - Fixed position, slides from left */}
      <FileIndexingSidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />

      {/* Header Banner - Always visible */}
      <header className="bg-norse-shadow border-b border-norse-rune px-6 py-4 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center space-x-3">
          <img 
            src="/mimir-logo.png" 
            alt="Mimir Logo" 
            className="h-10 w-auto"
          />
          <div>
            <h1 className="text-xl font-bold text-valhalla-gold">Mimir</h1>
            <p className="text-xs text-gray-400">AI Counsel</p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          {/* Save as Memory Button - Only show when there are messages */}
          {hasMessages && (
            <button
              onClick={handleSaveAsMemory}
              disabled={savingMemory}
              className="flex items-center space-x-2 px-4 py-2.5 bg-norse-rune hover:bg-valhalla-gold/20 border-2 border-norse-rune hover:border-valhalla-gold rounded-xl transition-all duration-300 group disabled:opacity-50 disabled:cursor-not-allowed h-11"
              title="Save conversation to memory"
            >
              <MemoryRuneIcon className="w-5 h-5 text-gray-300 group-hover:text-valhalla-gold transition-colors flex-shrink-0" />
              <span className="text-gray-300 group-hover:text-valhalla-gold text-sm font-medium">
                {savingMemory ? 'Saving...' : 'Save Memory'}
              </span>
            </button>
          )}

          {/* Studio Link Button */}
          <button
            onClick={() => navigate('/studio')}
            className="flex items-center space-x-2 px-4 py-2.5 bg-norse-rune hover:bg-valhalla-gold/20 border-2 border-norse-rune hover:border-valhalla-gold rounded-xl transition-all duration-300 group h-11"
            title="Open Orchestration Studio"
          >
            <OrchestrationStudioIcon size={20} className="group-hover:opacity-80 transition-opacity flex-shrink-0" />
            <span className="text-gray-300 group-hover:text-valhalla-gold text-sm font-medium">Studio</span>
          </button>
        </div>
      </header>

      {/* Main Chat Area */}
      <div className="flex-1 overflow-y-auto flex flex-col">
        {!hasMessages ? (
          /* Landing State - Centered with Input */
          <div className="flex-1 flex flex-col items-center justify-center px-4">
            <div className="w-full max-w-2xl flex flex-col items-center space-y-12">
              {/* Eye of Mimir & Greeting */}
              <div className="flex flex-col items-center space-y-6">
                <div className="relative">
                  <div className="absolute inset-0 blur-3xl bg-valhalla-gold opacity-30 rounded-full"></div>
                  <EyeOfMimir size={120} className="relative z-10" />
                </div>
                
                <div className="text-center space-y-2">
                  <h1 className="text-3xl font-bold bg-gradient-to-r from-valhalla-gold via-yellow-300 to-valhalla-gold bg-clip-text text-transparent">
                   How may I give counsel?
                  </h1>
                  <p className="text-base text-gray-400 font-light">
                    The All-Seeing Eye watches over the depths of knowledge
                  </p>
                </div>
              </div>

              {/* Centered Input */}
              <div className="w-full">
                <form onSubmit={handleSubmit} className="relative">
                  {/* Hidden file input */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept={ALLOWED_FILE_TYPES.join(',')}
                    onChange={handleFileInputChange}
                    className="hidden"
                  />

                  {/* File Previews */}
                  {attachedFiles.length > 0 && (
                    <div className="mb-3 flex flex-wrap gap-2">
                      {attachedFiles.map((file) => (
                        <div
                          key={file.id}
                          className="relative group bg-norse-shadow border-2 border-norse-rune rounded-xl overflow-hidden transition-all hover:border-valhalla-gold"
                        >
                          {file.file.type.startsWith('image/') ? (
                            <img
                              src={file.preview}
                              alt={file.file.name}
                              className="w-20 h-20 object-cover"
                            />
                          ) : (
                            <div className="w-20 h-20 flex items-center justify-center bg-norse-rune">
                              <ImageIcon className="w-8 h-8 text-gray-400" />
                            </div>
                          )}
                          <button
                            type="button"
                            onClick={() => removeFile(file.id)}
                            className="absolute top-1 right-1 p-1 bg-red-600 hover:bg-red-700 rounded-full transition-all opacity-0 group-hover:opacity-100"
                            title="Remove file"
                          >
                            <X className="w-3 h-3 text-white" />
                          </button>
                          <div className="absolute bottom-0 left-0 right-0 bg-black/70 px-1 py-0.5">
                            <p className="text-xs text-gray-300 truncate">{file.file.name}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div
                    className={`rounded-3xl shadow-xl transition-all duration-300 ${
                      isLoading 
                        ? 'border-2 border-valhalla-gold bg-[#252d3d] animate-[pulse-border_2s_ease-in-out_infinite]' 
                        : isDragging
                        ? 'border-2 border-valhalla-gold bg-valhalla-gold/10'
                        : 'border-2 border-norse-rune bg-[#252d3d] hover:border-gray-600'
                    }`}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                  >
                    <div className="flex items-center px-4 py-3 gap-2">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="flex-shrink-0 p-2 text-gray-400 hover:text-valhalla-gold transition-all rounded-lg hover:bg-norse-rune/50"
                        title="Attach file (Click, Drag, or Paste)"
                        disabled={isLoading}
                      >
                        <Paperclip className="w-5 h-5" />
                      </button>

                      <textarea
                        ref={textareaRef}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        onPaste={handlePaste}
                        onFocus={(e) => e.target.placeholder = ''}
                        onBlur={(e) => e.target.placeholder = 'Ask the Well of Mímir for wisdom...'}
                        placeholder="Ask the Well of Mímir for wisdom..."
                        className="flex-1 !bg-[#252d3d] text-gray-100 placeholder:text-gray-500 placeholder:opacity-50 outline-none border-none resize-none px-3 max-h-40 focus:!bg-[#252d3d] focus:outline-none focus:ring-0 focus:border-none active:!bg-[#252d3d]"
                        rows={1}
                        disabled={isLoading}
                        style={{ 
                          background: '#252d3d !important',
                          boxShadow: 'none',
                          border: 'none',
                          outline: 'none'
                        }}
                      />
                      
                      <button
                        type="submit"
                        disabled={(!input.trim() && attachedFiles.length === 0) || isLoading}
                        className="flex-shrink-0 p-2 bg-valhalla-gold text-norse-night rounded-xl hover:bg-yellow-500 transition-all disabled:opacity-30 disabled:cursor-not-allowed disabled:bg-gray-600"
                        title="Send message"
                      >
                        <Send className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            </div>
          </div>
        ) : (
          /* Chat State - Messages */
          <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex items-start space-x-4 ${
                  message.role === 'user' ? 'flex-row-reverse space-x-reverse' : ''
                }`}
              >
                {/* Avatar */}
                <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                  message.role === 'assistant'
                    ? 'bg-gradient-to-br from-valhalla-gold to-yellow-600 shadow-lg'
                    : 'bg-gradient-to-br from-blue-500 to-blue-600'
                }`}>
                  {message.role === 'assistant' ? (
                    <Sparkles className="w-5 h-5 text-norse-night" />
                  ) : (
                    <User className="w-5 h-5 text-white" />
                  )}
                </div>

                {/* Message Bubble */}
                <div className={`flex-1 max-w-3xl ${
                  message.role === 'user' ? 'flex justify-end' : ''
                }`}>
                  <div className={`rounded-2xl px-5 py-3 ${
                    message.role === 'assistant'
                      ? 'bg-norse-shadow border border-norse-rune'
                      : 'bg-blue-600/20 border border-blue-500/30'
                  }`}>
                    {/* Attachments */}
                    {message.attachments && message.attachments.length > 0 && (
                      <div className="mb-3 flex flex-wrap gap-2">
                        {message.attachments.map((file) => (
                          <div
                            key={file.id}
                            className="relative bg-norse-rune/50 border border-gray-600 rounded-lg overflow-hidden"
                          >
                            {file.file.type.startsWith('image/') ? (
                              <img
                                src={file.preview}
                                alt={file.file.name}
                                className="w-32 h-32 object-cover cursor-pointer hover:opacity-80 transition-opacity"
                                onClick={() => window.open(file.preview, '_blank')}
                              />
                            ) : (
                              <div className="w-32 h-32 flex flex-col items-center justify-center p-2">
                                <ImageIcon className="w-8 h-8 text-gray-400 mb-2" />
                                <p className="text-xs text-gray-300 text-center truncate w-full">{file.file.name}</p>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {message.role === 'assistant' ? (
                      <div className="text-gray-100 leading-relaxed prose prose-invert prose-sm max-w-none
                        prose-headings:text-valhalla-gold prose-headings:font-semibold
                        prose-p:text-gray-100 prose-p:leading-relaxed
                        prose-a:text-valhalla-gold prose-a:underline hover:prose-a:text-yellow-300
                        prose-strong:text-gray-50 prose-strong:font-semibold
                        prose-code:text-valhalla-gold prose-code:bg-norse-rune/50 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:break-words
                        prose-pre:bg-norse-rune/30 prose-pre:border prose-pre:border-norse-rune prose-pre:rounded-lg prose-pre:overflow-x-auto prose-pre:max-w-full
                        prose-pre:code:break-normal prose-pre:code:whitespace-pre
                        prose-ul:text-gray-100 prose-ol:text-gray-100
                        prose-li:text-gray-100 prose-li:marker:text-valhalla-gold
                        prose-blockquote:border-l-valhalla-gold prose-blockquote:text-gray-300
                        prose-hr:border-norse-rune">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {message.content}
                        </ReactMarkdown>
                      </div>
                    ) : (
                      <p className="text-gray-100 leading-relaxed whitespace-pre-wrap">
                        {message.content}
                      </p>
                    )}
                    
                    <p className="text-xs text-gray-500 mt-2">
                      {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              </div>
            ))}

            {/* Loading Indicator */}
            {isLoading && (
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-valhalla-gold to-yellow-600 flex items-center justify-center shadow-lg">
                  <Sparkles className="w-5 h-5 text-norse-night animate-pulse" />
                </div>
                <div className="flex-1 max-w-3xl">
                  <div className="bg-norse-shadow border border-norse-rune rounded-2xl px-5 py-3">
                    <div className="flex space-x-2">
                      <div className="w-2 h-2 bg-valhalla-gold rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                      <div className="w-2 h-2 bg-valhalla-gold rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                      <div className="w-2 h-2 bg-valhalla-gold rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Scroll anchor */}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input Area - Only show at bottom when messages exist */}
      {hasMessages && (
        <div className="border-t border-norse-rune bg-norse-night">
          <div className="max-w-4xl mx-auto px-4 py-6">
            <form onSubmit={handleSubmit} className="relative">
              {/* File Previews */}
              {attachedFiles.length > 0 && (
                <div className="mb-3 flex flex-wrap gap-2">
                  {attachedFiles.map((file) => (
                    <div
                      key={file.id}
                      className="relative group bg-norse-shadow border-2 border-norse-rune rounded-xl overflow-hidden transition-all hover:border-valhalla-gold"
                    >
                      {file.file.type.startsWith('image/') ? (
                        <img
                          src={file.preview}
                          alt={file.file.name}
                          className="w-20 h-20 object-cover"
                        />
                      ) : (
                        <div className="w-20 h-20 flex items-center justify-center bg-norse-rune">
                          <ImageIcon className="w-8 h-8 text-gray-400" />
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => removeFile(file.id)}
                        className="absolute top-1 right-1 p-1 bg-red-600 hover:bg-red-700 rounded-full transition-all opacity-0 group-hover:opacity-100"
                        title="Remove file"
                      >
                        <X className="w-3 h-3 text-white" />
                      </button>
                      <div className="absolute bottom-0 left-0 right-0 bg-black/70 px-1 py-0.5">
                        <p className="text-xs text-gray-300 truncate">{file.file.name}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div
                className={`rounded-3xl shadow-xl transition-all duration-300 ${
                  isLoading 
                    ? 'border-2 border-valhalla-gold bg-[#252d3d] animate-[pulse-border_2s_ease-in-out_infinite]' 
                    : isDragging
                    ? 'border-2 border-valhalla-gold bg-valhalla-gold/10'
                    : 'border-2 border-norse-rune bg-[#252d3d] hover:border-gray-600'
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <div className="flex items-center px-4 py-3 gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex-shrink-0 p-2 text-gray-400 hover:text-valhalla-gold transition-all rounded-lg hover:bg-norse-rune/50"
                    title="Attach file (Click, Drag, or Paste)"
                    disabled={isLoading}
                  >
                    <Paperclip className="w-5 h-5" />
                  </button>

                  <textarea
                    ref={textareaRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onPaste={handlePaste}
                    onFocus={(e) => e.target.placeholder = ''}
                    onBlur={(e) => e.target.placeholder = 'Ask the Well of Mímir for wisdom...'}
                    placeholder="Ask the Well of Mímir for wisdom..."
                    className="flex-1 !bg-[#252d3d] text-gray-100 placeholder:text-gray-500 placeholder:opacity-50 outline-none border-none resize-none px-3 max-h-40 focus:!bg-[#252d3d] focus:outline-none focus:ring-0 focus:border-none active:!bg-[#252d3d]"
                    rows={1}
                    disabled={isLoading}
                    style={{ 
                      background: '#252d3d !important',
                      boxShadow: 'none',
                      border: 'none',
                      outline: 'none'
                    }}
                  />
                  
                  <button
                    type="submit"
                    disabled={(!input.trim() && attachedFiles.length === 0) || isLoading}
                    className="flex-shrink-0 p-2 bg-valhalla-gold text-norse-night rounded-xl hover:bg-yellow-500 transition-all disabled:opacity-30 disabled:cursor-not-allowed disabled:bg-gray-600"
                    title="Send message"
                  >
                    <Send className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

import { useState, useRef, useEffect } from "react";
import { useChat } from "@/hooks/useChat";
import MessageBubble from "./MessageBubble";
import ThemeToggle from "./ThemeToggle";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

export default function ChatInterface() {
  const [inputMessage, setInputMessage] = useState("");
  const [characterCount, setCharacterCount] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  const {
    conversations,
    messages,
    currentConversationId,
    health,
    isTyping,
    messagesEndRef,
    isSending,
    sendMessage,
    startNewConversation,
    deleteCurrentConversation
  } = useChat();

  const maxChars = 2000;
  const isConnected = health?.ollama || false;

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px';
    }
  }, [inputMessage]);

  const handleInputChange = (value: string) => {
    setInputMessage(value);
    setCharacterCount(value.length);
  };

  const handleSendMessage = () => {
    const trimmedMessage = inputMessage.trim();
    if (!trimmedMessage || isSending || isTyping) return;
    
    sendMessage(trimmedMessage);
    setInputMessage("");
    setCharacterCount(0);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleClearChat = () => {
    if (window.confirm('Are you sure you want to clear the chat history?')) {
      deleteCurrentConversation();
    }
  };

  return (
    <div className="min-h-screen transition-all duration-500 bg-background relative">
      {/* Animated Grid Background */}
      <div className="fixed inset-0 grid-bg opacity-20 pointer-events-none" />
      
      <div className="relative min-h-screen flex flex-col">
        {/* Header */}
        <header className="glassmorphic border-b border-cyber-blue/20 p-4 relative z-10">
          <div className="max-w-6xl mx-auto flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 rounded-lg gradient-cyber neon-glow flex items-center justify-center animate-glow-pulse">
                <i className="fas fa-robot text-white text-lg" />
              </div>
              <div>
                <h1 className="font-orbitron font-bold text-xl text-cyber-blue tracking-wider">
                  CyberChat AI
                </h1>
                <p className="text-xs text-muted-foreground font-inter">
                  Powered by TinyLLaMA
                </p>
              </div>
            </div>
            
            {/* Controls */}
            <div className="flex items-center space-x-4">
              {/* Theme Toggle */}
              <ThemeToggle />
              
              {/* New Chat */}
              <Button
                onClick={startNewConversation}
                variant="ghost"
                size="sm"
                className="px-4 py-2 rounded-lg border border-neon-green/30 text-neon-green hover:bg-neon-green/10 transition-all duration-300 font-inter font-medium text-sm hover:shadow-lg hover:shadow-neon-green/30"
              >
                <i className="fas fa-plus mr-2" />
                New Chat
              </Button>
              
              {/* Clear Chat */}
              <Button
                onClick={handleClearChat}
                variant="ghost"
                size="sm"
                className="px-4 py-2 rounded-lg border border-hot-pink/30 text-hot-pink hover:bg-hot-pink/10 transition-all duration-300 font-inter font-medium text-sm hover:shadow-lg hover:shadow-hot-pink/30"
                disabled={!currentConversationId}
              >
                <i className="fas fa-trash-alt mr-2" />
                Clear Chat
              </Button>
              
              {/* Settings */}
              <Button
                variant="ghost"
                size="sm"
                className="w-10 h-10 rounded-lg border border-cyber-purple/30 text-cyber-purple hover:bg-cyber-purple/10 transition-all duration-300 flex items-center justify-center hover:shadow-lg hover:shadow-cyber-purple/30"
              >
                <i className="fas fa-cog" />
              </Button>
            </div>
          </div>
        </header>

        {/* Chat Container */}
        <div className="flex-1 flex flex-col max-w-6xl mx-auto w-full p-4 space-y-4">
          
          {/* Messages Area */}
          <div className="flex-1 holographic rounded-2xl p-6 relative overflow-hidden">
            {/* Background Effects */}
            <div className="absolute inset-0 bg-gradient-to-br from-cyber-blue/5 via-transparent to-hot-pink/5 pointer-events-none" />
            
            {/* Messages Container */}
            <div className="relative z-10 h-full flex flex-col">
              {messages.length === 0 ? (
                /* Welcome Message */
                <div className="text-center py-8 space-y-4 flex-1 flex flex-col justify-center">
                  <div className="w-20 h-20 mx-auto rounded-full gradient-cyber neon-glow flex items-center justify-center animate-glow-pulse">
                    <i className="fas fa-brain text-white text-2xl" />
                  </div>
                  <h2 className="font-orbitron font-bold text-2xl text-cyber-blue">
                    Welcome to CyberChat AI
                  </h2>
                  <p className="text-muted-foreground max-w-md mx-auto font-inter">
                    Start a conversation with our advanced AI. Ask anything, explore ideas, or just chat!
                  </p>
                  
                  {/* Connection Status */}
                  <div className="flex items-center justify-center space-x-2 mt-4">
                    <div className={`w-2 h-2 rounded-full animate-pulse ${
                      isConnected ? 'bg-neon-green' : 'bg-red-500'
                    }`} />
                    <span className="text-sm text-muted-foreground">
                      {isConnected ? 'Connected to TinyLLaMA' : 'Connecting to AI service...'}
                    </span>
                  </div>
                </div>
              ) : (
                /* Messages List */
                <ScrollArea className="flex-1 scrollbar-cyber">
                  <div className="space-y-4 pr-4">
                    {messages.map((message, index) => (
                      <MessageBubble
                        key={message.id}
                        message={message}
                        isLast={index === messages.length - 1}
                      />
                    ))}
                    
                    {/* Typing Indicator */}
                    {isTyping && (
                      <div className="animate-slide-in flex items-start space-x-3">
                        <div className="w-8 h-8 rounded-full gradient-neon flex items-center justify-center flex-shrink-0">
                          <i className="fas fa-robot text-white text-sm" />
                        </div>
                        <div className="glassmorphic rounded-2xl rounded-tl-sm p-4 border border-cyber-blue/20">
                          <div className="flex space-x-1">
                            <div className="w-2 h-2 bg-cyber-blue rounded-full animate-typing" />
                            <div className="w-2 h-2 bg-neon-green rounded-full animate-typing" style={{ animationDelay: '0.2s' }} />
                            <div className="w-2 h-2 bg-hot-pink rounded-full animate-typing" style={{ animationDelay: '0.4s' }} />
                          </div>
                        </div>
                      </div>
                    )}
                    
                    <div ref={messagesEndRef} />
                  </div>
                </ScrollArea>
              )}
            </div>
          </div>
          
          {/* Input Area */}
          <div className="holographic rounded-2xl p-4 space-y-4">
            {/* Input Container */}
            <div className="flex items-end space-x-4">
              {/* Text Input */}
              <div className="flex-1 relative">
                <Textarea
                  ref={textareaRef}
                  value={inputMessage}
                  onChange={(e) => handleInputChange(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type your message here..."
                  className="w-full bg-cyber-gray/50 border border-cyber-blue/30 rounded-xl px-4 py-3 text-foreground placeholder-muted-foreground font-inter resize-none focus:outline-none focus:border-cyber-blue focus:ring-2 focus:ring-cyber-blue/20 transition-all duration-300 scrollbar-cyber min-h-[52px] max-h-[120px]"
                  disabled={isSending || isTyping}
                  maxLength={maxChars}
                />
                
                {/* File Upload Button */}
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute right-3 bottom-3 w-8 h-8 rounded-lg bg-cyber-purple/20 border border-cyber-purple/30 text-cyber-purple hover:bg-cyber-purple/30 transition-all duration-300 flex items-center justify-center p-0"
                >
                  <i className="fas fa-paperclip text-sm" />
                </Button>
              </div>
              
              {/* Send Button */}
              <Button
                onClick={handleSendMessage}
                disabled={!inputMessage.trim() || isSending || isTyping || characterCount > maxChars}
                className="px-6 py-3 gradient-neon rounded-xl font-inter font-semibold text-black hover:shadow-xl hover:shadow-cyber-blue/30 transition-all duration-300 flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed neon-glow min-h-[52px]"
              >
                <span>
                  {isSending || isTyping ? 'Sending...' : 'Send'}
                </span>
                {isSending || isTyping ? (
                  <i className="fas fa-spinner fa-spin" />
                ) : (
                  <i className="fas fa-paper-plane" />
                )}
              </Button>
            </div>
            
            {/* Input Status */}
            <div className="flex items-center justify-between text-xs text-muted-foreground font-inter">
              <div className="flex items-center space-x-4">
                <span className="flex items-center space-x-1">
                  <div className={`w-2 h-2 rounded-full animate-pulse ${
                    isConnected ? 'bg-neon-green' : 'bg-red-500'
                  }`} />
                  <span>
                    {isConnected ? 'Connected to TinyLLaMA' : 'Disconnected'}
                  </span>
                </span>
                <span className={characterCount > maxChars ? 'text-red-500' : ''}>
                  {characterCount} / {maxChars}
                </span>
              </div>
              <div className="text-muted-foreground">
                Press{' '}
                <kbd className="px-2 py-1 bg-cyber-gray rounded text-xs border border-border">
                  Enter
                </kbd>{' '}
                to send
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="glassmorphic border-t border-cyber-blue/20 p-4 text-center">
          <div className="max-w-6xl mx-auto">
            <p className="text-muted-foreground text-sm font-inter">
              Powered by{' '}
              <span className="text-cyber-blue font-semibold">Ollama</span> ×{' '}
              <span className="text-neon-green font-semibold">TinyLLaMA</span> | Built with{' '}
              <i className="fas fa-heart text-hot-pink mx-1" /> for the future
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}

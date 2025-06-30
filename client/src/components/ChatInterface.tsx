import { useState, useRef, useEffect } from "react";
import { useChat } from "@/hooks/useChat";
import { useAuth } from "@/hooks/useAuth";
import MessageBubble from "./MessageBubble";
import ThemeToggle from "./ThemeToggle";
import Sidebar from "./Sidebar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function ChatInterface() {
  const [inputMessage, setInputMessage] = useState("");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  const { user } = useAuth();
  const {
    messages,
    currentConversationId,
    health,
    isTyping,
    messagesEndRef,
    isSending,
    sendMessage
  } = useChat();

  const isConnected = health?.ollama || false;

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px';
    }
  }, [inputMessage]);

  const handleSendMessage = (message?: string) => {
    const messageToSend = message || inputMessage.trim();
    if (!messageToSend || isSending || isTyping) return;
    
    sendMessage(messageToSend);
    if (!message) {
      setInputMessage("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <Sidebar 
        isOpen={isSidebarOpen} 
        onToggle={() => setIsSidebarOpen(!isSidebarOpen)} 
      />
      
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="border-b border-border bg-card px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="lg:hidden w-8 h-8 p-0"
              >
                <i className="fas fa-bars" />
              </Button>
              
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-lg gradient-cyber flex items-center justify-center">
                  <i className="fas fa-brain text-white text-sm" />
                </div>
                <div>
                  <h1 className="font-orbitron font-bold text-lg text-foreground">
                    KalingaAI Chat
                  </h1>
                  <p className="text-xs text-muted-foreground">
                    {isConnected ? 'Connected to TinyLLaMA' : 'Waiting for AI connection...'}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              {user && (
                <div className="flex items-center space-x-2 text-muted-foreground">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center">
                    <span className="text-white text-sm font-bold">
                      {user.name?.charAt(0).toUpperCase() || user.email?.charAt(0).toUpperCase() || 'U'}
                    </span>
                  </div>
                  <span className="text-sm font-medium hidden sm:block">
                    {user.name || user.email}
                  </span>
                </div>
              )}
              <ThemeToggle />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => window.location.href = '/api/auth/logout'}
                className="w-8 h-8 p-0 text-muted-foreground hover:text-foreground"
                title="Logout"
              >
                <i className="fas fa-sign-out-alt" />
              </Button>
            </div>
          </div>
        </header>

        {/* Chat Messages */}
        <div className="flex-1 overflow-hidden">
          {messages.length === 0 ? (
            /* Welcome Screen */
            <div className="h-full flex items-center justify-center p-8">
              <div className="text-center max-w-2xl">
                <div className="w-16 h-16 mx-auto rounded-2xl gradient-cyber flex items-center justify-center mb-6">
                  <i className="fas fa-brain text-white text-2xl" />
                </div>
                <h2 className="font-orbitron font-bold text-3xl text-foreground mb-4">
                  Welcome to KalingaAI
                </h2>
                <p className="text-muted-foreground text-lg mb-8">
                  Your advanced AI assistant powered by TinyLLaMA. Ask questions, get help with tasks, or have a conversation.
                </p>
                
                {/* Example prompts */}
                <div className="grid md:grid-cols-2 gap-4 mb-8">
                  <div 
                    className="bg-card border border-border rounded-xl p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => handleSendMessage("Help me brainstorm creative ideas for my final year project at Kalinga University")}
                  >
                    <div className="flex items-center space-x-3 mb-2">
                      <i className="fas fa-lightbulb text-primary" />
                      <span className="font-medium">Creative Ideas</span>
                    </div>
                    <p className="text-sm text-muted-foreground text-left">
                      Help me brainstorm ideas for a project
                    </p>
                  </div>
                  
                  <div 
                    className="bg-card border border-border rounded-xl p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => handleSendMessage("I need help with programming concepts and coding best practices")}
                  >
                    <div className="flex items-center space-x-3 mb-2">
                      <i className="fas fa-code text-primary" />
                      <span className="font-medium">Code Help</span>
                    </div>
                    <p className="text-sm text-muted-foreground text-left">
                      Explain a programming concept
                    </p>
                  </div>
                  
                  <div 
                    className="bg-card border border-border rounded-xl p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => handleSendMessage("Teach me about emerging technologies and study techniques for my courses")}
                  >
                    <div className="flex items-center space-x-3 mb-2">
                      <i className="fas fa-book text-primary" />
                      <span className="font-medium">Learning</span>
                    </div>
                    <p className="text-sm text-muted-foreground text-left">
                      Teach me about a new topic
                    </p>
                  </div>
                  
                  <div 
                    className="bg-card border border-border rounded-xl p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => handleSendMessage("Help me analyze data and provide insights for my research project")}
                  >
                    <div className="flex items-center space-x-3 mb-2">
                      <i className="fas fa-chart-line text-primary" />
                      <span className="font-medium">Analysis</span>
                    </div>
                    <p className="text-sm text-muted-foreground text-left">
                      Analyze data and provide insights
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center justify-center space-x-2">
                  <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'} animate-pulse`} />
                  <span className="text-sm text-muted-foreground">
                    {isConnected ? 'AI service is online' : 'Connecting to AI service...'}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            /* Messages List */
            <ScrollArea className="h-full">
              <div className="max-w-4xl mx-auto p-4 space-y-6">
                {messages.map((message, index) => (
                  <MessageBubble
                    key={message.id}
                    message={message}
                    isLast={index === messages.length - 1}
                  />
                ))}
                
                {/* Typing Indicator */}
                {isTyping && (
                  <div className="flex items-start space-x-4 animate-slide-in">
                    <div className="w-8 h-8 rounded-full gradient-neon flex items-center justify-center flex-shrink-0">
                      <i className="fas fa-brain text-white text-sm" />
                    </div>
                    <div className="bg-card border border-border rounded-2xl rounded-tl-sm p-4">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-primary rounded-full animate-bounce" />
                        <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                        <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                      </div>
                    </div>
                  </div>
                )}
                
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>
          )}
        </div>
        
        {/* Input Area */}
        <div className="border-t border-border bg-card p-4">
          <div className="max-w-4xl mx-auto">
            <div className="relative">
              <Textarea
                ref={textareaRef}
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Message KalingaAI..."
                className="w-full bg-background border border-border rounded-xl px-4 py-3 pr-12 text-foreground placeholder-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200 min-h-[52px] max-h-[200px]"
                disabled={isSending || isTyping}
                rows={1}
              />
              
              <Button
                onClick={() => handleSendMessage()}
                disabled={!inputMessage.trim() || isSending || isTyping}
                size="sm"
                className="absolute right-2 bottom-2 w-8 h-8 p-0 rounded-lg bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSending || isTyping ? (
                  <i className="fas fa-spinner fa-spin text-sm" />
                ) : (
                  <i className="fas fa-paper-plane text-sm text-primary-foreground" />
                )}
              </Button>
            </div>
            
            <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
              <div className="flex items-center space-x-4">
                <span className="flex items-center space-x-1">
                  <div className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
                  <span>{isConnected ? 'Connected' : 'Disconnected'}</span>
                </span>
              </div>
              <span>Press Enter to send</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

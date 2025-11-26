import { useState, useRef, useEffect } from "react";
import { useChat } from "@/hooks/useChat";
import { useAuth } from "@/hooks/useAuth";
import MessageBubble from "./MessageBubble";
import ThemeToggle from "./ThemeToggle";
import Sidebar from "./Sidebar";
import TypingIndicator from "./TypingIndicator";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";

export default function ChatInterface() {
  const [inputMessage, setInputMessage] = useState("");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { toast } = useToast();
  const { user } = useAuth();

  const {
    messages,
    conversations,
    currentConversationId,
    health,
    isTyping,
    messagesEndRef,
    isSending,
    sendMessage,
    chatInitializing,
    refetchConversations,
    refetchMessages,
    setCurrentConversationId,
    startNewConversation,
    deleteConversationMutation
  } = useChat();

  const isConnected = health?.ollama || false;

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px';
    }
  }, [inputMessage]);

  // Smooth scroll to bottom on new messages
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isTyping]);

  const handleSendMessage = (message?: string) => {
    if (chatInitializing) return;
    const messageToSend = message || inputMessage.trim();
    if (!messageToSend || isSending || isTyping) return;

    sendMessage(messageToSend);
    if (!message) {
      setInputMessage("");
      // Reset height
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleRefresh = (e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    toast({
      title: "Refreshing chat...",
      duration: 1000,
    });
    refetchConversations();
    refetchMessages();
  };

  const handleDeleteConversation = (id: number) => {
    if (conversations.length <= 1) {
      toast({
        title: "Cannot delete last chat",
        description: "You must have at least one conversation.",
        variant: "destructive",
      });
      return;
    }
    deleteConversationMutation.mutate(id);
  };

  return (
    <div className="flex h-screen bg-glow overflow-hidden">
      <Sidebar
        isOpen={isSidebarOpen}
        onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
        conversations={conversations}
        currentConversationId={currentConversationId}
        onSelectConversation={setCurrentConversationId}
        onNewConversation={startNewConversation}
        onDeleteConversation={handleDeleteConversation}
        isCreating={chatInitializing}
      />

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0 relative animate-fade-in">
        {/* Header */}
        <header className="absolute top-0 left-0 right-0 z-10 px-6 py-4 glass-panel border-b border-white/10 backdrop-blur-xl">
          <div className="flex items-center justify-between max-w-5xl mx-auto w-full">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="lg:hidden w-9 h-9 rounded-full hover:bg-white/10"
              >
                <i className="fas fa-bars" />
              </Button>

              <div className="flex items-center space-x-3">
                <div className={`w-2.5 h-2.5 rounded-full transition-all duration-500 ${isConnected ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]' : 'bg-red-500 animate-pulse'}`} />
                <div>
                  <h1 className="font-orbitron font-bold text-lg leading-none tracking-tight">
                    KalingaAI
                  </h1>
                  <p className="text-[10px] text-muted-foreground font-medium tracking-wide uppercase mt-1">
                    {isConnected ? 'System Online' : 'Connecting...'}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              {user && (
                <div className="hidden sm:flex items-center space-x-3 px-3 py-1.5 rounded-full bg-white/5 border border-white/10">
                  <div className="w-6 h-6 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center shadow-md">
                    <span className="text-white text-[10px] font-bold">
                      {user.name?.charAt(0).toUpperCase() || user.email?.charAt(0).toUpperCase() || 'U'}
                    </span>
                  </div>
                  <span className="text-xs font-medium text-muted-foreground">
                    {user.name || user.email?.split('@')[0] || 'User'}
                  </span>
                </div>
              )}

              <ThemeToggle />

              <Button
                variant="ghost"
                size="icon"
                onClick={handleRefresh}
                className="w-9 h-9 rounded-full hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors"
                title="Refresh Chat"
              >
                <i className="fas fa-sync-alt" />
              </Button>
            </div>
          </div>
        </header>

        {/* Messages Area */}
        <div className="flex-1 overflow-hidden pt-[72px] pb-[80px]">
          {messages.length === 0 && !isTyping ? (
            <div className="h-full flex items-center justify-center p-8 animate-fade-in">
              <div className="text-center max-w-2xl w-full">
                <div className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center mb-8 shadow-2xl shadow-purple-500/30 glow-purple">
                  <i className="fas fa-brain text-white text-3xl" />
                </div>
                <h2 className="font-orbitron font-bold text-4xl mb-4 text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-400">
                  Welcome to KalingaAI
                </h2>
                <p className="text-muted-foreground text-lg mb-12 max-w-lg mx-auto leading-relaxed">
                  Your advanced AI assistant. Ready to help you learn, create, and explore.
                </p>

                <div className="grid md:grid-cols-2 gap-4 max-w-3xl mx-auto">
                  {[
                    { icon: "lightbulb", title: "Creative Ideas", desc: "Brainstorm project concepts", prompt: "Help me brainstorm creative ideas for my final year project" },
                    { icon: "code", title: "Code Help", desc: "Debug & explain code", prompt: "I need help with programming concepts and coding best practices" },
                    { icon: "book", title: "Learning", desc: "Explain complex topics", prompt: "Teach me about emerging technologies and study techniques" },
                    { icon: "chart-line", title: "Analysis", desc: "Data insights & research", prompt: "Help me analyze data and provide insights for my research project" }
                  ].map((item, i) => (
                    <button
                      key={i}
                      className="group text-left p-5 rounded-2xl glass-card hover:bg-white/10 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg border border-white/5"
                      onClick={() => handleSendMessage(item.prompt)}
                    >
                      <div className="flex items-center space-x-3 mb-2">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                          <i className={`fas fa-${item.icon}`} />
                        </div>
                        <span className="font-semibold text-foreground">{item.title}</span>
                      </div>
                      <p className="text-sm text-muted-foreground pl-11">
                        {item.desc}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <ScrollArea className="h-full px-4" ref={scrollRef}>
              <div className="w-full max-w-5xl mx-auto py-6 space-y-8">
                {messages.map((message, index) => (
                  <MessageBubble
                    key={message.id}
                    message={message}
                    isLast={index === messages.length - 1}
                  />
                ))}

                {isTyping && <TypingIndicator />}

                <div ref={messagesEndRef} className="h-4" />
              </div>
            </ScrollArea>
          )}
        </div>

        {/* Input Area */}
        <footer className="absolute bottom-0 left-0 right-0 p-4 glass-panel border-t border-white/10 backdrop-blur-xl">
          <div className="w-full max-w-[900px] mx-auto">
            {chatInitializing ? (
              <div className="flex items-center justify-center py-3 text-muted-foreground">
                <span className="animate-spin mr-2"><i className="fas fa-spinner" /></span>
                <span className="text-sm font-medium">Initializing secure connection...</span>
              </div>
            ) : (
              <div className="relative flex items-end gap-2 bg-card/50 backdrop-blur-sm border border-white/10 rounded-2xl p-2 shadow-lg focus-within:ring-2 focus-within:ring-primary/50 focus-within:border-primary/50 transition-all duration-300">
                <Textarea
                  ref={textareaRef}
                  className="flex-1 min-h-[44px] max-h-[160px] bg-transparent border-0 focus-visible:ring-0 resize-none py-3 px-4 text-base placeholder:text-muted-foreground/50 font-inter"
                  placeholder="Message KalingaAI..."
                  value={inputMessage}
                  onChange={e => setInputMessage(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={isSending || isTyping || chatInitializing}
                  rows={1}
                />
                <Button
                  onClick={() => handleSendMessage()}
                  disabled={isSending || isTyping || chatInitializing || !inputMessage.trim()}
                  className={`
                    mb-1 mr-1 h-10 w-10 rounded-xl transition-all duration-300 shadow-md
                    ${inputMessage.trim()
                      ? 'bg-primary hover:bg-primary/90 text-white translate-y-0 opacity-100'
                      : 'bg-muted text-muted-foreground translate-y-0 opacity-50'
                    }
                  `}
                >
                  {isSending || isTyping ? (
                    <span className="animate-spin"><i className="fas fa-spinner" /></span>
                  ) : (
                    <i className="fas fa-arrow-up" />
                  )}
                </Button>
              </div>
            )}
            <div className="text-center mt-2">
              <p className="text-[10px] text-muted-foreground/60">
                KalingaAI can make mistakes. Consider checking important information.
              </p>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
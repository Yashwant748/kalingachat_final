import { useState, useRef, useEffect } from "react";
import { useChat } from "@/hooks/useChat";
import { useAuth } from "@/hooks/useAuth";
import MessageBubble from "./MessageBubble";
import ThemeToggle from "./ThemeToggle";
import Sidebar from "./Sidebar";
import RAGUploadDialog from "./RAGUploadDialog";
// import TypingIndicator from "./TypingIndicator";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { useWebSpeech } from "@/hooks/useWebSpeech";
import { Switch } from "@/components/ui/switch"; // Assuming we have a Switch or I can use a Button toggle
import { cn } from "@/lib/utils";

export default function ChatInterface() {
  const [inputMessage, setInputMessage] = useState("");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [selectedModel, setSelectedModel] = useState<string>(() => localStorage.getItem("kalinga_model") || "tinyllama");

  // Save selection
  useEffect(() => {
    localStorage.setItem("kalinga_model", selectedModel);
  }, [selectedModel]);

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

  // --- JARVIS / VOICE MODE ---
  const {
    isListening,
    transcript,
    interimTranscript,
    startListening,
    stopListening,
    resetTranscript,
    speak,
    stopSpeaking,
    isSupported: isSpeechSupported,
    error: voiceError,
    mode: voiceMode,
    isModelLoading,
    modelLoadingMessage, // FROM HOOK
    audioLevel // Debug audio level
  } = useWebSpeech();

  // Handle Voice Errors
  useEffect(() => {
    if (voiceError) {
      let title = "Voice Error";
      let desc = "An error occurred with voice recognition.";

      if (voiceError === 'network') {
        title = "Voice Input Offline";
        desc = "Switching to Offline Voice Engine (Vosk)...";
      } else if (voiceError === 'not-allowed') {
        title = "Microphone Blocked";
        desc = "Please allow microphone access.";
      } else if (voiceError === 'no-speech') {
        return; // Ignore no-speech errors (common)
      } else {
        desc = `Error: ${voiceError}`;
      }

      toast({ title, description: desc, variant: "destructive" });
    }
  }, [voiceError, toast]);

  const [autoSpeak, setAutoSpeak] = useState(false);
  const lastAiMessageIdRef = useRef<number | null>(null);

  // Sync Voice Input to Textarea
  useEffect(() => {
    if (isListening) {
      setInputMessage(transcript + (interimTranscript ? interimTranscript : ""));
    }
  }, [transcript, interimTranscript, isListening]);

  // JARVIS LOGIC: Auto-Send on Silence
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isListening && transcript.length > 0 && !interimTranscript) {
      // If we have a transcript and no interim (speech paused/done segment), start timer
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);

      silenceTimerRef.current = setTimeout(() => {
        stopListening();
        // Small delay to ensure state updates, then send
        setTimeout(() => handleSendMessage(), 200);
      }, 2000); // 2 seconds silence = send
    }
    return () => {
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    };
  }, [transcript, interimTranscript, isListening, stopListening]);

  // Auto-Speak AI Responses
  useEffect(() => {
    if (!autoSpeak) return;
    if (isTyping) return; // Wait until finished

    const lastMsg = messages[messages.length - 1];
    if (lastMsg && lastMsg.sender === 'ai' && lastMsg.id !== lastAiMessageIdRef.current) {
      // New AI message finished
      lastAiMessageIdRef.current = lastMsg.id;
      // Strip markdown/code for cleaner speech? Simple for now.
      const cleanText = lastMsg.content.replace(/[*#`]/g, '');
      console.log("Triggering auto-speak for message:", lastMsg.id);

      // Visual feedback so user knows it's TRYING to speak
      toast({ title: "Reading answer...", description: "Turn up volume." });
      speak(cleanText);
    }
  }, [messages, isTyping, autoSpeak, speak]);

  const handleMicClick = () => {
    if (isListening) {
      stopListening();
    } else {
      resetTranscript();
      startListening();
      toast({ title: "Listening...", description: "Speak now. I will auto-send after silence." });
    }
  };


  // UX Fix: Rely on Backend health, not deep Ollama check for UI status
  const isBackendConnected = health?.backend || (messages && messages.length > 0) || false;
  // Network Status
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const isConnected = isBackendConnected && isOnline;

  // UX Fix: Force online state visually after small timeout to prevent flicker on load
  const [showOnline, setShowOnline] = useState(false);
  useEffect(() => {
    // If connected, show immediately
    if (isConnected) setShowOnline(true);
    else {
      // If loading, wait 1.5s then assume online if no hard error (Optimistic UI)
      const timer = setTimeout(() => setShowOnline(true), 1500);
      return () => clearTimeout(timer);
    }
  }, [isConnected]);

  // DYNAMIC MODE BADGE
  const getModeBadge = () => {
    if (inputMessage.match(/^\/(friday|analyze)/i)) return { label: "FRIDAY", color: "text-cyan-400 bg-cyan-950/30 border-cyan-500/30" };
    if (inputMessage.match(/^\/viva/i)) return { label: "VIVA SURVIVOR", color: "text-amber-400 bg-amber-950/30 border-amber-500/30" };
    return { label: "JARVIS", color: "text-primary bg-primary/10 border-primary/20" };
  };
  const modeInfo = getModeBadge();


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

    sendMessage(messageToSend, selectedModel);
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

              <div className="flex flex-col w-full">
                <div className="flex items-center justify-between w-full">
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <h1 className="font-orbitron font-bold text-lg leading-none tracking-tight">
                        KalingaAI
                      </h1>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded border font-mono tracking-wider ${modeInfo.color}`}>
                        {modeInfo.label}
                      </span>
                    </div>
                    <div className="flex items-center space-x-1.5 mt-0.5">
                      <div className={`w-1.5 h-1.5 rounded-full transition-all duration-500 ${isOnline ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-red-500 animate-pulse'}`} />
                      <span className="text-[9px] font-mono text-muted-foreground tracking-widest uppercase">
                        SYSTEM {isOnline ? 'ONLINE' : 'OFFLINE'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              {/* --- MODEL SELECTOR --- */}
              <div className="hidden sm:block">
                <select
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className="bg-white/5 border border-white/10 text-xs rounded-lg px-2 py-1 text-muted-foreground focus:outline-none hover:bg-white/10 transition-colors"
                >
                  <option value="tinyllama">TinyLlama (Fast Default)</option>
                  <option value="phi3:mini">Phi3 (Smart Mode)</option>
                  <option value="qwen2.5:3b">Qwen (Deep Mode)</option>
                </select>
              </div>

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

              {/* Voice Mode Toggle */}
              {isSpeechSupported && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    const newState = !autoSpeak;
                    setAutoSpeak(newState);
                    if (newState) {
                      toast({ title: "Voice Mode: ON", description: "I will read my responses aloud." });
                      speak("Voice mode online. I am ready.");
                    } else {
                      toast({ title: "Voice Mode: OFF" });
                      stopSpeaking();
                    }
                  }}
                  className={cn(
                    "w-9 h-9 rounded-full transition-colors",
                    autoSpeak ? "bg-primary/20 text-primary hover:bg-primary/30" : "hover:bg-white/10 text-muted-foreground"
                  )}
                  title={autoSpeak ? "Disable Voice Output" : "Enable Voice Output"}
                >
                  <i className={`fas ${autoSpeak ? "fa-volume-up" : "fa-volume-mute"}`} />
                </Button>
              )}

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

                {/* TypingIndicator removed to prevent double buffering - MessageBubble handles it */}

                <div ref={messagesEndRef} className="h-4" />
              </div>
            </ScrollArea>
          )}
        </div>

        {/* Input Area */}
        <footer className="absolute bottom-0 left-0 right-0 p-4 glass-panel border-t border-white/10 backdrop-blur-xl">
          <div className="w-full max-w-[900px] mx-auto">
            <div className="relative flex items-end gap-2 bg-card/50 backdrop-blur-sm border border-white/10 rounded-2xl p-2 shadow-lg focus-within:ring-2 focus-within:ring-primary/50 focus-within:border-primary/50 transition-all duration-300">
              <RAGUploadDialog
                onUploadSuccess={(data) => {
                  const params = JSON.stringify({
                    filename: data.filename,
                    chunks: data.chunks,
                    type: data.type,
                    fileId: data.fileId
                  });
                  // 1. Send the Attachment Card Message (Always)
                  handleSendMessage(`[RAG_ATTACHMENT]:${params}`);

                  // 2. If Demo Mode (Auto Reply) is ON, trigger AI response
                  if (data.autoReply) {
                    setTimeout(() => {
                      handleSendMessage("Give a short summary of this document.");
                    }, 1000); // Small delay for UX
                  }
                }}
              >
                <Button
                  variant="ghost"
                  size="icon"
                  className="mb-1 ml-1 h-10 w-10 rounded-xl text-muted-foreground hover:text-foreground hover:bg-white/10 transition-colors"
                >
                  <i className="fas fa-plus" />
                </Button>
              </RAGUploadDialog>



              <div className="relative flex-1">
                <Textarea
                  ref={textareaRef}
                  className={cn(
                    "flex-1 min-h-[44px] max-h-[160px] bg-transparent border-0 focus-visible:ring-0 resize-none py-3 px-4 text-base font-inter transition-all duration-200",
                    // Voice processing states
                    isListening && "bg-red-500/5 border-l-2 border-l-red-500/50",
                    isModelLoading && "bg-primary/5 border-l-2 border-l-primary/50 animate-pulse",
                    voiceError && "bg-destructive/5 border-l-2 border-l-destructive/50"
                  )}
                  placeholder="Message KalingaAI..."
                  value={inputMessage}
                  onChange={e => setInputMessage(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={chatInitializing}
                  rows={1}
                />


              </div>
              {/* Mic Button - Moved Here */}
              {isSpeechSupported && (
                <div className="flex items-end mb-1 mr-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleMicClick}
                    className={cn(
                      "h-10 w-10 rounded-xl transition-all duration-300",
                      isListening ? "bg-red-500/20 text-red-500 animate-pulse" : "text-muted-foreground hover:text-foreground hover:bg-white/10",
                      (isModelLoading && !isListening) && "animate-spin text-amber-500",
                      voiceError && !isModelLoading && "border border-red-500/30 text-red-400"
                    )}
                    title={isModelLoading ? "Initializing Voice Engine..." : isListening ? "Stop Listening" : "Start Voice Input"}
                    disabled={false}
                  >
                    {isModelLoading ? (
                      <i className="fas fa-spinner animate-spin" />
                    ) : isListening ? (
                      <i className="fas fa-microphone-slash" />
                    ) : (
                      <i className="fas fa-microphone" />
                    )}
                  </Button>
                </div>

              )}

              {/* Send Button */}
              <Button
                onClick={() => handleSendMessage()}
                disabled={chatInitializing || !inputMessage.trim()}
                className={`
                    mb-1 mr-1 h-10 w-10 rounded-xl transition-all duration-300 shadow-md
                    ${inputMessage.trim()
                    ? 'bg-primary hover:bg-primary/90 text-white translate-y-0 opacity-100'
                    : 'bg-muted text-muted-foreground translate-y-0 opacity-50'
                  }
                  `}
                title={isSending || isTyping ? "Send anyway (AI is still typing)" : "Send Message"}
              >
                {isSending || isTyping ? (
                  <span className="animate-spin text-primary-foreground/70" title="AI is responding..."><i className="fas fa-spinner" /></span>
                ) : (
                  <i className="fas fa-arrow-up" />
                )}
              </Button>
            </div>
            <div className="text-center mt-2">
              <p className="text-[10px] text-muted-foreground/60">
                KalingaAI can make mistakes. Consider checking important information.
              </p>
            </div>
          </div>
        </footer>
      </div >
    </div >
  );
}
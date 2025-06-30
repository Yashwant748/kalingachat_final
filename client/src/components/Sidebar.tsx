import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useChat } from "@/hooks/useChat";
import { useAuth } from "@/hooks/useAuth";
import { formatDistanceToNow } from "date-fns";

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
}

export default function Sidebar({ isOpen, onToggle }: SidebarProps) {
  const {
    conversations,
    currentConversationId,
    setCurrentConversationId,
    startNewConversation,
    deleteCurrentConversation,
    isCreating
  } = useChat();

  const [hoveredId, setHoveredId] = useState<number | null>(null);

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onToggle}
        />
      )}
      
      {/* Sidebar */}
      <div className={`
        fixed lg:relative inset-y-0 left-0 z-50 lg:z-auto
        w-80 bg-card border-r border-border
        transform transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        flex flex-col
      `}>
        {/* Header */}
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-lg gradient-cyber flex items-center justify-center">
                <i className="fas fa-brain text-white text-sm" />
              </div>
              <div>
                <h2 className="font-orbitron font-bold text-lg text-foreground">
                  KalingaAI
                </h2>
                <p className="text-xs text-muted-foreground">
                  AI Assistant
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggle}
              className="lg:hidden w-8 h-8 p-0"
            >
              <i className="fas fa-times" />
            </Button>
          </div>
          
          {/* New Chat Button */}
          <Button
            onClick={startNewConversation}
            disabled={isCreating}
            className="w-full mt-4 bg-primary hover:bg-primary/90 text-primary-foreground font-medium"
          >
            <i className="fas fa-plus mr-2" />
            {isCreating ? "Creating..." : "New Chat"}
          </Button>
        </div>

        {/* Chat History */}
        <div className="flex-1 overflow-hidden">
          <div className="p-4">
            <h3 className="text-sm font-medium text-muted-foreground mb-3">
              Recent Chats
            </h3>
          </div>
          
          <ScrollArea className="flex-1 px-2">
            <div className="space-y-1">
              {conversations.map((conversation) => (
                <div
                  key={conversation.id}
                  className={`
                    group relative rounded-lg p-3 cursor-pointer transition-all duration-200
                    ${currentConversationId === conversation.id 
                      ? 'bg-primary/10 border border-primary/20' 
                      : 'hover:bg-muted/50'
                    }
                  `}
                  onClick={() => setCurrentConversationId(conversation.id)}
                  onMouseEnter={() => setHoveredId(conversation.id)}
                  onMouseLeave={() => setHoveredId(null)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {conversation.title}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(conversation.updatedAt), { addSuffix: true })}
                      </p>
                    </div>
                    
                    {hoveredId === conversation.id && currentConversationId === conversation.id && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteCurrentConversation();
                        }}
                        className="w-6 h-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <i className="fas fa-trash text-xs text-destructive" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border space-y-3">
          <Button
            onClick={() => {
              const { logout } = useAuth();
              logout();
            }}
            variant="ghost"
            size="sm"
            className="w-full justify-start text-muted-foreground hover:text-foreground"
          >
            <i className="fas fa-sign-out-alt mr-3" />
            Sign Out
          </Button>
          <div className="text-xs text-muted-foreground text-center">
            Powered by TinyLLaMA
          </div>
        </div>
      </div>
    </>
  );
}
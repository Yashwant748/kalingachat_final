import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/hooks/useAuth";
import { formatDistanceToNow } from "date-fns";
import type { Conversation } from "@shared/schema";
import RAGUploadDialog from "./RAGUploadDialog";
import { Link, useLocation } from "react-router-dom";

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  conversations: Conversation[];
  currentConversationId: number | null;
  onSelectConversation: (id: number) => void;
  onNewConversation: () => void;
  onDeleteConversation: (id: number) => void;
  isCreating: boolean;
}

export default function Sidebar({
  isOpen,
  onToggle,
  conversations,
  currentConversationId,
  onSelectConversation,
  onNewConversation,
  onDeleteConversation,
  isCreating
}: SidebarProps) {

  const { logout } = useAuth();
  const location = useLocation();

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden transition-opacity duration-300"
          onClick={onToggle}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed lg:relative inset-y-0 left-0 z-50
        w-80 glass-panel border-r border-white/10
        transform transition-transform duration-300 ease-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        flex flex-col shadow-2xl lg:shadow-none
      `}>
        {/* Header */}
        <div className="p-6 border-b border-white/10">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3 group cursor-pointer">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center shadow-lg shadow-purple-500/20 group-hover:shadow-purple-500/40 transition-all duration-300 group-hover:scale-105">
                <i className="fas fa-brain text-white text-lg" />
              </div>
              <div>
                <h2 className="font-orbitron font-bold text-xl tracking-tight text-foreground group-hover:text-primary transition-colors">
                  KalingaAI
                </h2>
                <p className="text-[10px] text-muted-foreground font-medium tracking-wide uppercase">
                  Academic Jarvis v6
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggle}
              className="lg:hidden w-8 h-8 rounded-full hover:bg-white/10"
            >
              <i className="fas fa-times" />
            </Button>
          </div>

          {/* New Chat Button */}
          <Button
            onClick={onNewConversation}
            disabled={isCreating}
            className="w-full bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all duration-300 h-11 rounded-xl font-medium hover:-translate-y-1"
          >
            <i className={`fas fa-plus mr-2 ${isCreating ? 'animate-spin' : ''}`} />
            {isCreating ? "Creating..." : "New Chat"}
          </Button>
        </div>

        {/* AI Tools Section */}
        <div className="px-6 py-4 border-b border-white/10">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            AI Tools
          </h3>
          <Link
            to="/tools/pdf-to-excel"
            className={`
              flex items-center w-full px-3 py-2 text-sm font-medium rounded-xl transition-all
              ${location.pathname === '/tools/pdf-to-excel'
                ? 'bg-green-500/10 text-green-500 shadow-sm'
                : 'text-foreground hover:bg-white/5 hover:text-green-400'
              }
            `}
            onClick={() => { if (window.innerWidth < 1024) onToggle(); }}
          >
            <i className="fas fa-file-excel mr-3 opacity-70" />
            PDF to Excel
          </Link>
        </div>

        {/* Chat History */}
        <div className="flex-1 overflow-hidden flex flex-col">
          <div className="px-6 py-4">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Recent Chats
            </h3>
          </div>

          <ScrollArea className="flex-1 px-4">
            <div className="space-y-1 pb-4">
              {conversations.map((conversation) => (
                <div
                  key={conversation.id}
                  className={`
                    group relative rounded-xl p-3 cursor-pointer transition-all duration-200 border border-transparent
                    flex items-center justify-between
                    ${currentConversationId === conversation.id
                      ? 'bg-primary/10 border-primary/20 shadow-sm translate-x-1'
                      : 'hover:bg-white/5 hover:border-white/10 hover:translate-x-1'
                    }
                  `}
                  onClick={() => onSelectConversation(conversation.id)}
                >
                  <div className="flex-1 min-w-0 pr-8">
                    <p className={`text-sm font-medium truncate transition-colors ${currentConversationId === conversation.id ? 'text-primary' : 'text-foreground group-hover:text-foreground/90'
                      }`}>
                      {conversation.title}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-1 font-medium">
                      {formatDistanceToNow(new Date(conversation.updatedAt), { addSuffix: true })}
                    </p>
                  </div>

                  {/* Delete Button */}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteConversation(conversation.id);
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-200 hover:bg-destructive/10 hover:text-destructive"
                  >
                    <i className="fas fa-trash-alt text-xs" />
                  </Button>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/10 space-y-2 bg-black/5">
          <RAGUploadDialog />
          <Button
            onClick={logout}
            variant="ghost"
            className="w-full justify-start text-muted-foreground hover:text-foreground hover:bg-white/5 h-10 rounded-xl transition-colors"
          >
            <i className="fas fa-sign-out-alt mr-3" />
            Sign Out
          </Button>
          <div className="text-[10px] text-muted-foreground/60 text-center font-medium py-2">
            Powered by TinyLLaMA
          </div>
        </div>
      </div>
    </>
  );
}
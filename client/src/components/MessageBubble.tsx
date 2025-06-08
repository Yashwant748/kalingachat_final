import type { Message } from "@shared/schema";
import { formatDistanceToNow } from "date-fns";

interface MessageBubbleProps {
  message: Message;
  isLast?: boolean;
}

export default function MessageBubble({ message, isLast }: MessageBubbleProps) {
  const isUser = message.sender === 'user';
  const isAI = message.sender === 'ai';

  return (
    <div 
      className={`animate-slide-in flex items-start space-x-3 ${
        isUser ? 'flex-row-reverse space-x-reverse' : ''
      }`}
    >
      {/* Avatar */}
      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
        isUser 
          ? 'gradient-hot' 
          : 'gradient-neon'
      }`}>
        <i className={`text-white text-sm ${
          isUser ? 'fas fa-user' : 'fas fa-robot'
        }`} />
      </div>

      {/* Message Content */}
      <div className={`flex-1 ${isUser ? 'text-right' : ''}`}>
        <div className={`glassmorphic rounded-2xl p-4 border transition-all duration-300 hover:shadow-lg ${
          isUser 
            ? 'rounded-tr-sm border-hot-pink/20 bg-gradient-to-r from-hot-pink/10 to-cyber-purple/10 hover:shadow-hot-pink/20'
            : 'rounded-tl-sm border-cyber-blue/20 hover:shadow-cyber-blue/20'
        }`}>
          <div className="text-foreground font-inter leading-relaxed whitespace-pre-wrap">
            {message.content}
          </div>
        </div>
        
        {/* Timestamp */}
        <div className={`text-xs text-muted-foreground mt-2 font-inter ${
          isUser ? 'mr-2' : 'ml-2'
        }`}>
          {formatDistanceToNow(new Date(message.timestamp), { addSuffix: true })}
        </div>
      </div>
    </div>
  );
}

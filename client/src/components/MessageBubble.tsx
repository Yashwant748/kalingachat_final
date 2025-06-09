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
    <div className="group">
      <div className={`flex items-start space-x-4 ${isUser ? 'flex-row-reverse space-x-reverse' : ''}`}>
        {/* Avatar */}
        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
          isUser 
            ? 'bg-primary text-primary-foreground' 
            : 'gradient-cyber'
        }`}>
          <i className={`text-white text-sm ${
            isUser ? 'fas fa-user' : 'fas fa-brain'
          }`} />
        </div>

        {/* Message Content */}
        <div className="flex-1 max-w-none">
          <div className={`${
            isUser 
              ? 'bg-primary text-primary-foreground ml-12' 
              : 'bg-card border border-border'
          } rounded-2xl p-4 ${isUser ? 'rounded-tr-sm' : 'rounded-tl-sm'}`}>
            <div className="prose prose-sm max-w-none text-foreground leading-relaxed whitespace-pre-wrap">
              {message.content}
            </div>
          </div>
          
          {/* Timestamp */}
          <div className={`text-xs text-muted-foreground mt-2 opacity-0 group-hover:opacity-100 transition-opacity ${
            isUser ? 'text-right mr-2' : 'ml-2'
          }`}>
            {formatDistanceToNow(new Date(message.timestamp), { addSuffix: true })}
          </div>
        </div>
      </div>
    </div>
  );
}

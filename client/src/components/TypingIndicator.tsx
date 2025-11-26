import React from 'react';

export default function TypingIndicator() {
    return (
        <div className="flex items-start space-x-4 animate-fade-in">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center flex-shrink-0 shadow-lg glow-purple">
                <i className="fas fa-brain text-white text-xs" />
            </div>
            <div className="glass-card rounded-2xl rounded-tl-sm p-4">
                <div className="flex space-x-1.5">
                    <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0s' }} />
                    <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.15s' }} />
                    <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.3s' }} />
                </div>
            </div>
        </div>
    );
}

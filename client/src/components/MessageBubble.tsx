import type { Message } from "@shared/schema";
import { formatDistanceToNow } from "date-fns";
import { useMessageStream } from "@/hooks/useMessageStream";
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { useState, useEffect } from "react";

interface MessageBubbleProps {
  message: Message;
  isLast?: boolean;
}

function JarvisLoadingAnimation() {
  const [frame, setFrame] = useState(0);
  const phrases = ["Initializing Jarvis...", "Processing Request...", "Generating Output..."];

  useEffect(() => {
    const timer = setInterval(() => {
      setFrame(prev => (prev + 1) % phrases.length);
    }, 800); // Cycles exactly under 1 second per user rules
    return () => clearInterval(timer);
  }, []);

  return (
    <span className="ml-2 font-medium non-italic text-primary/80 transition-opacity duration-300">
      {phrases[frame]}
    </span>
  );
}

export default function MessageBubble({ message, isLast }: MessageBubbleProps) {
  const isUser = message.sender === 'user';

  const { displayedContent, isStreaming } = useMessageStream({
    content: message.content,
    isUser,
    isLast: !!isLast,
    messageId: message.id,
    speed: 20
  });

  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  return (
    <div className={`group animate-slide-up w-full flex ${isUser ? 'justify-end' : 'justify-center'}`}>
      <div className={`flex items-end w-full ${isUser ? 'max-w-[85%] md:max-w-[70%]' : 'max-w-3xl'} ${isUser ? 'flex-row-reverse space-x-reverse space-x-3' : 'space-x-3'}`}>

        {/* Avatar */}
        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 shadow-md ${isUser
          ? 'bg-gradient-to-br from-blue-500 to-cyan-500 text-white'
          : 'bg-gradient-to-br from-purple-500 to-indigo-500 text-white glow-purple'
          }`}>
          <i className={`text-xs ${isUser ? 'fas fa-user' : 'fas fa-brain'}`} />
        </div>

        {/* Message Content */}
        <div className="flex flex-col min-w-0">
          <div className={`
            relative px-5 py-3.5 rounded-2xl shadow-sm backdrop-blur-sm border transition-all duration-300
            ${isUser
              ? 'bg-primary text-primary-foreground rounded-tr-sm border-primary/20'
              : 'glass-panel text-foreground rounded-tl-sm hover:border-primary/20 neon-border'
            }
          `}>
            <div className="prose prose-sm max-w-none dark:prose-invert leading-relaxed font-medium overflow-hidden">
              {isUser && displayedContent.startsWith('[RAG_ATTACHMENT]:') ? (
                (() => {
                  try {
                    const data = JSON.parse(displayedContent.replace('[RAG_ATTACHMENT]:', ''));
                    const isPdf = data.type === 'application/pdf' || data.filename?.endsWith('.pdf');
                    return (
                      <div className="flex items-center p-3 bg-white/10 rounded-xl border border-white/10 backdrop-blur-md">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center mr-3 ${isPdf ? 'bg-red-500/20 text-red-400' : 'bg-blue-500/20 text-blue-400'}`}>
                          <i className={`fas ${isPdf ? 'fa-file-pdf' : 'fa-file-alt'} text-xl`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm text-foreground truncate">{data.filename}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {isPdf ? 'PDF Document' : 'Text File'} • {data.chunks} chunks processed
                          </p>
                        </div>
                        <div className="ml-2">
                          <i className="fas fa-check-circle text-green-400" title="Uploaded Successfully" />
                        </div>
                      </div>
                    );
                  } catch (e) {
                    return <div className="text-red-400 text-xs">Error parsing attachment</div>;
                  }
                })()
              ) : isUser ? (
                <div className="whitespace-pre-wrap">{displayedContent}</div>
              ) : (
                <>
                  {!displayedContent ? (
                    // STREAMING UX IMPROVEMENT: Thinking Indicator
                    <div className="flex items-center space-x-2 py-1 text-muted-foreground/70 text-xs italic">
                      <div className="w-1.5 h-1.5 bg-current rounded-full animate-bounce" style={{ animationDelay: '0s' }} />
                      <div className="w-1.5 h-1.5 bg-current rounded-full animate-bounce" style={{ animationDelay: '0.15s' }} />
                      <div className="w-1.5 h-1.5 bg-current rounded-full animate-bounce" style={{ animationDelay: '0.3s' }} />
                      <JarvisLoadingAnimation />
                    </div>
                  ) : (
                    <ReactMarkdown
                      components={{
                        code({ node, inline, className, children, ...props }: any) {
                          const match = /language-(\w+)/.exec(className || '')
                          const codeString = String(children).replace(/\n$/, '');

                          return !inline && match ? (
                            <div className="rounded-lg overflow-hidden my-2 border border-white/10 shadow-lg group/code">
                              <div className="bg-black/50 px-3 py-1.5 text-xs text-muted-foreground border-b border-white/10 flex justify-between items-center">
                                <span className="font-mono text-xs uppercase tracking-wider opacity-70">{match[1]}</span>
                                <button
                                  onClick={() => handleCopy(codeString)}
                                  className="flex items-center space-x-1 hover:text-white transition-colors focus:outline-none"
                                  title="Copy code"
                                >
                                  {copiedCode === codeString ? (
                                    <>
                                      <i className="fas fa-check text-green-400 text-xs" />
                                      <span className="text-[10px] text-green-400">Copied!</span>
                                    </>
                                  ) : (
                                    <>
                                      <i className="fas fa-copy text-xs opacity-70 group-hover/code:opacity-100 transition-opacity" />
                                      <span className="text-[10px] opacity-0 group-hover/code:opacity-100 transition-opacity">Copy</span>
                                    </>
                                  )}
                                </button>
                              </div>
                              <SyntaxHighlighter
                                {...props}
                                style={vscDarkPlus}
                                language={match[1]}
                                PreTag="div"
                                customStyle={{
                                  margin: 0,
                                  borderRadius: 0,
                                  background: 'rgba(0, 0, 0, 0.5)',
                                  fontSize: '0.85rem',
                                  fontFamily: 'JetBrains Mono, monospace',
                                  padding: '1rem',
                                  overflowX: 'auto'
                                }}
                              >
                                {codeString}
                              </SyntaxHighlighter>
                            </div>
                          ) : (
                            <code {...props} className={`${className} bg-muted/50 px-1.5 py-0.5 rounded font-mono text-xs border border-white/5`}>
                              {children}
                            </code>
                          )
                        }
                      }}
                    >
                      {displayedContent}
                    </ReactMarkdown>
                  )}
                  {isStreaming && displayedContent && (
                    <span className="inline-block w-1.5 h-4 ml-1 align-middle bg-primary animate-pulse" />
                  )}
                </>
              )}
            </div>
          </div>

          {/* Timestamp */}
          <div className={`text-[10px] text-muted-foreground mt-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 ${isUser ? 'text-right mr-1' : 'ml-1'
            }`}>
            {formatDistanceToNow(new Date(message.timestamp), { addSuffix: true })}
          </div>
        </div>
      </div>
    </div>
  );
}

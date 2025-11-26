import { useState, useEffect, useRef } from 'react';

// Global set to track which messages have already finished streaming
const streamedMessages = new Set<number>();

interface UseMessageStreamProps {
    content: string;
    isUser: boolean;
    isLast: boolean;
    messageId?: number; // Add messageId to track streaming state
    speed?: number;
}

export function useMessageStream({
    content,
    isUser,
    isLast,
    messageId,
    speed = 15
}: UseMessageStreamProps) {
    // Check if this message has already been streamed
    const hasStreamed = messageId ? streamedMessages.has(messageId) : false;
    const shouldStream = !isUser && isLast && !hasStreamed;

    // Initialize state
    const [displayedContent, setDisplayedContent] = useState(
        shouldStream ? "" : content
    );
    const [isStreaming, setIsStreaming] = useState(shouldStream);

    const contentRef = useRef(content);

    useEffect(() => {
        // If we shouldn't stream (user, not last, or already streamed), show full content
        if (!shouldStream) {
            setDisplayedContent(content);
            setIsStreaming(false);
            return;
        }

        // If content hasn't changed, don't restart animation
        if (contentRef.current === content && displayedContent === content) {
            return;
        }
        contentRef.current = content;

        setIsStreaming(true);
        let currentIndex = 0;

        // Resume from current length if possible
        if (displayedContent.length > 0 && content.startsWith(displayedContent)) {
            currentIndex = displayedContent.length;
        } else {
            setDisplayedContent("");
        }

        const interval = setInterval(() => {
            if (currentIndex < content.length) {
                setDisplayedContent(content.slice(0, currentIndex + 1));
                currentIndex++;
            } else {
                setIsStreaming(false);
                if (messageId) {
                    streamedMessages.add(messageId);
                }
                clearInterval(interval);
            }
        }, speed);

        return () => clearInterval(interval);
    }, [content, shouldStream, speed, messageId]);

    return {
        displayedContent: shouldStream ? displayedContent : content,
        isStreaming: shouldStream ? isStreaming : false
    };
}

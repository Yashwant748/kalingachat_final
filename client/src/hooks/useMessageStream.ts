import { useState, useEffect, useRef } from 'react';

// Global set to track which messages have already finished streaming
const streamedMessages = new Set<number>();

interface UseMessageStreamProps {
    content: string;
    isUser: boolean;
    isLast: boolean;
    messageId?: number;
    speed?: number; // Deprecated but kept for compat, we use dynamic speed now
}

export function useMessageStream({
    content,
    isUser,
    isLast,
    messageId
}: UseMessageStreamProps) {
    // If user message, or not the last one, or already streamed -> show full immediately
    const hasStreamed = messageId ? streamedMessages.has(messageId) : false;
    const shouldStream = !isUser && isLast && !hasStreamed;

    // State
    // If streaming, start empty. If not, start full.
    const [displayedContent, setDisplayedContent] = useState(shouldStream ? "" : content);

    // Check if we effectively finished
    const isFinished = displayedContent.length >= content.length;
    const [isStreaming, setIsStreaming] = useState(shouldStream && !isFinished);

    // Refs for animation loop
    const contentRef = useRef(content);
    const displayedRef = useRef(displayedContent);
    const requestRef = useRef<number>();

    useEffect(() => {
        // If we shouldn't stream (or stopped), ensure we show everything
        if (!shouldStream) {
            setDisplayedContent(content);
            setIsStreaming(false);
            if (messageId) streamedMessages.add(messageId);
            return;
        }

        // Update target content
        contentRef.current = content;

        // If we already match, we are done
        if (displayedRef.current.length >= content.length) {
            setIsStreaming(false);
            if (messageId) streamedMessages.add(messageId);
            return;
        }

        // START ANIMATION LOOP
        // Logic: 
        // We want to "catch up" to the real content.
        // If real content is far ahead -> print faster.
        // If close -> print normal speed (smoothness).

        setIsStreaming(true);

        const animate = () => {
            const currentLen = displayedRef.current.length;
            const targetLen = contentRef.current.length;

            if (currentLen < targetLen) {
                // Determine how many chars to add this frame
                // If we are way behind (> 50 chars), add 5 chars per frame
                // If close, add 1 or 2.
                // Frame is approx 16ms (60fps)

                const diff = targetLen - currentLen;
                let step = 1;

                if (diff > 50) step = 5;
                else if (diff > 20) step = 3;
                else if (diff > 5) step = 2;

                const nextStr = contentRef.current.slice(0, currentLen + step);
                displayedRef.current = nextStr;
                setDisplayedContent(nextStr);

                requestRef.current = requestAnimationFrame(animate);
            } else {
                // Done
                setIsStreaming(false);
                if (messageId) streamedMessages.add(messageId);
            }
        };

        // Cancel any existing loop
        if (requestRef.current) cancelAnimationFrame(requestRef.current);
        requestRef.current = requestAnimationFrame(animate);

        return () => {
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
        };
    }, [content, shouldStream, messageId]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
        };
    }, []);

    return {
        displayedContent: shouldStream ? displayedContent : content,
        isStreaming
    };
}

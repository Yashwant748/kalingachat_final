// Copy and paste this full code into useChat.ts
import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { chatApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import type { Conversation, Message } from "@shared/schema";

export function useChat() {
  const [currentConversationId, setCurrentConversationId] = useState<number | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { isAuthenticated } = useAuth();

  // --- DATA FETCHING ---

  const {
    data: conversations,
    isLoading: conversationsLoading,
    refetch: refetchConversations
  } = useQuery({
    queryKey: ["conversations"],
    queryFn: async (): Promise<Conversation[]> => {
      const res = await chatApi.getConversations();
      return res.data;
    },
    enabled: !!isAuthenticated,
  });

  const {
    data: messages,
    refetch: refetchMessages
  } = useQuery({
    queryKey: ["messages", currentConversationId],
    queryFn: async (): Promise<Message[]> => {
      if (!currentConversationId) return [];
      const res = await chatApi.getMessages(currentConversationId);
      return res.data;
    },
    enabled: !!isAuthenticated && !!currentConversationId,
  });

  const { data: health } = useQuery({
    queryKey: ["health"],
    queryFn: chatApi.health,
    refetchInterval: 30000,
  });

  // --- ACTIONS ---

  const createConversationMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await chatApi.createConversation(data);
      return res.data;
    },
    onMutate: async (newData) => {
      await queryClient.cancelQueries({ queryKey: ["conversations"] });
      const previousConversations = queryClient.getQueryData(["conversations"]);

      // Optimistic update
      queryClient.setQueryData(["conversations"], (old: Conversation[] | undefined) => {
        const tempId = Date.now(); // Temp ID
        const newConv: Conversation = {
          id: tempId,
          title: newData.title,
          userId: 1, // Placeholder
          createdAt: new Date(),
          updatedAt: new Date()
        };
        return [newConv, ...(old || [])];
      });
      return { previousConversations };
    },
    onSuccess: (newConversation) => {
      // Replace temp with real
      queryClient.setQueryData(["conversations"], (old: Conversation[] | undefined) => {
        if (!old) return [newConversation];
        // Remove any optimistics (huge IDs) and add real one
        return [newConversation, ...old.filter(c => c.id < 9999999999)];
      });
      setCurrentConversationId(newConversation.id);
      setIsTyping(false);
      toast({ title: "New chat created" });
    },
    onError: (err, newTodo, context: any) => {
      queryClient.setQueryData(["conversations"], context.previousConversations);
    }
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (variables: { conversationId: number; content: string; model?: string }) => {
      // 1. Optimistically update UI or just let the stream handle it
      // We'll use a direct stream handler here
      let aiMessageId: number | null = null;
      let fullContent = "";

      await chatApi.sendMessageStream(variables.conversationId, variables.content, (chunk) => {
        // Check if it's the header chunk
        try {
          if (!aiMessageId && chunk.trim().startsWith('{')) {
            const header = JSON.parse(chunk);
            if (header.aiMessageId) {
              aiMessageId = header.aiMessageId;
              // Force a refetch to show the new empty message
              queryClient.invalidateQueries({ queryKey: ["messages", currentConversationId] });
              return;
            }
          }
        } catch (e) { }

        // Append to content
        fullContent += chunk;

        // Update the message in the cache directly for smooth streaming
        queryClient.setQueryData(["messages", currentConversationId], (old: Message[] | undefined) => {
          if (!old) return [];
          if (!aiMessageId) return old; // Wait for ID

          const msgIndex = old.findIndex(m => m.id === aiMessageId);
          if (msgIndex === -1) {
            // If not found (maybe refetch hasn't happened), we might need to wait or append
            // For now, let's rely on the initial refetch to add the message, then update it
            return old;
          }

          const newMessages = [...old];
          newMessages[msgIndex] = {
            ...newMessages[msgIndex],
            content: fullContent
          };
          return newMessages;
        });
      }, variables.model);
      return { success: true };
    },
    onMutate: () => setIsTyping(true),
    onSuccess: () => {
      setIsTyping(false);
      queryClient.invalidateQueries({ queryKey: ["messages", currentConversationId] });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
    onError: (error: any) => {
      setIsTyping(false);
      console.error("SendMessage Error:", error);
      toast({
        title: "Message failed",
        description: error.message || "Failed to send message. Please check your connection.",
        variant: "destructive"
      });
    },
  });

  const deleteConversationMutation = useMutation({
    mutationFn: chatApi.deleteConversation,
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ["conversations"] });
      const previousConversations = queryClient.getQueryData(["conversations"]);

      // Optimistic delete
      queryClient.setQueryData(["conversations"], (old: Conversation[] | undefined) => {
        return old?.filter(c => c.id !== id) || [];
      });

      // If deleting current, switch to another
      if (currentConversationId === id) {
        const remaining = (previousConversations as Conversation[])?.filter(c => c.id !== id) || [];
        if (remaining.length > 0) setCurrentConversationId(remaining[0].id);
        else setCurrentConversationId(null);
      }

      return { previousConversations };
    },
    onSuccess: () => {
      // Already updated optimistically. Just invalidate to sync.
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      toast({ title: "Conversation deleted" });
    },
    onError: (err, id, context: any) => {
      queryClient.setQueryData(["conversations"], context.previousConversations);
      toast({ title: "Error deleting conversation", description: err.message, variant: "destructive" });
    }
  });

  // --- LOGIC ---

  useEffect(() => {
    if (isAuthenticated && !conversationsLoading) {
      if (conversations && conversations.length > 0 && !currentConversationId) {
        setCurrentConversationId(conversations[0].id);
      } else if (conversations && conversations.length === 0 && !createConversationMutation.isPending) {
        createConversationMutation.mutate({ title: "New Chat" });
      }
    }
  }, [isAuthenticated, conversations, conversationsLoading, currentConversationId, createConversationMutation]);

  // Reset typing state when switching conversations
  useEffect(() => {
    setIsTyping(false);
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [currentConversationId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  // --- FUNCTIONS FOR THE UI ---

  const startNewConversation = () => {
    createConversationMutation.mutate({ title: `New Chat` });
  };

  const sendMessage = (content: string, model?: string) => {
    if (!currentConversationId) return;
    sendMessageMutation.mutate({ conversationId: currentConversationId, content, model });
  };

  // --- THIS IS THE FIX ---
  // We make sure to return an empty array [] if the data is 'undefined'
  return {
    conversations: conversations || [], // <-- FIX IS HERE
    messages: messages || [], // <-- FIX IS HERE
    currentConversationId,
    health,
    isTyping,
    messagesEndRef,
    conversationsLoading,
    chatInitializing: conversationsLoading,
    isSending: sendMessageMutation.isPending,
    isCreating: createConversationMutation.isPending,
    isDeleting: deleteConversationMutation.isPending,
    setCurrentConversationId,
    startNewConversation,
    sendMessage,
    deleteConversationMutation,
    refetchConversations,
    refetchMessages,
  };
}
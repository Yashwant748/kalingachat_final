import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Conversation, Message } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

export function useChat() {
  const [currentConversationId, setCurrentConversationId] = useState<number | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Get conversations
  const {
    data: conversations = [],
    isLoading: conversationsLoading
  } = useQuery({
    queryKey: ["/api/conversations"],
    queryFn: async () => {
      const convs = await api.getConversations();
      if (convs.length > 0 && !currentConversationId) {
        setCurrentConversationId(convs[0].id);
      }
      return convs;
    }
  });

  // Get messages for current conversation
  const {
    data: messages = [],
    isLoading: messagesLoading
  } = useQuery({
    queryKey: ["/api/conversations", currentConversationId, "messages"],
    queryFn: () => currentConversationId ? api.getMessages(currentConversationId) : [],
    enabled: !!currentConversationId
  });

  // Health check
  const { data: health } = useQuery({
    queryKey: ["/api/health"],
    queryFn: api.health,
    refetchInterval: 30000 // Check every 30 seconds
  });

  // Create conversation mutation
  const createConversationMutation = useMutation({
    mutationFn: api.createConversation,
    onSuccess: (conversation) => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      setCurrentConversationId(conversation.id);
      toast({
        title: "New conversation created",
        description: "You can start chatting now!"
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create conversation",
        variant: "destructive"
      });
    }
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: ({ conversationId, content }: { conversationId: number; content: string }) =>
      api.sendMessage(conversationId, content),
    onMutate: () => {
      setIsTyping(true);
    },
    onSuccess: (data) => {
      setIsTyping(false);
      queryClient.invalidateQueries({
        queryKey: ["/api/conversations", currentConversationId, "messages"]
      });
      if (data.error) {
        toast({
          title: "Warning",
          description: data.error,
          variant: "destructive"
        });
      }
    },
    onError: (error) => {
      setIsTyping(false);
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive"
      });
      console.error("Send message error:", error);
    }
  });

  // Delete conversation mutation
  const deleteConversationMutation = useMutation({
    mutationFn: api.deleteConversation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      setCurrentConversationId(null);
      toast({
        title: "Conversation deleted",
        description: "Chat history has been cleared"
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete conversation",
        variant: "destructive"
      });
    }
  });

  // Auto-scroll to bottom
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isTyping]);

  // Create initial conversation if none exist
  useEffect(() => {
    if (!conversationsLoading && conversations.length === 0) {
      createConversationMutation.mutate({ title: "New Chat" });
    }
  }, [conversations, conversationsLoading]);

  const startNewConversation = () => {
    createConversationMutation.mutate({
      title: `Chat ${conversations.length + 1}`
    });
  };

  const sendMessage = (content: string) => {
    if (!currentConversationId) {
      toast({
        title: "Error",
        description: "No active conversation",
        variant: "destructive"
      });
      return;
    }

    sendMessageMutation.mutate({
      conversationId: currentConversationId,
      content
    });
  };

  const deleteCurrentConversation = () => {
    if (currentConversationId) {
      deleteConversationMutation.mutate(currentConversationId);
    }
  };

  return {
    // Data
    conversations,
    messages,
    currentConversationId,
    health,
    isTyping,
    messagesEndRef,
    
    // Loading states
    conversationsLoading,
    messagesLoading,
    isSending: sendMessageMutation.isPending,
    isCreating: createConversationMutation.isPending,
    isDeleting: deleteConversationMutation.isPending,
    
    // Actions
    setCurrentConversationId,
    startNewConversation,
    sendMessage,
    deleteCurrentConversation
  };
}

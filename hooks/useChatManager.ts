// lib/useChatManager.ts
import { PersonalityKey } from "@/lib/assistantService";
import {
  getMessagesFromCache,
  saveMessagesToCache,
} from "@/lib/ChatHistoryManager";
import { createOrUpdateUserProfile } from "@/lib/firebase/models/user";
import { Message } from "@/types/chat";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

/**
 * A custom hook that manages chat state across the application
 * Handles initialization, persistence, and restoration of chat state
 */
export const useChatManager = (userId?: string | null) => {
  const [threadId, setThreadId] = useState<string | null>(null);
  const [assistantId, setAssistantId] = useState<string | null>(null);
  const [personality, setPersonality] = useState<PersonalityKey>("best-friend");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isInitializing, setIsInitializing] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize chat - either loads existing chat or creates a new one
  const initializeChat = useCallback(async () => {
    if (!userId) return;

    setIsInitializing(true);
    setError(null);

    try {
      // Try to load user profile to get existing threadId/assistantId
      const response = await fetch("/api/user/profile");
      if (response.ok) {
        const userProfile = await response.json();

        // If user has existing threadId and assistantId
        if (userProfile.threadId && userProfile.assistantId) {
          setThreadId(userProfile.threadId);
          setAssistantId(userProfile.assistantId);

          if (userProfile.aiPersonality) {
            setPersonality(userProfile.aiPersonality as PersonalityKey);
          }

          // Try to load messages from cache
          const cachedMessages = getMessagesFromCache(userProfile.threadId);
          if (cachedMessages && cachedMessages.length > 0) {
            setMessages(cachedMessages);
            setIsInitializing(false);
            return;
          }

          // If no cache, try to load messages from server
          const messagesResponse = await fetch(
            `/api/assistant/messages?threadId=${userProfile.threadId}`
          );
          if (messagesResponse.ok) {
            const data = await messagesResponse.json();
            if (Array.isArray(data) && data.length > 0) {
              const fetchedMessages = data.map((msg: any) => ({
                ...msg,
                timestamp: new Date(msg.timestamp),
              })) as Message[];

              setMessages(fetchedMessages);
              saveMessagesToCache(userProfile.threadId, fetchedMessages);
              setIsInitializing(false);
              return;
            }
          }

          // If no messages found, we need to reinitialize to get a welcome message
          console.log(
            "No messages found for existing thread, reinitializing..."
          );
        }

        // If we reach here, either user doesn't have a thread or we couldn't find messages
        await createNewChat(
          (userProfile.aiPersonality as PersonalityKey) || personality
        );
      } else {
        // If profile fetch fails, create a new chat with default personality
        await createNewChat(personality);
      }
    } catch (error) {
      console.error("Error initializing chat:", error);
      setError("Failed to initialize chat. Please refresh the page.");
    } finally {
      setIsInitializing(false);
    }
  }, [userId, personality]);

  // Create a new chat thread and get initial welcome message
  const createNewChat = useCallback(
    async (chatPersonality: PersonalityKey = "best-friend") => {
      if (!userId) return;

      try {
        // Call the initialize API endpoint
        const response = await fetch("/api/assistant/initialize", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ personality: chatPersonality }),
        });

        if (!response.ok) {
          throw new Error("Failed to initialize chat");
        }

        const data = await response.json();

        // Set thread and assistant IDs
        setThreadId(data.threadId);
        setAssistantId(data.assistantId);
        setPersonality(data.personality);

        // Create welcome message and save to cache
        if (data.welcomeMessage) {
          const welcomeMsg: Message = {
            id: data.welcomeMessage.id,
            role: "assistant",
            content: data.welcomeMessage.content,
            timestamp: new Date(data.welcomeMessage.timestamp),
          };

          setMessages([welcomeMsg]);
          saveMessagesToCache(data.threadId, [welcomeMsg]);
        }
      } catch (error) {
        console.error("Error creating new chat:", error);
        setError("Failed to create new chat. Please try again.");

        // Fallback greeting if everything fails
        const fallbackMsg: Message = {
          id: "welcome",
          role: "assistant",
          content: "Hi, I'm Niblet! How can I help you today?",
          timestamp: new Date(),
        };

        setMessages([fallbackMsg]);
      }
    },
    [userId]
  );

  // Change AI personality
  const changePersonality = useCallback(
    async (newPersonality: PersonalityKey) => {
      if (!userId || !threadId) return;

      setPersonality(newPersonality);

      try {
        // Update user profile
        await createOrUpdateUserProfile(userId, {
          aiPersonality: newPersonality,
        });

        // Add a system message to notify about personality change
        const systemMsg: Message = {
          id: `system-${Date.now()}`,
          role: "system",
          content: `AI personality changed to ${newPersonality.replace(
            "-",
            " "
          )}`,
          timestamp: new Date(),
        };

        const updatedMessages = [...messages, systemMsg];
        setMessages(updatedMessages);
        saveMessagesToCache(threadId, updatedMessages);

        toast.success(
          `AI personality changed to ${newPersonality.replace("-", " ")}`
        );
      } catch (error) {
        console.error("Error changing personality:", error);
        toast.error("Failed to update AI personality");
      }
    },
    [userId, threadId, messages]
  );

  // Add a message to the chat
  const addMessage = useCallback(
    (message: Message) => {
      if (!threadId) return;

      const updatedMessages = [...messages, message];
      setMessages(updatedMessages);
      saveMessagesToCache(threadId, updatedMessages);
    },
    [threadId, messages]
  );

  // Clear chat history
  const clearChat = useCallback(async () => {
    if (!userId) return;

    // Create a new chat with the current personality
    await createNewChat(personality);
    toast.success("Chat history cleared");
  }, [userId, personality, createNewChat]);

  // Initialize on mount
  useEffect(() => {
    if (userId) {
      initializeChat();
    }
  }, [userId, initializeChat]);

  return {
    threadId,
    assistantId,
    personality,
    messages,
    isInitializing,
    error,
    initializeChat,
    createNewChat,
    changePersonality,
    addMessage,
    clearChat,
  };
};

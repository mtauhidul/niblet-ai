// hooks/useChatManager.ts - Enhanced version with better persistence
import { PersonalityKey } from "@/lib/assistantService";
import {
  extractAndStoreAILearning,
  getLastActiveThreadId,
  getMessagesFromCache,
  saveMessagesToCache,
  updateSessionData,
} from "@/lib/ChatHistoryManager";
import { createOrUpdateUserProfile } from "@/lib/firebase/models/user";
import { Message } from "@/types/chat";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

/**
 * Enhanced custom hook that manages chat state across the application
 * with improved persistence across route changes
 */
export const useChatManager = (userId?: string | null) => {
  const [threadId, setThreadId] = useState<string | null>(null);
  const [assistantId, setAssistantId] = useState<string | null>(null);
  const [personality, setPersonality] = useState<PersonalityKey>("best-friend");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isInitializing, setIsInitializing] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Use a ref to track if we've already initialized to avoid double initialization
  const isInitializedRef = useRef<boolean>(false);
  // Track if we're preserving the session
  const preservingSession = useRef<boolean>(false);

  // Initialize chat - either loads existing chat or creates a new one
  const initializeChat = useCallback(async () => {
    if (!userId) return;
    if (isInitializedRef.current) return; // Prevent double initialization

    setIsInitializing(true);
    setError(null);
    isInitializedRef.current = true;

    try {
      // First check for an active session from localStorage
      const lastActiveThreadId = getLastActiveThreadId();

      // If we have an active thread ID, try to restore that session first
      if (lastActiveThreadId) {
        console.log(
          `Attempting to restore active session with thread: ${lastActiveThreadId}`
        );

        try {
          // Try to load messages from cache
          const cachedMessages = getMessagesFromCache(lastActiveThreadId);

          if (cachedMessages && cachedMessages.length > 0) {
            preservingSession.current = true;

            // Get assistant ID from profile or cache
            let cachedAssistantId = null;

            // Try to find assistant ID in user profile
            const response = await fetch("/api/user/profile");
            if (response.ok) {
              const userProfile = await response.json();
              if (userProfile.assistantId) {
                cachedAssistantId = userProfile.assistantId;

                if (userProfile.aiPersonality) {
                  setPersonality(userProfile.aiPersonality as PersonalityKey);
                }
              }
            }

            // If we have both thread and assistant ID, restore the session
            if (cachedAssistantId) {
              setThreadId(lastActiveThreadId);
              setAssistantId(cachedAssistantId);
              setMessages(cachedMessages);
              setIsInitializing(false);
              console.log("Successfully restored previous chat session");
              return;
            }
          }
        } catch (err) {
          console.error("Error restoring cached session:", err);
          // Continue to normal initialization if restoration fails
        }
      }

      // If we get here, either there was no active session or restoration failed
      console.log(
        "No active session found or restoration failed, loading from profile..."
      );

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
            // Update session data to mark this thread as active
            updateSessionData(userProfile.threadId);
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
              updateSessionData(userProfile.threadId);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
          updateSessionData(data.threadId);
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
        updateSessionData(threadId);

        // Extract learning data from messages
        extractAndStoreAILearning(threadId, updatedMessages);

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
      updateSessionData(threadId);

      // Extract learning data from messages after a certain threshold
      // This ensures we don't do unnecessary processing for every message
      if (updatedMessages.length % 5 === 0) {
        extractAndStoreAILearning(threadId, updatedMessages);
      }
    },
    [threadId, messages]
  );

  // Clear chat history
  const clearChat = useCallback(async () => {
    if (!userId) return;

    // First extract learning data before clearing
    if (threadId && messages.length > 0) {
      extractAndStoreAILearning(threadId, messages);
    }

    // Create a new chat with the current personality
    await createNewChat(personality);
    toast.success("Chat history cleared");
  }, [userId, personality, createNewChat, threadId, messages]);

  // Initialize on mount or when userId changes
  useEffect(() => {
    if (userId && !isInitializedRef.current) {
      initializeChat();
    }

    // Reset the ref when userId changes (login/logout)
    if (!userId) {
      isInitializedRef.current = false;
      preservingSession.current = false;
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
    preservingSession: preservingSession.current,
  };
};

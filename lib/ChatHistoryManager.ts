// lib/ChatHistoryManager.ts - Enhanced persistence

import { Message } from "@/types/chat";

// Prefix for localStorage keys to avoid conflicts
const MESSAGE_CACHE_KEY_PREFIX = "niblet_messages_";
const SESSION_CACHE_KEY = "niblet_session_data";
const ASSISTANT_LEARNING_KEY = "niblet_ai_learning_data";

/**
 * Builds the localStorage key for a specific thread.
 */
export const getMessageCacheKey = (threadId: string): string => {
  return `${MESSAGE_CACHE_KEY_PREFIX}${threadId}`;
};

/**
 * Retrieves cached messages for a thread from localStorage.
 * Returns null if none exist or if there's an error.
 */
export const getMessagesFromCache = (threadId: string): Message[] | null => {
  if (!threadId || typeof window === "undefined") return null;

  try {
    const cacheKey = getMessageCacheKey(threadId);
    const cachedData = localStorage.getItem(cacheKey);

    if (!cachedData) {
      // No messages stored
      return null;
    }

    const parsed = JSON.parse(cachedData) as Message[];
    if (!Array.isArray(parsed)) {
      console.error("Invalid message cache format, expected array.");
      return null;
    }

    // Convert string timestamps back to Date objects
    const messages = parsed.map((msg) => ({
      ...msg,
      timestamp: new Date(msg.timestamp),
    }));

    return messages;
  } catch (error) {
    console.error(
      `Error retrieving messages from cache for thread ${threadId}:`,
      error
    );
    // On error, clear potentially corrupted cache
    clearMessagesFromCache(threadId);
    return null;
  }
};

/**
 * Saves an array of messages for a thread into localStorage.
 */
export const saveMessagesToCache = (
  threadId: string,
  messages: Message[]
): void => {
  if (!threadId || typeof window === "undefined") return;

  try {
    localStorage.setItem(
      getMessageCacheKey(threadId),
      JSON.stringify(messages)
    );

    // Also update the session data to record this thread as active
    updateSessionData(threadId);
  } catch (error) {
    console.error(
      `Error saving messages to cache for thread ${threadId}:`,
      error
    );
  }
};

/**
 * Store session data with current active thread
 */
export const updateSessionData = (threadId: string): void => {
  if (!threadId || typeof window === "undefined") return;

  try {
    const sessionData = {
      lastActiveThreadId: threadId,
      lastUpdated: new Date().toISOString(),
    };

    localStorage.setItem(SESSION_CACHE_KEY, JSON.stringify(sessionData));
  } catch (error) {
    console.error("Error updating session data:", error);
  }
};

/**
 * Get the last active thread ID from session data
 */
export const getLastActiveThreadId = (): string | null => {
  if (typeof window === "undefined") return null;

  try {
    const sessionData = localStorage.getItem(SESSION_CACHE_KEY);
    if (!sessionData) return null;

    const parsed = JSON.parse(sessionData);
    return parsed.lastActiveThreadId || null;
  } catch (error) {
    console.error("Error retrieving session data:", error);
    return null;
  }
};

/**
 * Extract learning data from messages and store it
 * This allows the AI to "remember" important information
 * even after the user logs out and messages are cleared
 */
export const extractAndStoreAILearning = (
  threadId: string,
  messages: Message[]
): void => {
  if (!threadId || !messages.length || typeof window === "undefined") return;

  try {
    // Extract key information from messages
    // This is a simplified version - in a real app, you'd use
    // more sophisticated extraction based on message content
    const learningData = {
      threadId,
      messageCount: messages.length,
      topicsDiscussed: extractTopics(messages),
      userPreferences: extractPreferences(messages),
      lastUpdated: new Date().toISOString(),
    };

    // Merge with existing learning data
    const existingDataStr = localStorage.getItem(ASSISTANT_LEARNING_KEY);
    let allLearningData = {};

    if (existingDataStr) {
      try {
        allLearningData = JSON.parse(existingDataStr);
      } catch (e) {
        // Reset if corrupted
        allLearningData = {};
      }
    }

    // Store by thread ID
    allLearningData = {
      ...allLearningData,
      [threadId]: learningData,
    };

    localStorage.setItem(
      ASSISTANT_LEARNING_KEY,
      JSON.stringify(allLearningData)
    );
  } catch (error) {
    console.error("Error extracting learning data:", error);
  }
};

/**
 * Extract topics from messages (simplified example)
 */
const extractTopics = (messages: Message[]): string[] => {
  const topics = new Set<string>();

  // Simple keyword extraction (this would be more sophisticated in a real app)
  const keywordMap: Record<string, string> = {
    calorie: "nutrition",
    protein: "nutrition",
    carbs: "nutrition",
    weight: "weight_management",
    diet: "diet_preferences",
    vegetarian: "diet_preferences",
    vegan: "diet_preferences",
    exercise: "fitness",
    workout: "fitness",
    run: "fitness",
    stress: "mental_health",
    sleep: "sleep",
    water: "hydration",
  };

  messages.forEach((msg) => {
    if (msg.role === "user") {
      const content = msg.content.toLowerCase();

      Object.entries(keywordMap).forEach(([keyword, topic]) => {
        if (content.includes(keyword)) {
          topics.add(topic);
        }
      });
    }
  });

  return Array.from(topics);
};

/**
 * Extract user preferences from messages (simplified example)
 */
const extractPreferences = (messages: Message[]): Record<string, string> => {
  const preferences: Record<string, string> = {};

  // Very simple preference extraction
  // In a real app, this would be much more sophisticated
  messages.forEach((msg) => {
    if (msg.role === "user") {
      const content = msg.content.toLowerCase();

      // Look for explicit preferences
      if (content.includes("i prefer") || content.includes("i like")) {
        preferences["stated_preference"] = content;
      }

      // Look for dietary preferences
      if (content.includes("vegetarian")) {
        preferences["diet"] = "vegetarian";
      } else if (content.includes("vegan")) {
        preferences["diet"] = "vegan";
      }
    }
  });

  return preferences;
};

/**
 * Get AI learning data for a specific thread
 */
export const getAILearningData = (threadId: string): any => {
  if (!threadId || typeof window === "undefined") return null;

  try {
    const learningDataStr = localStorage.getItem(ASSISTANT_LEARNING_KEY);
    if (!learningDataStr) return null;

    const allLearningData = JSON.parse(learningDataStr);
    return allLearningData[threadId] || null;
  } catch (error) {
    console.error("Error retrieving AI learning data:", error);
    return null;
  }
};

/**
 * Clears messages for a specific thread from localStorage.
 */
export const clearMessagesFromCache = (threadId: string): void => {
  if (!threadId || typeof window === "undefined") return;

  try {
    // Before clearing, extract learning data
    const messages = getMessagesFromCache(threadId);
    if (messages && messages.length > 0) {
      extractAndStoreAILearning(threadId, messages);
    }

    localStorage.removeItem(getMessageCacheKey(threadId));
  } catch (error) {
    console.error(
      `Error clearing messages from cache for thread ${threadId}:`,
      error
    );
  }
};

/**
 * Clears ALL chat message caches (for all threads) from localStorage.
 * Enhanced version that aggressively removes all chat-related data.
 * But preserves AI learning data.
 */
export const clearAllMessagesCaches = (): void => {
  if (typeof window === "undefined") return;

  try {
    const beforeCount = localStorage.length;
    console.log(`Before clearing: ${beforeCount} items in localStorage`);

    // First, extract learning data from all message caches
    extractLearningFromAllThreads();

    // Define patterns for chat-related localStorage items
    const chatPatterns = [
      MESSAGE_CACHE_KEY_PREFIX,
      "assistant_",
      "niblet_",
      "thread",
      "message",
      "chat",
    ];

    // Get all keys to remove (except AI learning data)
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;

      // Skip AI learning data
      if (key === ASSISTANT_LEARNING_KEY) continue;

      // Check if key matches any pattern
      if (chatPatterns.some((pattern) => key.includes(pattern))) {
        keysToRemove.push(key);
      }
    }

    // Remove all matched keys
    keysToRemove.forEach((key) => {
      try {
        localStorage.removeItem(key);
        console.log(`Removed: ${key}`);
      } catch (err) {
        console.error(`Failed to remove key: ${key}`, err);
      }
    });

    const afterCount = localStorage.length;
    console.log(`Cleared ${beforeCount - afterCount} items from localStorage`);
    console.log(`Remaining: ${afterCount} items`);

    // List remaining items for debugging
    if (afterCount > 0) {
      console.log("Remaining localStorage items:");
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        console.log(`- ${key}`);
      }
    }
  } catch (error) {
    console.error("Error clearing all message caches:", error);
  }
};

/**
 * Extract learning data from all thread message caches
 */
const extractLearningFromAllThreads = (): void => {
  if (typeof window === "undefined") return;

  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key || !key.startsWith(MESSAGE_CACHE_KEY_PREFIX)) continue;

      // Extract thread ID from the key
      const threadId = key.substring(MESSAGE_CACHE_KEY_PREFIX.length);

      // Get messages and extract learning
      const messages = getMessagesFromCache(threadId);
      if (messages && messages.length > 0) {
        extractAndStoreAILearning(threadId, messages);
      }
    }
  } catch (error) {
    console.error("Error extracting learning from threads:", error);
  }
};

/**
 * A nuclear option to wipe ALL localStorage for the domain.
 * Use with caution as this will clear everything, not just chat data.
 */
export const clearAllStorage = (): void => {
  if (typeof window === "undefined") return;

  try {
    // Log what's being cleared
    console.log(`Clearing all storage: ${localStorage.length} items`);

    // Clear localStorage
    localStorage.clear();

    // Clear sessionStorage too
    sessionStorage.clear();

    console.log("All browser storage cleared");
  } catch (error) {
    console.error("Error clearing all storage:", error);
  }
};

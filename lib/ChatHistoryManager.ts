// lib/ChatHistoryManager.ts - Enhanced message cache clearing

import { Message } from "@/types/chat";

// Prefix for localStorage keys to avoid conflicts
const MESSAGE_CACHE_KEY_PREFIX = "niblet_messages_";

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
  } catch (error) {
    console.error(
      `Error saving messages to cache for thread ${threadId}:`,
      error
    );
  }
};

/**
 * Clears messages for a specific thread from localStorage.
 */
export const clearMessagesFromCache = (threadId: string): void => {
  if (!threadId || typeof window === "undefined") return;

  try {
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
 */
export const clearAllMessagesCaches = (): void => {
  if (typeof window === "undefined") return;

  try {
    const beforeCount = localStorage.length;
    console.log(`Before clearing: ${beforeCount} items in localStorage`);

    // Define patterns for chat-related localStorage items
    const chatPatterns = [
      MESSAGE_CACHE_KEY_PREFIX,
      "assistant_",
      "niblet_",
      "thread",
      "message",
      "chat",
    ];

    // Get all keys to remove
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;

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

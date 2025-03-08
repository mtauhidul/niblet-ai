// lib/ChatHistoryManager.ts
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
 * Clears all chat message caches (for all threads) from localStorage.
 * Typically called only on logout.
 */
export const clearAllMessagesCaches = (): void => {
  if (typeof window === "undefined") return;

  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(MESSAGE_CACHE_KEY_PREFIX)) {
        keysToRemove.push(key);
      }
    }

    keysToRemove.forEach((key) => {
      localStorage.removeItem(key);
    });
    console.log(
      `Cleared ${keysToRemove.length} cached threads from localStorage.`
    );
  } catch (error) {
    console.error("Error clearing all message caches:", error);
  }
};

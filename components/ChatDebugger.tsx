// Add this debugging component to help identify issues:

// components/ChatDebugger.tsx
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";

interface ChatDebuggerProps {
  threadId: string | null;
}

export default function ChatDebugger({ threadId }: ChatDebuggerProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [cacheInfo, setCacheInfo] = useState<any>(null);

  const refreshCacheInfo = () => {
    if (!threadId || typeof window === "undefined") {
      setCacheInfo({ error: "No thread ID available" });
      return;
    }

    try {
      // Get cache info
      const messageKey = `niblet_messages_${threadId}`;
      const timestampKey = `niblet_cache_updated_${threadId}`;

      const cachedData = localStorage.getItem(messageKey);
      const timestamp = localStorage.getItem(timestampKey);

      let messages = null;
      let error = null;

      try {
        if (cachedData) {
          messages = JSON.parse(cachedData);
        }
      } catch (e) {
        error = `Parse error: ${e instanceof Error ? e.message : String(e)}`;
      }

      setCacheInfo({
        threadId,
        messageCount: messages ? messages.length : 0,
        hasCache: !!cachedData,
        cacheSize: cachedData ? cachedData.length : 0,
        lastUpdated: timestamp
          ? new Date(parseInt(timestamp, 10)).toISOString()
          : null,
        error,
        firstMessage:
          messages && messages.length > 0
            ? {
                id: messages[0].id,
                role: messages[0].role,
                contentPreview: messages[0].content.substring(0, 50) + "...",
              }
            : null,
        lastMessage:
          messages && messages.length > 0
            ? {
                id: messages[messages.length - 1].id,
                role: messages[messages.length - 1].role,
                contentPreview:
                  messages[messages.length - 1].content.substring(0, 50) +
                  "...",
              }
            : null,
      });
    } catch (e) {
      setCacheInfo({
        error: `Failed to get cache info: ${
          e instanceof Error ? e.message : String(e)
        }`,
      });
    }
  };

  useEffect(() => {
    if (isExpanded) {
      refreshCacheInfo();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isExpanded, threadId]);

  if (!isExpanded) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsExpanded(true)}
          className="bg-slate-100 dark:bg-slate-800 shadow-md"
        >
          Debug Chat
        </Button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 w-80 bg-white dark:bg-gray-800 rounded-lg shadow-lg border p-4">
      <div className="flex justify-between items-center mb-2">
        <h3 className="font-medium">Chat Debug Info</h3>
        <Button variant="ghost" size="sm" onClick={() => setIsExpanded(false)}>
          ×
        </Button>
      </div>

      <div className="text-xs space-y-2 max-h-60 overflow-auto">
        <div>
          <strong>Thread ID:</strong> {threadId || "Not set"}
        </div>

        {cacheInfo && (
          <>
            <div>
              <strong>Has Cache:</strong> {cacheInfo.hasCache ? "Yes" : "No"}
            </div>
            {cacheInfo.hasCache && (
              <>
                <div>
                  <strong>Message Count:</strong> {cacheInfo.messageCount}
                </div>
                <div>
                  <strong>Cache Size:</strong>{" "}
                  {Math.round(cacheInfo.cacheSize / 1024)}KB
                </div>
                <div>
                  <strong>Last Updated:</strong>{" "}
                  {cacheInfo.lastUpdated || "Unknown"}
                </div>

                {cacheInfo.firstMessage && (
                  <div>
                    <strong>First Message:</strong>
                    <div className="pl-2 border-l-2 border-gray-200 dark:border-gray-700 mt-1">
                      <div>Role: {cacheInfo.firstMessage.role}</div>
                      <div>
                        Content: {cacheInfo.firstMessage.contentPreview}
                      </div>
                    </div>
                  </div>
                )}

                {cacheInfo.lastMessage && (
                  <div>
                    <strong>Last Message:</strong>
                    <div className="pl-2 border-l-2 border-gray-200 dark:border-gray-700 mt-1">
                      <div>Role: {cacheInfo.lastMessage.role}</div>
                      <div>Content: {cacheInfo.lastMessage.contentPreview}</div>
                    </div>
                  </div>
                )}
              </>
            )}

            {cacheInfo.error && (
              <div className="text-red-500">
                <strong>Error:</strong> {cacheInfo.error}
              </div>
            )}
          </>
        )}
      </div>

      <div className="mt-3 flex space-x-2">
        <Button size="sm" onClick={refreshCacheInfo} className="w-full">
          Refresh
        </Button>
        <Button
          size="sm"
          variant="destructive"
          onClick={() => {
            if (threadId) {
              localStorage.removeItem(`niblet_messages_${threadId}`);
              localStorage.removeItem(`niblet_cache_updated_${threadId}`);
              refreshCacheInfo();
            }
          }}
          className="w-full"
        >
          Clear Cache
        </Button>
      </div>
    </div>
  );
}

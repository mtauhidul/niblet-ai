// components/ChatContainer.tsx
"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  addMessageToThread,
  createThread,
  getOrCreateAssistant,
  PersonalityKey,
  runAssistant,
} from "@/lib/assistantService";
import {
  getMessagesFromCache,
  saveMessagesToCache,
} from "@/lib/ChatHistoryManager";
import { createMeal } from "@/lib/firebase/models/meal";
import { createOrUpdateUserProfile } from "@/lib/firebase/models/user";
import { logWeight } from "@/lib/firebase/models/weightLog";
import { cn } from "@/lib/utils";
import { Message } from "@/types/chat";
import { Camera, Mic, MicOff, Phone, Send } from "lucide-react";
import { useSession } from "next-auth/react";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";

interface ChatContainerProps {
  aiPersonality?: PersonalityKey;
  threadId?: string;
  assistantId?: string;
  onMealLogged?: () => void;
  onWeightLogged?: () => void;
  isCalling?: boolean;
  onCall?: () => void;
  /**
   * If we create a new thread, we notify the parent with the new IDs.
   */
  onThreadInitialized?: (threadId: string, assistantId: string) => void;
}

// Helper to fix up text
function formatChatText(text: string): string {
  // Example transformation: ensure "i" is capitalized
  return text.replace(/\b(i)\b/g, "I");
}

const ChatContainer: React.FC<ChatContainerProps> = ({
  aiPersonality = "best-friend",
  threadId: propThreadId,
  assistantId: propAssistantId,
  onMealLogged,
  onWeightLogged,
  isCalling = false,
  onCall,
  onThreadInitialized,
}) => {
  const { data: session } = useSession();

  // Local states for thread and assistant ID
  const [threadId, setThreadId] = useState<string | null>(propThreadId || null);
  const [assistantId, setAssistantId] = useState<string | null>(
    propAssistantId || null
  );

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isRecording, setIsRecording] = useState(false);

  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const messageEndRef = useRef<HTMLDivElement | null>(null);
  const processInProgress = useRef<boolean>(false);

  // If the assistant calls any "tools" like logging a meal, do that here:
  const handleToolCalls = useCallback(
    async (toolName: string, toolArgs: any) => {
      if (!session?.user?.id) {
        return { success: false, message: "User not authenticated" };
      }
      try {
        if (toolName === "log_meal") {
          const mealData = {
            userId: session.user.id,
            name: toolArgs.meal_name,
            calories: toolArgs.calories,
            protein: toolArgs.protein || 0,
            carbs: toolArgs.carbs || 0,
            fat: toolArgs.fat || 0,
            mealType: toolArgs.meal_type,
            items: toolArgs.items || [],
            date: new Date(),
            canEdit: true,
          };
          const meal = await createMeal(mealData);
          onMealLogged?.();
          return {
            success: true,
            mealId: meal.id,
            message: `Logged ${toolArgs.meal_name} (${toolArgs.calories} calories)`,
          };
        } else if (toolName === "log_weight") {
          const weight = await logWeight(
            session.user.id,
            toolArgs.weight,
            toolArgs.date ? new Date(toolArgs.date) : undefined
          );
          // Also update user profile with current weight
          await createOrUpdateUserProfile(session.user.id, {
            currentWeight: toolArgs.weight,
          });
          onWeightLogged?.();
          return {
            success: true,
            weightId: weight.id,
            message: `Logged weight: ${toolArgs.weight} lbs`,
          };
        } else if (toolName === "get_nutrition_info") {
          // Stub
          return {
            success: true,
            message: "Nutrition info retrieved (stubbed).",
          };
        }
        return {
          success: false,
          message: `Unknown tool: ${toolName}`,
        };
      } catch (err) {
        console.error(`Error executing ${toolName}:`, err);
        return {
          success: false,
          message: `Error executing ${toolName}`,
        };
      }
    },
    [session?.user?.id, onMealLogged, onWeightLogged]
  );

  /**
   * Initialization effect:
   * 1. If we have valid `threadId` + `assistantId`, try loading messages from localStorage or from /api/assistant/messages.
   * 2. Otherwise, create a new thread and assistant, store them, and do a welcome message.
   */
  useEffect(() => {
    // Only run once
    if (isInitialized) return;

    const initializeChat = async () => {
      try {
        let currentThreadId = threadId;
        let currentAssistantId = assistantId;

        // If we got IDs from props, ensure we store them in local state
        if (propThreadId && propAssistantId) {
          setThreadId(propThreadId);
          setAssistantId(propAssistantId);
          currentThreadId = propThreadId;
          currentAssistantId = propAssistantId;
        }

        // If we already have a thread, try to load from localStorage
        if (currentThreadId && currentAssistantId) {
          console.log("Using existing thread + assistant IDs:", {
            threadId: currentThreadId,
            assistantId: currentAssistantId,
          });

          // See if localStorage has messages
          const cachedMessages = getMessagesFromCache(currentThreadId);
          if (cachedMessages && cachedMessages.length > 0) {
            console.log(
              "Loaded messages from localStorage:",
              cachedMessages.length
            );
            setMessages(cachedMessages);
            setIsInitialized(true);
            return;
          }

          // If localStorage is empty, fetch from the server
          setIsTyping(true);
          try {
            const resp = await fetch(
              `/api/assistant/messages?threadId=${currentThreadId}`
            );
            if (resp.ok) {
              const data = await resp.json();
              if (Array.isArray(data) && data.length > 0) {
                const fetchedMessages = data.map((msg: any) => ({
                  ...msg,
                  timestamp: new Date(msg.timestamp),
                })) as Message[];
                setMessages(fetchedMessages);
                saveMessagesToCache(currentThreadId, fetchedMessages);
              } else {
                // If no messages exist on the server, it might be a new thread
                // Optionally run the assistant for a greeting if you want
                console.log(
                  "No server messages found; using fallback greeting"
                );
              }
            }
          } catch (err) {
            console.error("Error fetching messages from server:", err);
          } finally {
            setIsTyping(false);
          }
          setIsInitialized(true);
          return;
        }

        // If we do not have a thread yet, create one
        console.log(
          "No existing thread or assistant found. Creating new thread..."
        );
        setIsTyping(true);

        const newThreadId = await createThread();
        if (!newThreadId) throw new Error("Failed to create new thread");
        const newAssistantId = await getOrCreateAssistant(aiPersonality);
        if (!newAssistantId) throw new Error("Failed to create assistant");

        setThreadId(newThreadId);
        setAssistantId(newAssistantId);

        // Notify the parent so it can store these in the user profile if needed
        onThreadInitialized?.(newThreadId, newAssistantId);

        // If user is logged in, store these in Firestore user profile
        if (session?.user?.id) {
          await createOrUpdateUserProfile(session.user.id, {
            threadId: newThreadId,
            assistantId: newAssistantId,
            aiPersonality: aiPersonality,
          });
        }

        // Optionally send a "Hello" to the thread so the assistant can respond
        await addMessageToThread(newThreadId, "Hello");

        // Get the assistant's welcome response
        const assistantMessages = await runAssistant(
          newThreadId,
          newAssistantId,
          aiPersonality,
          handleToolCalls
        );

        if (assistantMessages && assistantMessages.length > 0) {
          const latestMsg = assistantMessages[assistantMessages.length - 1];
          const initialMsgs: Message[] = [
            {
              id: latestMsg.id,
              role: "assistant",
              content: latestMsg.content,
              timestamp: latestMsg.createdAt,
            },
          ];
          setMessages(initialMsgs);
          saveMessagesToCache(newThreadId, initialMsgs);
        } else {
          // Fallback greeting
          const fallbackMsg: Message[] = [
            {
              id: "welcome",
              role: "assistant",
              content: "Hi, I'm Nibble! How can I help you today?",
              timestamp: new Date(),
            },
          ];
          setMessages(fallbackMsg);
          saveMessagesToCache(newThreadId, fallbackMsg);
        }
      } catch (err) {
        console.error("Failed to initialize chat:", err);
        setError(
          "There was a problem connecting to the assistant. Please try again."
        );
      } finally {
        setIsTyping(false);
        setIsInitialized(true);
      }
    };

    initializeChat();
  }, [
    threadId,
    assistantId,
    propThreadId,
    propAssistantId,
    aiPersonality,
    onThreadInitialized,
    session?.user?.id,
    isInitialized,
    handleToolCalls,
  ]);

  // Always scroll to bottom after new messages
  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  // Sending text message
  const handleSendMessage = async () => {
    if (!inputValue.trim() || !threadId || !assistantId || isTyping) return;
    if (processInProgress.current) return;

    processInProgress.current = true;
    setError(null);

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content: formatChatText(inputValue),
      timestamp: new Date(),
    };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    saveMessagesToCache(threadId, updatedMessages);
    setInputValue("");

    try {
      setIsTyping(true);

      // Send to server
      let messageAdded = false;
      let retries = 0;
      while (!messageAdded && retries < 3) {
        try {
          messageAdded = await addMessageToThread(threadId, userMsg.content);
          if (!messageAdded) {
            retries++;
            await new Promise((r) => setTimeout(r, 1000));
          }
        } catch (err) {
          retries++;
          console.error("Error sending message to thread:", err);
          await new Promise((r) => setTimeout(r, 1000));
        }
      }
      if (!messageAdded) {
        throw new Error("Failed to send message after 3 tries");
      }

      // Now get the assistant's response
      const assistantMessages = await runAssistant(
        threadId,
        assistantId,
        aiPersonality,
        handleToolCalls
      );
      if (assistantMessages && assistantMessages.length > 0) {
        const latestMsg = assistantMessages[assistantMessages.length - 1];
        const finalMsg: Message = {
          id: latestMsg.id,
          role: "assistant",
          content: latestMsg.content,
          timestamp: latestMsg.createdAt,
        };
        const finalList = [...updatedMessages, finalMsg];
        setMessages(finalList);
        saveMessagesToCache(threadId, finalList);
      }
    } catch (err) {
      console.error("Failed to process message:", err);
      setError("Sorry, I'm having trouble connecting. Please try again.");
      toast.error("Failed to send message. Please try again.");
    } finally {
      setIsTyping(false);
      processInProgress.current = false;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Simple phone call stub
  const handlePhoneCall = () => {
    onCall?.();
  };

  // Camera icon -> file input
  const handleCameraClick = () => {
    fileInputRef.current?.click();
  };

  // Example image upload
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (processInProgress.current) return;

    processInProgress.current = true;
    setIsUploading(true);
    setUploadError(null);

    try {
      if (!file.type.startsWith("image/")) {
        setUploadError("Please select an image file");
        toast.error("Please select an image file");
        return;
      }
      // 5MB max
      if (file.size > 5 * 1024 * 1024) {
        setUploadError("Image must be less than 5MB");
        toast.error("Image must be less than 5MB");
        return;
      }

      // Upload to your /api/upload-image
      const formData = new FormData();
      formData.append("image", file);
      const response = await fetch("/api/upload-image", {
        method: "POST",
        body: formData,
      });
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.message || "Failed to upload image");
      }
      const data = await response.json();

      // Add the user "image" message to chat
      const userImgMsg: Message = {
        id: `user-${Date.now()}`,
        role: "user",
        content: "", // no text
        timestamp: new Date(),
        imageUrl: data.imageUrl,
      };
      const updatedMessages = [...messages, userImgMsg];
      setMessages(updatedMessages);
      saveMessagesToCache(threadId || "", updatedMessages);

      // Send it to the assistant
      if (threadId && assistantId) {
        setIsTyping(true);
        await addMessageToThread(
          threadId,
          "Analyze this food image. Log the meal directly with your assumptions.",
          data.imageUrl
        );

        const assistantMsgs = await runAssistant(
          threadId,
          assistantId,
          aiPersonality,
          handleToolCalls
        );
        if (assistantMsgs && assistantMsgs.length > 0) {
          const latest = assistantMsgs[assistantMsgs.length - 1];
          const assistantResponse: Message = {
            id: latest.id,
            role: "assistant",
            content: latest.content,
            timestamp: latest.createdAt,
          };
          const finalList = [...updatedMessages, assistantResponse];
          setMessages(finalList);
          saveMessagesToCache(threadId, finalList);
        }
      }
    } catch (err) {
      console.error("Error uploading image:", err);
      setUploadError(
        err instanceof Error
          ? err.message
          : "Failed to upload image. Please try again."
      );
      toast.error("Failed to upload image. Please try again.");
    } finally {
      setIsUploading(false);
      processInProgress.current = false;
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  // For brevity, omitting voice record code. Same logic: add user message, run assistant, save to localStorage.

  return (
    <div className="flex flex-col h-full">
      <input
        type="file"
        accept="image/*"
        className="hidden"
        ref={fileInputRef}
        onChange={handleFileSelect}
      />

      {/* MESSAGES */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {error && (
          <div className="mx-auto bg-red-100 dark:bg-red-900 p-3 rounded-lg text-center">
            {error}
          </div>
        )}
        {uploadError && (
          <div className="mx-auto bg-red-100 dark:bg-red-900 p-3 rounded-lg text-center">
            {uploadError}
          </div>
        )}

        {messages.map((msg) => {
          const isImageOnly = msg.imageUrl && !msg.content;
          if (isImageOnly) {
            return (
              <div
                key={msg.id}
                className={`flex ${
                  msg.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`p-1 rounded-lg overflow-hidden ${
                    msg.role === "user"
                      ? "bg-blue-500"
                      : "bg-gray-200 dark:bg-gray-700"
                  }`}
                >
                  <Image
                    src={msg.imageUrl!}
                    alt="User upload"
                    width={300}
                    height={200}
                    className="rounded-md"
                    style={{ objectFit: "contain" }}
                  />
                </div>
              </div>
            );
          }

          return (
            <div
              key={msg.id}
              className={cn(
                "rounded-lg p-3 max-w-[85%]",
                msg.role === "user"
                  ? "ml-auto bg-blue-500 text-white"
                  : msg.role === "assistant"
                  ? "mr-auto bg-gray-200 dark:bg-gray-700 dark:text-white"
                  : "mx-auto bg-yellow-100 dark:bg-yellow-900 text-center"
              )}
            >
              {msg.role === "assistant" ? (
                <div className="prose dark:prose-invert prose-sm max-w-none">
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                </div>
              ) : (
                <div>{msg.content}</div>
              )}
            </div>
          );
        })}

        {/* "Assistant is typing..." dots */}
        {isTyping && (
          <div className="flex space-x-2 mr-auto bg-gray-200 dark:bg-gray-700 rounded-lg p-3">
            <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"></div>
            <div
              className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"
              style={{ animationDelay: "0.2s" }}
            ></div>
            <div
              className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"
              style={{ animationDelay: "0.4s" }}
            ></div>
          </div>
        )}

        <div ref={messageEndRef} />
      </div>

      {/* INPUT */}
      <div className="p-4 border-t dark:border-gray-800 bg-gray-50 dark:bg-gray-900">
        <div className="flex items-center space-x-2">
          <Button
            size="icon"
            variant="outline"
            onClick={handleCameraClick}
            disabled={isTyping || isUploading || processInProgress.current}
          >
            <Camera
              className={`h-5 w-5 ${isUploading ? "animate-pulse" : ""}`}
            />
          </Button>

          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Message Nibble..."
            className="flex-1"
            disabled={isTyping || isUploading || processInProgress.current}
          />

          <Button
            size="icon"
            variant="outline"
            onClick={handlePhoneCall}
            disabled={isCalling || isTyping || processInProgress.current}
            className={isCalling ? "text-green-500 animate-pulse" : ""}
          >
            <Phone className="h-5 w-5" />
          </Button>

          <Button
            size="icon"
            variant={isRecording ? "destructive" : "outline"}
            onClick={() => {
              // startRecording() / stopRecording() logic here
              setIsRecording(!isRecording);
            }}
            disabled={isTyping || isUploading || processInProgress.current}
          >
            {isRecording ? (
              <MicOff className="h-5 w-5" />
            ) : (
              <Mic className="h-5 w-5" />
            )}
          </Button>

          <Button
            size="icon"
            onClick={handleSendMessage}
            disabled={
              !inputValue.trim() ||
              isTyping ||
              !threadId ||
              !assistantId ||
              isUploading ||
              processInProgress.current
            }
          >
            <Send className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ChatContainer;

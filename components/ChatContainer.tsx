// components/ChatContainer.tsx - Enhanced with better session persistence and bottom-aligned chat
"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  addMessageToThread,
  createThread,
  getOrCreateAssistant,
  PersonalityKey,
  runAssistant,
  runAssistantStreaming,
  transcribeAudio,
} from "@/lib/assistantService";
import {
  extractAndStoreAILearning,
  getMessagesFromCache,
  saveMessagesToCache,
  updateSessionData,
} from "@/lib/ChatHistoryManager";
import { createMeal } from "@/lib/firebase/models/meal";
import { createOrUpdateUserProfile } from "@/lib/firebase/models/user";
import { logWeight } from "@/lib/firebase/models/weightLog";
import runStateManager from "@/lib/runStateManager";
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
  onThreadInitialized?: (threadId: string, assistantId: string) => void;
  preservingSession?: boolean; // New prop to indicate if we're preserving a session
}

// Helper to fix up text
function formatChatText(text: string): string {
  // Ensure "i" is capitalized when it's a standalone word
  const capitalizedText = text.replace(/\b(i)\b/g, "I");

  // Also ensure first letter of sentence is capitalized
  const firstLetterCapitalized = capitalizedText.replace(
    /(^\s*|[.!?]\s+)([a-z])/g,
    (match, p1, p2) => p1 + p2.toUpperCase()
  );

  return firstLetterCapitalized;
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
  preservingSession = false,
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
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);
  const processInProgress = useRef<boolean>(false);
  const initializationAttempted = useRef<boolean>(false);
  const sessionRestored = useRef<boolean>(preservingSession);

  const [streamingMessage, setStreamingMessage] = useState<string | null>(null);

  // If the assistant calls any "tools" like logging a meal, do that here:
  // Enhanced tool handler function for ChatContainer.tsx
  // Replace your existing handleToolCalls function with this one
  const handleToolCalls = useCallback(
    async (toolName: string, toolArgs: any) => {
      if (!session?.user?.id) {
        return { success: false, message: "User not authenticated" };
      }
      try {
        if (toolName === "log_meal") {
          // Enhanced meal data handling - ensure all nutrition values are present
          const protein =
            toolArgs.protein || Math.round((toolArgs.calories * 0.2) / 4); // 20% of calories
          const carbs =
            toolArgs.carbs || Math.round((toolArgs.calories * 0.5) / 4); // 50% of calories
          const fat = toolArgs.fat || Math.round((toolArgs.calories * 0.3) / 9); // 30% of calories

          const mealData = {
            userId: session.user.id,
            name: toolArgs.meal_name,
            calories: toolArgs.calories || 0,
            protein: protein,
            carbs: carbs,
            fat: fat,
            mealType: toolArgs.meal_type || "Other", // Default to "Other" if not provided
            items: toolArgs.items || [],
            date: new Date(),
            canEdit: true,
          };

          // Log full meal information for debugging
          console.log("Logging meal with enhanced nutrition data:", mealData);

          const meal = await createMeal(mealData);

          // Call onMealLogged callback
          onMealLogged?.();

          return {
            success: true,
            mealId: meal.id,
            message: `Logged ${toolArgs.meal_name} (${toolArgs.calories} calories, protein: ${protein}g, carbs: ${carbs}g, fat: ${fat}g)`,
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
          // Return more complete nutrition info
          return {
            success: true,
            message: "Nutrition info retrieved.",
            data: {
              calories: 300,
              protein: 20,
              carbs: 30,
              fat: 10,
            },
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
    // Only run once and prevent re-initialization
    if (isInitialized || initializationAttempted.current || !session?.user?.id)
      return;

    initializationAttempted.current = true;

    const initializeChat = async () => {
      try {
        setIsTyping(true);
        let currentThreadId = threadId;
        let currentAssistantId = assistantId;

        // Use threadId and assistantId from props if provided
        if (propThreadId && propAssistantId) {
          setThreadId(propThreadId);
          setAssistantId(propAssistantId);
          currentThreadId = propThreadId;
          currentAssistantId = propAssistantId;
        }

        // If session should be preserved, attempt to load cached messages
        if (preservingSession && currentThreadId) {
          const cachedMessages = getMessagesFromCache(currentThreadId);
          if (cachedMessages && cachedMessages.length > 0) {
            setMessages(cachedMessages);
            updateSessionData(currentThreadId);
            setIsInitialized(true);
            setIsTyping(false);
            sessionRestored.current = true;
            return;
          }
        }

        // If a thread exists and we're not preserving the session,
        // skip cached messages and create a new thread.
        if (!preservingSession && currentThreadId) {
          console.log("Starting new session; ignoring cached messages");
          // Optionally, you can clear the cache for the old thread here:
          // clearMessagesCache(currentThreadId);
          currentThreadId = null;
          currentAssistantId = null;
        }

        // If no valid thread exists, create a new thread and assistant
        if (!currentThreadId || !currentAssistantId) {
          console.log("Creating new thread and assistant...");
          const newThreadId = await createThread();
          if (!newThreadId) throw new Error("Failed to create new thread");
          const newAssistantId = await getOrCreateAssistant(aiPersonality);
          if (!newAssistantId) throw new Error("Failed to create assistant");

          setThreadId(newThreadId);
          setAssistantId(newAssistantId);
          onThreadInitialized?.(newThreadId, newAssistantId);

          await createOrUpdateUserProfile(session.user.id, {
            threadId: newThreadId,
            assistantId: newAssistantId,
            aiPersonality: aiPersonality,
          });

          // Continue with generating the welcome message...
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
            updateSessionData(newThreadId);
            sessionRestored.current = true;
          } else {
            const fallbackMsg: Message[] = [
              {
                id: "welcome",
                role: "assistant",
                content: "Hi, I'm Niblet! How can I help you today?",
                timestamp: new Date(),
              },
            ];
            setMessages(fallbackMsg);
            saveMessagesToCache(newThreadId, fallbackMsg);
            updateSessionData(newThreadId);
            sessionRestored.current = true;
          }
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
    preservingSession,
  ]);

  // Scroll to bottom after new messages with a slight delay to ensure DOM is updated
  useEffect(() => {
    const scrollToBottom = () => {
      if (messageEndRef.current) {
        messageEndRef.current.scrollIntoView({ behavior: "smooth" });
      }
    };

    const timeoutId = setTimeout(scrollToBottom, 100);
    return () => clearTimeout(timeoutId);
  }, [messages, isTyping]);

  // Add an additional useEffect to ensure initial scroll position is at the bottom:
  useEffect(() => {
    if (messagesContainerRef.current && isInitialized) {
      messagesContainerRef.current.scrollTop =
        messagesContainerRef.current.scrollHeight;
    }
  }, [isInitialized]);

  // Initialize scroll position to the bottom when the component first mounts
  useEffect(() => {
    if (messagesContainerRef.current && isInitialized) {
      messagesContainerRef.current.scrollTop =
        messagesContainerRef.current.scrollHeight;
    }
  }, [isInitialized]);

  // When component unmounts or threadId changes, save learning data
  useEffect(() => {
    // This ensures we save learning data when navigating away
    return () => {
      if (threadId && messages.length > 0) {
        extractAndStoreAILearning(threadId, messages);
      }
    };
  }, [threadId, messages]);

  // Sending text message
  const handleSendMessage = async () => {
    if (!inputValue.trim() || !threadId || !assistantId || isTyping) return;
    if (processInProgress.current) return;

    processInProgress.current = true;
    setError(null);
    setStreamingMessage(null);

    // Check if the message likely contains a meal reference
    const potentialMealPhrases = [
      "ate",
      "had",
      "eating",
      "consumed",
      "having",
      "breakfast",
      "lunch",
      "dinner",
      "snack",
      "meal",
      "food",
      "diet",
      "calories",
      "nutrition",
      "yesterday",
      "today",
      "this morning",
      "last night",
      "restaurant",
    ];

    const lowercaseInput = inputValue.toLowerCase();
    const containsMealReference = potentialMealPhrases.some((phrase) =>
      lowercaseInput.includes(phrase)
    );

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content: formatChatText(inputValue),
      timestamp: new Date(),
    };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    saveMessagesToCache(threadId, updatedMessages);
    updateSessionData(threadId);
    setInputValue("");

    try {
      setIsTyping(true);

      // If the message likely contains a meal, include a subtle hint for the assistant
      let messageToSend = userMsg.content;
      if (containsMealReference) {
        messageToSend = `${userMsg.content} (Note: If this describes a meal, please log it automatically without asking for confirmation)`;
      }

      // Check if there's an active run before sending
      if (threadId && runStateManager.hasActiveRun(threadId)) {
        console.log(
          `Thread ${threadId} has an active run. Waiting for completion...`
        );
        const completed = await runStateManager.waitForRunCompletion(
          threadId,
          10000 // Reduced timeout to 10 seconds for better UX
        );

        if (!completed) {
          // If wait timed out, force reset the run state
          console.log("Run wait timed out, forcing reset");
          runStateManager.setRunInactive(threadId);
        }
      }

      // Now try to send the message
      let messageAdded = false;
      let retries = 0;
      while (!messageAdded && retries < 3) {
        try {
          messageAdded = await addMessageToThread(threadId, messageToSend);
          if (!messageAdded) {
            retries++;
            await new Promise((r) => setTimeout(r, 1000));
          }
        } catch (err) {
          // Check if this is the specific "run is active" error
          if (
            err instanceof Error &&
            err.message.includes("while a run") &&
            err.message.includes("is active")
          ) {
            // Extract the run ID from the error message
            const runIdMatch = err.message.match(/run\s+(\w+)\s+is active/);
            if (runIdMatch && runIdMatch[1]) {
              // Update the run state manager with the active run
              runStateManager.setRunActive(threadId, runIdMatch[1]);
              // Wait for the run to complete
              await runStateManager.waitForRunCompletion(threadId, 5000);
            }
          }
          retries++;
          await new Promise((r) => setTimeout(r, 1000));
        }
      }

      if (!messageAdded) {
        throw new Error("Failed to send message after multiple attempts");
      }

      // Create a temporary message ID for the streaming response
      const tempMessageId = `assistant-${Date.now()}`;

      // Add an empty assistant message that will be updated during streaming
      const initialAssistantMsg: Message = {
        id: tempMessageId,
        role: "assistant",
        content: "", // Empty content initially
        timestamp: new Date(),
        isStreaming: true, // Add this flag to indicate streaming
      };

      const messagesWithInitialResponse = [
        ...updatedMessages,
        initialAssistantMsg,
      ];
      setMessages(messagesWithInitialResponse);

      // Start streaming the assistant's response
      await runAssistantStreaming(
        threadId,
        assistantId,
        aiPersonality,
        ({ text, isComplete }) => {
          // Update the streaming message in state
          setStreamingMessage(text);

          // When complete, finalize the message
          if (isComplete) {
            const finalMsg: Message = {
              id: tempMessageId, // Keep the same ID for continuity
              role: "assistant",
              content: text,
              timestamp: new Date(),
              isStreaming: false, // No longer streaming
            };

            const finalMessages = updatedMessages.concat(finalMsg);
            setMessages(finalMessages);
            saveMessagesToCache(threadId, finalMessages);
            updateSessionData(threadId);

            // Clear the streaming message
            setStreamingMessage(null);

            // Periodically extract and store learning data
            if (finalMessages.length % 5 === 0) {
              extractAndStoreAILearning(threadId, finalMessages);
            }
          }
        },
        handleToolCalls
      );
    } catch (err) {
      console.error("Failed to process message:", err);
      setError("Sorry, I'm having trouble connecting. Please try again.");
      toast.error("Failed to send message. Please try again.");
      setStreamingMessage(null);
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

  // Image upload
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
      updateSessionData(threadId || "");

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
          updateSessionData(threadId);

          // Extract learning from messages with images
          extractAndStoreAILearning(threadId, finalList);
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

  // Voice recording functionality
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      const chunks: BlobPart[] = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.push(e.data);
        }
      };

      recorder.onstop = async () => {
        if (processInProgress.current) return;
        processInProgress.current = true;

        try {
          const audioBlob = new Blob(chunks, { type: "audio/webm" });
          setIsTyping(true);

          // Transcribe audio
          const transcribedText = await transcribeAudio(audioBlob);
          if (!transcribedText) throw new Error("Failed to transcribe audio");

          // Format and set as user message
          const formattedText = formatChatText(transcribedText);
          const userMessage: Message = {
            id: `user-${Date.now()}`,
            role: "user",
            content: formattedText,
            timestamp: new Date(),
          };

          // Update UI with user message
          const updatedMessages = [...messages, userMessage];
          setMessages(updatedMessages);
          saveMessagesToCache(threadId || "", updatedMessages);
          updateSessionData(threadId || "");

          // Process with assistant
          if (!threadId || !assistantId)
            throw new Error("Missing thread or assistant ID");

          // Send to thread
          const messageAdded = await addMessageToThread(
            threadId,
            formattedText
          );
          if (!messageAdded) throw new Error("Failed to send message");

          // Get assistant response
          const assistantMessages = await runAssistant(
            threadId,
            assistantId,
            aiPersonality,
            handleToolCalls
          );

          if (assistantMessages && assistantMessages.length > 0) {
            const latestMsg = assistantMessages[assistantMessages.length - 1];
            const assistantResponse: Message = {
              id: latestMsg.id,
              role: "assistant",
              content: latestMsg.content,
              timestamp: latestMsg.createdAt,
            };
            const finalList = [...updatedMessages, assistantResponse];
            setMessages(finalList);
            saveMessagesToCache(threadId, finalList);
            updateSessionData(threadId);

            // Voice messages should definitely extract learning data
            extractAndStoreAILearning(threadId, finalList);
          }
        } catch (error) {
          console.error("Error processing voice recording:", error);
          setError(
            "Sorry, I couldn't process your voice message. Please try again."
          );
        } finally {
          setIsTyping(false);
          processInProgress.current = false;
        }
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
    } catch (error) {
      console.error("Error starting recording:", error);
      setError(
        "I couldn't access your microphone. Please check your browser permissions."
      );
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop();
      setIsRecording(false);

      // Stop all audio tracks
      if (mediaRecorder.stream) {
        mediaRecorder.stream.getTracks().forEach((track) => track.stop());
      }
    }
  };

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  return (
    <div className="flex flex-col h-full">
      <input
        type="file"
        accept="image/*"
        className="hidden"
        ref={fileInputRef}
        onChange={handleFileSelect}
      />

      {/* MESSAGES - Fixed height container */}
      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto p-4 max-w-3xl mx-auto w-full"
        style={{
          maxHeight: "calc(100vh - 170px)",
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-end", // This ensures messages start from bottom
          border: "1px solid rgba(0, 0, 0, 0.1)", // Light border for Apple-inspired design
          borderRadius: "8px",
        }}
      >
        <div className="space-y-4 w-full">
          {error && (
            <div className="mx-auto bg-red-100 dark:bg-red-900 p-3 rounded-lg text-center">
              {error}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setError(null)}
                className="ml-2"
              >
                Dismiss
              </Button>
            </div>
          )}
          {uploadError && (
            <div className="mx-auto bg-red-100 dark:bg-red-900 p-3 rounded-lg text-center">
              {uploadError}
            </div>
          )}

          {messages
            .filter((msg) => {
              // Filter out system initialization messages
              return !(
                (msg.role === "user" || msg.role === "system") &&
                typeof msg.content === "string" &&
                msg.content.toLowerCase().includes("system: initialize")
              );
            })
            .map((msg) => {
              const isImageOnly = msg.imageUrl && !msg.content;

              // Handle streaming message differently
              if (msg.isStreaming && streamingMessage !== null) {
                // Use the streaming content instead of the message content
                return (
                  <div
                    key={msg.id}
                    className={cn(
                      "rounded-lg p-3 max-w-[85%] mr-auto bg-gray-200 dark:bg-gray-700 dark:text-white"
                    )}
                  >
                    <div className="prose dark:prose-invert prose-sm max-w-none">
                      <ReactMarkdown>{streamingMessage}</ReactMarkdown>
                    </div>
                  </div>
                );
              }

              // Regular non-streaming messages continue as before
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

              // Skip any system messages completely
              if (msg.role === "system") {
                return null;
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
      </div>

      {/* INPUT */}
      <div className="p-4 border-t dark:border-gray-800 bg-gray-50 dark:bg-gray-900">
        <div className="flex items-center space-x-2 max-w-3xl mx-auto">
          <Button
            size="icon"
            variant="outline"
            onClick={handleCameraClick}
            disabled={isTyping || isUploading || processInProgress.current}
            className="rounded-full h-10 w-10 flex items-center justify-center"
          >
            <Camera
              className={`h-5 w-5 ${isUploading ? "animate-pulse" : ""}`}
            />
          </Button>

          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Message Niblet..."
            className="flex-1 rounded-full border-gray-300"
            disabled={isTyping || isUploading || processInProgress.current}
          />

          <Button
            size="icon"
            variant="outline"
            onClick={handlePhoneCall}
            disabled={isTyping || processInProgress.current}
            className="relative rounded-full h-10 w-10 flex items-center justify-center"
          >
            <Phone className="h-5 w-5" />
            {isCalling && (
              <span className="absolute top-0 right-0 w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
            )}
          </Button>

          <Button
            size="icon"
            variant={isRecording ? "destructive" : "outline"}
            onClick={toggleRecording}
            disabled={isTyping || isUploading || processInProgress.current}
            className="rounded-full h-10 w-10 flex items-center justify-center"
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
            className="rounded-full h-10 w-10 flex items-center justify-center"
          >
            <Send className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ChatContainer;

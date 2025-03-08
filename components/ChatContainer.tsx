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
  transcribeAudio,
} from "@/lib/assistantService";
import { createMeal } from "@/lib/firebase/models/meal";
import { createOrUpdateUserProfile } from "@/lib/firebase/models/user";
import { logWeight } from "@/lib/firebase/models/weightLog";
import { cn } from "@/lib/utils";
import { Camera, Mic, MicOff, Phone, Send } from "lucide-react";
import { useSession } from "next-auth/react";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";

interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
  imageUrl?: string;
}

interface ChatContainerProps {
  aiPersonality?: PersonalityKey;
  threadId?: string;
  assistantId?: string;
  onMealLogged?: () => void;
  onWeightLogged?: () => void;
  isCalling?: boolean;
  onCall?: () => void;
}

// Format text utility
export function formatChatText(text: string): string {
  // Ensure 'i' is capitalized when it's a standalone word
  return text.replace(/\b(i)\b/g, "I");
}

const ChatContainer: React.FC<ChatContainerProps> = ({
  aiPersonality = "best-friend",
  threadId: initialThreadId,
  assistantId: initialAssistantId,
  onMealLogged,
  onWeightLogged,
  isCalling = false,
  onCall,
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(
    null
  );
  const [threadId, setThreadId] = useState<string | null>(
    initialThreadId || null
  );
  const [assistantId, setAssistantId] = useState<string | null>(
    initialAssistantId || null
  );
  const [error, setError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Image upload states
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const messageEndRef = useRef<HTMLDivElement | null>(null);
  const { data: session, status } = useSession();

  // Initialize assistant and thread - only once
  useEffect(() => {
    // Skip initialization if already done or if threadId and assistantId already exist
    if (isInitialized || (initialThreadId && initialAssistantId)) {
      setIsInitialized(true);
      loadHistoricalMessages();
      return;
    }

    const initializeChat = async () => {
      try {
        // Only create a new thread if one doesn't exist
        if (!threadId) {
          setIsTyping(true);

          // Create thread
          const newThreadId = await createThread();
          if (!newThreadId) throw new Error("Failed to create thread");

          // Get or create assistant
          const newAssistantId = await getOrCreateAssistant(aiPersonality);
          if (!newAssistantId) throw new Error("Failed to create assistant");

          setThreadId(newThreadId);
          setAssistantId(newAssistantId);

          // Save thread ID to user profile if authenticated
          if (session?.user?.id) {
            await createOrUpdateUserProfile(session.user.id, {
              threadId: newThreadId,
              assistantId: newAssistantId,
              aiPersonality: aiPersonality,
            });
          }

          // Send welcome message and get initial response
          await addMessageToThread(newThreadId, "Hello");

          // Run the assistant to get a welcome message
          const assistantMessages = await runAssistant(
            newThreadId,
            newAssistantId,
            aiPersonality,
            handleToolCalls
          );

          if (assistantMessages && assistantMessages.length > 0) {
            // Only get the most recent message to avoid duplicates
            const latestMessage =
              assistantMessages[assistantMessages.length - 1];

            setMessages([
              {
                id: latestMessage.id,
                role: "assistant",
                content: latestMessage.content,
                timestamp: latestMessage.createdAt,
              },
            ]);
          } else {
            // Fallback welcome message if assistant response fails
            setMessages([
              {
                id: "welcome",
                role: "assistant",
                content:
                  "HI, I'm Nibble! I'll be helping you set up your goal and kick off your calorie-tracking journey. How can I help you today?",
                timestamp: new Date(),
              },
            ]);
          }

          setIsTyping(false);
        } else if (assistantId) {
          loadHistoricalMessages();
        }
      } catch (error) {
        console.error("Failed to initialize chat:", error);
        setError(
          "There was a problem connecting to the assistant. Please try again later."
        );
        setIsTyping(false);
      } finally {
        setIsInitialized(true);
      }
    };

    initializeChat();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    threadId,
    assistantId,
    aiPersonality,
    session?.user?.id,
    initialThreadId,
    initialAssistantId,
    isInitialized,
  ]);

  // Load historical messages
  const loadHistoricalMessages = async () => {
    if (!threadId) return;

    try {
      setIsTyping(true);
      // Fetch historical messages for this thread
      const response = await fetch(
        `/api/assistant/messages?threadId=${threadId}`
      );

      if (response.ok) {
        const historicalMessages = await response.json();
        if (
          Array.isArray(historicalMessages) &&
          historicalMessages.length > 0
        ) {
          setMessages(historicalMessages);
        } else {
          try {
            // If no messages are found, run the assistant to get a greeting
            if (assistantId) {
              const assistantMessages = await runAssistant(
                threadId,
                assistantId,
                aiPersonality,
                handleToolCalls
              );

              if (assistantMessages && assistantMessages.length > 0) {
                const latestMessage =
                  assistantMessages[assistantMessages.length - 1];
                setMessages([
                  {
                    id: latestMessage.id,
                    role: "assistant",
                    content: latestMessage.content,
                    timestamp: latestMessage.createdAt,
                  },
                ]);
              }
            }
          } catch (e) {
            console.error("Error getting initial greeting:", e);
            // Fallback message
            setMessages([
              {
                id: "welcome",
                role: "assistant",
                content:
                  "Welcome back! How can I help with your nutrition today?",
                timestamp: new Date(),
              },
            ]);
          }
        }
      } else {
        console.error("Failed to load chat history");
      }
    } catch (error) {
      console.error("Error loading chat history:", error);
    } finally {
      setIsTyping(false);
    }
  };

  // Handle tool calls from the assistant
  const handleToolCalls = async (toolName: string, toolArgs: any) => {
    if (!session?.user?.id) {
      return { success: false, message: "User not authenticated" };
    }

    try {
      if (toolName === "log_meal") {
        // Create meal in database without confirmation
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
          canEdit: true, // Add flag to allow editing
        };

        const meal = await createMeal(mealData);

        // Trigger callback to update UI
        if (onMealLogged) onMealLogged();

        return {
          success: true,
          mealId: meal.id,
          message: `Logged ${toolArgs.meal_name} (${toolArgs.calories} calories)`,
        };
      } else if (toolName === "log_weight") {
        // Log weight
        const weight = await logWeight(
          session.user.id,
          toolArgs.weight,
          toolArgs.date ? new Date(toolArgs.date) : undefined
        );

        // Update user profile
        await createOrUpdateUserProfile(session.user.id, {
          currentWeight: toolArgs.weight,
        });

        // Trigger callback to update UI
        if (onWeightLogged) onWeightLogged();

        return {
          success: true,
          weightId: weight.id,
          message: `Logged weight: ${toolArgs.weight} lbs`,
        };
      } else if (toolName === "get_nutrition_info") {
        // This would normally call a nutrition database API
        // For the demo, we'll just return a success message
        return {
          success: true,
          message: "Retrieved nutrition information",
          // In a real app, you would return actual nutrition data
        };
      }

      return {
        success: false,
        message: `Unknown tool: ${toolName}`,
      };
    } catch (error) {
      console.error(`Error executing ${toolName}:`, error);
      return {
        success: false,
        message: `Error executing ${toolName}`,
      };
    }
  };

  // Auto scroll to bottom of chat
  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  // Handle file select for image upload
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadError(null);

    try {
      // Validate file type
      if (!file.type.startsWith("image/")) {
        setUploadError("Please select an image file");
        setIsUploading(false);
        return;
      }

      // Validate file size (5MB max)
      const MAX_FILE_SIZE = 5 * 1024 * 1024;
      if (file.size > MAX_FILE_SIZE) {
        setUploadError("Image must be less than 5MB");
        setIsUploading(false);
        return;
      }

      // Create FormData object
      const formData = new FormData();
      formData.append("image", file);

      // Send to API
      const response = await fetch("/api/upload-image", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to upload image");
      }

      const data = await response.json();

      // Add image message to chat
      const userMessage: Message = {
        id: `user-${Date.now()}`,
        role: "user",
        // Empty string instead of "[Image uploaded]"
        content: "",
        timestamp: new Date(),
        imageUrl: data.imageUrl,
      };

      setMessages((prev) => [...prev, userMessage]);

      // If we have thread and assistant IDs, send the image to the assistant
      if (threadId && assistantId) {
        setIsTyping(true);

        // Add image to the thread with instruction to make assumptions
        const messageAdded = await addMessageToThread(
          threadId,
          "Analyze this food image and make reasonable assumptions about its contents. Log it directly without asking for confirmation, clearly stating what you've assumed.",
          data.imageUrl
        );

        if (!messageAdded) {
          throw new Error("Failed to send image to assistant");
        }

        // Run the assistant to get a response about the image
        const assistantMessages = await runAssistant(
          threadId,
          assistantId,
          aiPersonality,
          handleToolCalls
        );

        if (assistantMessages && assistantMessages.length > 0) {
          // Get the latest message
          const latestMessage = assistantMessages[assistantMessages.length - 1];

          // Add assistant's response to messages
          const assistantMessage: Message = {
            id: latestMessage.id,
            role: "assistant",
            content: latestMessage.content,
            timestamp: latestMessage.createdAt,
          };

          setMessages((prev) => [...prev, assistantMessage]);
        }
        setIsTyping(false);
      }
    } catch (error) {
      console.error("Error uploading image:", error);
      setUploadError(
        error instanceof Error
          ? error.message
          : "Failed to upload image. Please try again."
      );
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Trigger file input click
  const handleCameraClick = () => {
    fileInputRef.current?.click();
  };

  // Send message to assistant
  const handleSendMessage = async () => {
    if (!inputValue.trim() || !threadId || !assistantId || isTyping) return;

    // Format text to ensure 'i' is capitalized
    const formattedText = formatChatText(inputValue);

    // Add user message to UI
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content: formattedText,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);

    // Clear input
    setInputValue("");
    setError(null);

    try {
      // Send message to thread
      setIsTyping(true);
      const messageAdded = await addMessageToThread(threadId, formattedText);

      if (!messageAdded) {
        throw new Error("Failed to send message");
      }

      // Run the assistant
      const assistantMessages = await runAssistant(
        threadId,
        assistantId,
        aiPersonality,
        handleToolCalls
      );

      if (assistantMessages && assistantMessages.length > 0) {
        // Get the latest message
        const latestMessage = assistantMessages[assistantMessages.length - 1];

        // Add assistant's response to messages
        const assistantMessage: Message = {
          id: latestMessage.id,
          role: "assistant",
          content: latestMessage.content,
          timestamp: latestMessage.createdAt,
        };

        setMessages((prev) => [...prev, assistantMessage]);
      } else {
        throw new Error("No response received");
      }
    } catch (error) {
      console.error("Failed to send message:", error);
      setError("Sorry, I'm having trouble connecting. Please try again.");
    } finally {
      setIsTyping(false);
    }
  };

  // Handle key press (Enter to send)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Voice recording functions
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
        const audioBlob = new Blob(chunks, { type: "audio/webm" });

        try {
          setIsTyping(true);
          setError(null);

          // Transcribe audio
          const transcribedText = await transcribeAudio(audioBlob);

          if (!transcribedText) {
            throw new Error("Failed to transcribe audio");
          }

          // Format the transcribed text
          const formattedText = formatChatText(transcribedText);

          // Add transcribed text to input
          setInputValue(formattedText);

          // If we have the thread and assistant IDs, automatically send the message
          if (threadId && assistantId) {
            // Add user message to UI
            const userMessage: Message = {
              id: `user-${Date.now()}`,
              role: "user",
              content: formattedText,
              timestamp: new Date(),
            };

            setMessages((prev) => [...prev, userMessage]);

            // Send message to thread
            const messageAdded = await addMessageToThread(
              threadId,
              formattedText
            );

            if (!messageAdded) {
              throw new Error("Failed to send message");
            }

            // Run the assistant
            const assistantMessages = await runAssistant(
              threadId,
              assistantId,
              aiPersonality,
              handleToolCalls
            );

            if (assistantMessages && assistantMessages.length > 0) {
              // Get the latest message
              const latestMessage =
                assistantMessages[assistantMessages.length - 1];

              // Add assistant's response to messages
              const assistantMessage: Message = {
                id: latestMessage.id,
                role: "assistant",
                content: latestMessage.content,
                timestamp: latestMessage.createdAt,
              };

              setMessages((prev) => [...prev, assistantMessage]);

              // Clear input after sending
              setInputValue("");
            }
          }
        } catch (error) {
          console.error("Error processing voice:", error);
          setError(
            "Sorry, I couldn't process your voice message. Please try again."
          );
        } finally {
          setIsTyping(false);
        }
      };

      // Start recording
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

  // Handle phone call
  const handlePhoneCall = () => {
    if (onCall) {
      onCall();
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Hidden file input for image upload */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelect}
        accept="image/*"
        className="hidden"
      />

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Error message */}
        {error && (
          <div className="mx-auto bg-red-100 dark:bg-red-900 p-3 rounded-lg text-center">
            {error}
          </div>
        )}

        {/* Upload error message */}
        {uploadError && (
          <div className="mx-auto bg-red-100 dark:bg-red-900 p-3 rounded-lg text-center">
            {uploadError}
          </div>
        )}

        {/* Display messages */}
        {messages.map((msg) => {
          // Determine if this is an image-only message
          const isImageOnly = msg.imageUrl && !msg.content;

          if (isImageOnly) {
            // Special container just for images
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
                    src={msg.imageUrl || ""}
                    alt="Uploaded content"
                    width={400}
                    height={280}
                    className="rounded-md"
                    style={{
                      objectFit: "contain",
                      maxHeight: "280px",
                      width: "auto",
                      height: "auto",
                    }}
                  />
                </div>
              </div>
            );
          }

          // Regular messages (with or without images)
          return (
            <div
              key={msg.id}
              className={cn(
                "rounded-lg p-3",
                msg.role === "user"
                  ? "ml-auto bg-blue-500 text-white max-w-[85%]"
                  : msg.role === "assistant"
                  ? "mr-auto bg-gray-200 dark:bg-gray-700 dark:text-white max-w-[85%]"
                  : "mx-auto bg-yellow-100 dark:bg-yellow-900 text-center"
              )}
            >
              {/* Regular message content with proper markdown rendering for assistant */}
              {msg.role === "assistant" ? (
                <div className="prose dark:prose-invert prose-sm max-w-none">
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                </div>
              ) : (
                <div>{msg.content}</div>
              )}

              {/* Display image if present in a regular message */}
              {msg.imageUrl && (
                <div className="mt-2">
                  <Image
                    src={msg.imageUrl}
                    alt="Uploaded content"
                    width={500}
                    height={280}
                    className="rounded-md"
                    style={{
                      objectFit: "contain",
                      maxHeight: "280px",
                      width: "auto",
                      height: "auto",
                    }}
                  />
                </div>
              )}
            </div>
          );
        })}

        {/* Loading indicator */}
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

        {/* Invisible element to scroll to */}
        <div ref={messageEndRef} />
      </div>

      {/* Input Area - positioned at the bottom */}
      <div className="p-4 border-t dark:border-gray-800 sticky bottom-0 bg-gray-50 dark:bg-gray-900">
        <div className="flex items-center space-x-2">
          <Button
            size="icon"
            variant="outline"
            onClick={handleCameraClick}
            disabled={isTyping || isUploading}
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
            className="flex-1"
            disabled={isTyping || isUploading}
          />
          <Button
            size="icon"
            variant="outline"
            onClick={handlePhoneCall}
            disabled={isCalling || isTyping}
            className={isCalling ? "text-green-500 animate-pulse" : ""}
          >
            <Phone className="h-5 w-5" />
          </Button>
          <Button
            size="icon"
            variant={isRecording ? "destructive" : "outline"}
            onClick={toggleRecording}
            disabled={isTyping || isUploading}
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
              isUploading
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

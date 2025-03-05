// components/ChatContainer.tsx
"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { updateUserProfile } from "@/lib/auth/authService";
import { cn } from "@/lib/utils";
import { Camera, Mic, MicOff, Send } from "lucide-react";
import { useSession } from "next-auth/react";
import { useEffect, useRef, useState } from "react";

interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
}

interface ChatContainerProps {
  aiPersonality?: string;
  threadId?: string;
  assistantId?: string;
}

const ChatContainer: React.FC<ChatContainerProps> = ({
  aiPersonality = "best-friend",
  threadId: initialThreadId,
  assistantId: initialAssistantId,
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

  const messageEndRef = useRef<HTMLDivElement | null>(null);
  const { data: session } = useSession();

  // Predefined prompts
  const predefinedPrompts = [
    "Log a meal",
    "Estimate calories for a dish",
    "Get a recipe recommendation",
    "Rate your last meal",
    "Plan a meal",
    "Suggest a healthy dinner",
  ];

  // Initialize assistant and thread
  useEffect(() => {
    const initializeChat = async () => {
      try {
        // Create a new thread if one doesn't exist
        if (!threadId) {
          setIsTyping(true);
          const response = await fetch("/api/assistant", { method: "POST" });
          const data = await response.json();
          setThreadId(data.threadId);
          setAssistantId(data.assistantId);

          // Save thread ID to user profile if authenticated
          if (session?.user?.id) {
            await updateUserProfile(session.user.id, {
              threadId: data.threadId,
              assistantId: data.assistantId,
            });
          }

          // Send welcome message
          await fetch("/api/assistant", {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              threadId: data.threadId,
              message: "Hello",
              personality: aiPersonality,
            }),
          });

          // Load welcome message
          const messagesResponse = await fetch(
            `/api/assistant/messages?threadId=${data.threadId}`
          );
          if (messagesResponse.ok) {
            const initialMessages = await messagesResponse.json();
            setMessages(initialMessages);
          }
          setIsTyping(false);
        } else {
          // Load existing messages
          setIsTyping(true);
          const messagesResponse = await fetch(
            `/api/assistant/messages?threadId=${threadId}`
          );
          if (messagesResponse.ok) {
            const initialMessages = await messagesResponse.json();
            setMessages(initialMessages);
          }
          setIsTyping(false);
        }
      } catch (error) {
        console.error("Failed to initialize chat:", error);
        setIsTyping(false);
      }
    };

    initializeChat();
  }, [threadId, aiPersonality, session?.user?.id]);

  // Auto scroll to bottom of chat
  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  // Send message to assistant
  const handleSendMessage = async () => {
    if (!inputValue.trim() || !threadId || isTyping) return;

    // Add user message to UI
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content: inputValue,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);

    // Clear input
    setInputValue("");

    try {
      // Send message to OpenAI thread
      setIsTyping(true);
      const response = await fetch("/api/assistant", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          threadId,
          message: inputValue,
          personality: aiPersonality,
        }),
      });

      const data = await response.json();

      // Add assistant's response to messages
      if (data.response) {
        const assistantMessage: Message = {
          id: data.response.id,
          role: "assistant",
          content: data.response.content,
          timestamp: new Date(data.response.createdAt),
        };
        setMessages((prev) => [...prev, assistantMessage]);
      }
    } catch (error) {
      console.error("Failed to send message:", error);

      // Add error message
      setMessages((prev) => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          role: "system",
          content: "Sorry, I'm having trouble connecting. Please try again.",
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  // Handle key press (Enter to send)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSendMessage();
    }
  };

  // Handle predefined prompt selection
  const handlePromptClick = (prompt: string) => {
    setInputValue(prompt);
  };

  // Voice recording functions
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: BlobPart[] = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.push(e.data);
        }
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(chunks, { type: "audio/webm" });

        // Create FormData to send the audio file
        const formData = new FormData();
        formData.append("audio", audioBlob);

        try {
          setIsTyping(true);

          // Send to Whisper API via our own API route
          const response = await fetch("/api/assistant", {
            method: "PATCH",
            body: formData,
          });

          const data = await response.json();

          if (data.text) {
            setInputValue(data.text);
            // Auto-send the transcribed message
            const userMessage: Message = {
              id: `user-${Date.now()}`,
              role: "user",
              content: data.text,
              timestamp: new Date(),
            };
            setMessages((prev) => [...prev, userMessage]);

            // Send to API
            const assistantResponse = await fetch("/api/assistant", {
              method: "PUT",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                threadId,
                message: data.text,
                personality: aiPersonality,
              }),
            });

            const assistantData = await assistantResponse.json();

            // Add assistant's response to messages
            if (assistantData.response) {
              const assistantMessage: Message = {
                id: assistantData.response.id,
                role: "assistant",
                content: assistantData.response.content,
                timestamp: new Date(assistantData.response.createdAt),
              };
              setMessages((prev) => [...prev, assistantMessage]);
            }
          } else {
            setMessages((prev) => [
              ...prev,
              {
                id: `error-${Date.now()}`,
                role: "system",
                content:
                  "Sorry, I couldn't understand the audio. Please try again.",
                timestamp: new Date(),
              },
            ]);
          }
        } catch (error) {
          console.error("Transcription error:", error);
          setMessages((prev) => [
            ...prev,
            {
              id: `error-${Date.now()}`,
              role: "system",
              content:
                "Sorry, there was an error processing your voice message. Please try again or type your message.",
              timestamp: new Date(),
            },
          ]);
        } finally {
          setIsTyping(false);
          setInputValue(""); // Clear input field after sending
        }
      };

      // Start recording
      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
    } catch (error) {
      console.error("Error starting recording:", error);
      setMessages((prev) => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          role: "system",
          content:
            "Sorry, I couldn't access your microphone. Please check your browser permissions or type your message instead.",
          timestamp: new Date(),
        },
      ]);
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop();
      setIsRecording(false);
      // Stop all audio tracks
      mediaRecorder.stream.getTracks().forEach((track) => track.stop());
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
      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Initial prompt if no messages */}
        {messages.length === 0 && !isTyping && (
          <Card className="p-4">
            <p>
              What would you like to do? Log a meal. Ask me to estimate calories
              for a dish. Get a recipe recommendation.
            </p>
          </Card>
        )}

        {/* Chat messages */}
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={cn(
              "rounded-lg p-3 max-w-[80%]",
              msg.role === "user"
                ? "ml-auto bg-blue-500 text-white"
                : msg.role === "assistant"
                ? "mr-auto bg-gray-200 dark:bg-gray-700 dark:text-white"
                : "mx-auto bg-yellow-100 dark:bg-yellow-900 text-center"
            )}
          >
            {msg.content}
          </div>
        ))}

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

      {/* Quick Prompts */}
      <div className="p-2 overflow-x-auto whitespace-nowrap">
        {predefinedPrompts.map((prompt, index) => (
          <button
            key={index}
            className="inline-block mr-2 px-3 py-1 bg-gray-200 dark:bg-gray-700 rounded-full text-sm"
            onClick={() => handlePromptClick(prompt)}
          >
            {prompt}
          </button>
        ))}
      </div>

      {/* Input Area */}
      <div className="p-4 border-t dark:border-gray-800">
        <div className="flex items-center space-x-2">
          <Button size="icon" variant="outline">
            <Camera className="h-5 w-5" />
          </Button>
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Message Nibble..."
            className="flex-1"
            disabled={isTyping}
          />
          <Button
            size="icon"
            variant={isRecording ? "destructive" : "outline"}
            onClick={toggleRecording}
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
            disabled={!inputValue.trim() || isTyping}
          >
            <Send className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ChatContainer;

/* eslint-disable react-hooks/exhaustive-deps */
"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Camera, MicOff, Phone, Send } from "lucide-react";
import { useEffect, useRef, useState } from "react";

// Utility function to replace the missing cn utility
const cn = (...classes: string[]) => {
  return classes.filter(Boolean).join(" ");
};

// Mock store to simulate the Zustand store functionality
interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
}

const useMockStore = () => {
  const [state, setState] = useState<{
    threadId: string;
    assistantId: string;
    messages: Message[];
    isTyping: boolean;
    aiPersonality: string;
  }>({
    threadId: "mock-thread-123",
    assistantId: "mock-assistant-456",
    messages: [],
    isTyping: false,
    aiPersonality: "best-friend",
  });

  const addMessage = (message: Message) => {
    setState((prev) => ({
      ...prev,
      messages: [...prev.messages, message],
    }));
  };

  const setThreadId = (id: string) => {
    setState((prev) => ({ ...prev, threadId: id }));
  };

  const setAssistantId = (id: string) => {
    setState((prev) => ({ ...prev, assistantId: id }));
  };

  const setIsTyping = (value: boolean) => {
    setState((prev) => ({ ...prev, isTyping: value }));
  };

  return {
    ...state,
    addMessage,
    setThreadId,
    setAssistantId,
    setIsTyping,
  };
};

// Mock AI service functions
const mockAiService = {
  getOrCreateAssistant: async (personality: string) => {
    console.log("Creating assistant with personality:", personality);
    return "mock-assistant-id";
  },
  createThread: async () => {
    return "mock-thread-id";
  },
  addMessageToThread: async (threadId: string, message: string) => {
    console.log(`Adding message to thread ${threadId}:`, message);
    return true;
  },
  runAssistant: async (
    threadId: string,
    assistantId: string,
    personality: string
  ) => {
    console.log(
      `Running assistant ${assistantId} with personality ${personality}`
    );
    // Simulate different responses based on personality
    let response = "I'm Nibble, your meal tracking assistant!";

    if (personality === "professional-coach") {
      response =
        "Hello, I'm your professional nutrition coach. Let's track your nutrition data precisely.";
    } else if (personality === "tough-love") {
      response = "Let's get serious about your nutrition. No excuses today.";
    }

    return [
      {
        id: `assistant-${Date.now()}`,
        content: response,
      },
    ];
  },
  transcribeAudio: async (blob: Blob) => {
    return "This is a simulated transcription of your audio message.";
  },
};

interface ChatContainerProps {
  aiPersonality: string;
}

const ChatContainer: React.FC<ChatContainerProps> = ({
  aiPersonality: propAiPersonality,
}) => {
  // Use the mock store instead of the real Zustand store
  const {
    threadId,
    assistantId,
    messages,
    isTyping,
    aiPersonality,
    addMessage,
    setThreadId,
    setAssistantId,
    setIsTyping,
  } = useMockStore();

  const [inputValue, setInputValue] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(
    null
  );
  const messageEndRef = useRef<HTMLDivElement | null>(null);

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
        // Get or create assistant
        const assistantId = await mockAiService.getOrCreateAssistant(
          propAiPersonality
        );
        setAssistantId(assistantId);

        // Create a new thread if one doesn't exist
        if (!threadId) {
          const newThreadId = await mockAiService.createThread();
          setThreadId(newThreadId);

          // Send welcome message to thread
          await mockAiService.addMessageToThread(newThreadId, "Hello");

          // Run the assistant to get initial response
          setIsTyping(true);
          const responses = await mockAiService.runAssistant(
            newThreadId,
            assistantId,
            aiPersonality
          );

          // Add assistant's response to messages
          if (responses.length > 0) {
            addMessage({
              id: responses[0].id,
              role: "assistant",
              content: responses[0].content,
              timestamp: new Date(),
            });
          }
          setIsTyping(false);
        }
      } catch (error) {
        console.error("Failed to initialize chat:", error);
        setIsTyping(false);
      }
    };

    initializeChat();
  }, [aiPersonality]);

  // Auto scroll to bottom of chat
  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  // Send message to assistant
  const handleSendMessage = async () => {
    if (!inputValue.trim() || !threadId || !assistantId) return;

    // Add user message to UI
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content: inputValue,
      timestamp: new Date(),
    };
    addMessage(userMessage);

    // Clear input
    setInputValue("");

    try {
      // Send message to OpenAI thread
      await mockAiService.addMessageToThread(threadId, inputValue);

      // Run the assistant
      setIsTyping(true);
      const responses = await mockAiService.runAssistant(
        threadId,
        assistantId,
        aiPersonality
      );

      // Add assistant's response to messages
      if (responses.length > 0) {
        addMessage({
          id: responses[0].id,
          role: "assistant",
          content: responses[0].content,
          timestamp: new Date(),
        });
      }
    } catch (error) {
      console.error("Failed to send message:", error);

      // Add error message
      addMessage({
        id: `error-${Date.now()}`,
        role: "system",
        content: "Sorry, I'm having trouble connecting. Please try again.",
        timestamp: new Date(),
      });
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
        try {
          setIsTyping(true);
          const transcript = await mockAiService.transcribeAudio(audioBlob);
          setInputValue(transcript);

          // Auto-send the transcribed message
          if (transcript) {
            // Add user message to UI
            const userMessage: Message = {
              id: `user-${Date.now()}`,
              role: "user",
              content: transcript,
              timestamp: new Date(),
            };
            addMessage(userMessage);

            // Send message to OpenAI thread
            await mockAiService.addMessageToThread(threadId, transcript);

            // Run the assistant
            const responses = await mockAiService.runAssistant(
              threadId,
              assistantId,
              aiPersonality
            );

            // Add assistant's response to messages
            if (responses.length > 0) {
              addMessage({
                id: responses[0].id,
                role: "assistant",
                content: responses[0].content,
                timestamp: new Date(),
              });
            }
          }
        } catch (error) {
          console.error("Transcription error:", error);
          addMessage({
            id: `error-${Date.now()}`,
            role: "system",
            content:
              "Sorry, I couldn't understand the audio. Please try again.",
            timestamp: new Date(),
          });
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
              what would you like to do? Log a meal. Ask me to estimate calories
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
              <Phone className="h-5 w-5" />
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

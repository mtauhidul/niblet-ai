// components/OnboardingChat.tsx (continued)
"use client";

import { Button } from "@/components/ui/button";
import {
  addMessageToThread,
  createThread,
  getOrCreateAssistant,
  runAssistant,
  transcribeAudio,
} from "@/lib/assistantService";
import { createOrUpdateUserProfile } from "@/lib/firebase/models/user";
import { ArrowRight, Mic, MicOff, Send } from "lucide-react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Input } from "./ui/input";
import { Progress } from "./ui/progress";
import { Skeleton } from "./ui/skeleton";

interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
}

interface ExtractedUserData {
  age?: number;
  gender?: string;
  currentWeight?: number;
  targetWeight?: number;
  height?: number;
  activityLevel?: string;
  dietaryPreferences?: string[];
  allergies?: string[];
  goalType?: string;
}

/**
 * OnboardingChat component that guides users through profile setup
 * using a chat-based interface with AI assistance
 */
const OnboardingChat = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(
    null
  );
  const [threadId, setThreadId] = useState<string | null>(null);
  const [assistantId, setAssistantId] = useState<string | null>(null);
  const [isComplete, setIsComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [extractedData, setExtractedData] = useState<ExtractedUserData>({});
  const [onboardingStep, setOnboardingStep] = useState(0);

  const messageEndRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { data: session, status } = useSession();

  // Initialize chat
  useEffect(() => {
    const initializeOnboarding = async () => {
      setIsInitializing(true);
      try {
        // Create thread and assistant for onboarding
        const newThreadId = await createThread();
        if (!newThreadId) throw new Error("Failed to create thread");

        const newAssistantId = await getOrCreateAssistant("professional-coach");
        if (!newAssistantId) throw new Error("Failed to create assistant");

        setThreadId(newThreadId);
        setAssistantId(newAssistantId);

        // Add initial system message to guide the assistant
        await addMessageToThread(
          newThreadId,
          "You are helping a new user set up their profile for a nutrition and health app. " +
            "Ask them about their weight, height, age, activity level, dietary preferences, " +
            "and weight goals. Get as much information as possible in a conversational way. " +
            "If they provide partial information, acknowledge what they've shared and ask for the missing details. " +
            "When you believe you have all the necessary information, indicate that the onboarding is complete."
        );

        // Run the assistant to get a welcome message
        const assistantMessages = await runAssistant(
          newThreadId,
          newAssistantId,
          "professional-coach",
          handleToolCall
        );

        if (assistantMessages && assistantMessages.length > 0) {
          const welcomeMessage =
            assistantMessages[assistantMessages.length - 1];
          setMessages([
            {
              id: welcomeMessage.id,
              role: "assistant",
              content:
                "Can you tell me about yourself and your goals? Weight, height, age, activity level, diet, and weight loss goal is all I need to help!",
              timestamp: welcomeMessage.createdAt,
            },
          ]);
        } else {
          // Fallback welcome message
          setMessages([
            {
              id: "welcome",
              role: "assistant",
              content:
                "Can you tell me about yourself and your goals? Weight, height, age, activity level, diet, and weight loss goal is all I need to help!",
              timestamp: new Date(),
            },
          ]);
        }
      } catch (error) {
        console.error("Failed to initialize onboarding:", error);
        setError(
          "There was a problem setting up your onboarding. Please try again."
        );
      } finally {
        setIsInitializing(false);
      }
    };

    // Only initialize if authenticated
    if (status === "authenticated") {
      initializeOnboarding();
    } else if (status === "unauthenticated") {
      router.push("/auth/signin");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, router]);

  // Process information extraction through the AI assistant
  const handleToolCall = async (toolName: string, toolArgs: any) => {
    if (toolName === "extract_user_data") {
      // Process extracted data
      const newData = {
        ...extractedData,
        ...toolArgs,
      };

      setExtractedData(newData);
      setOnboardingStep(calculateCompletionStep(newData));

      return {
        success: true,
        message: "Data extracted successfully",
        data: newData,
      };
    }

    return {
      success: false,
      message: `Unknown tool: ${toolName}`,
    };
  };

  // Calculate the completion step based on extracted data
  const calculateCompletionStep = (data: ExtractedUserData): number => {
    let step = 0;

    if (data.currentWeight) step++;
    if (data.height) step++;
    if (data.age) step++;
    if (data.activityLevel) step++;
    if (data.goalType || data.targetWeight) step++;

    return Math.min(step, 5);
  };

  // Auto scroll to bottom of chat
  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  // Check for completion keywords in assistant messages
  useEffect(() => {
    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage.role === "assistant") {
        // Check if the message indicates onboarding is complete
        const completionPhrases = [
          "all set",
          "profile is complete",
          "ready to start",
          "completed your profile",
          "ready to begin",
          "got everything i need",
          "that's all i need",
        ];

        const messageText = lastMessage.content.toLowerCase();
        const isOnboardingComplete = completionPhrases.some((phrase) =>
          messageText.includes(phrase)
        );

        if (isOnboardingComplete || onboardingStep >= 5) {
          setIsComplete(true);
        }
      }
    }
  }, [messages, onboardingStep]);

  // Send message to assistant
  const handleSendMessage = async () => {
    if (!inputValue.trim() || !threadId || !assistantId || isTyping) return;

    // Add user message to UI
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content: inputValue,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setError(null);

    try {
      // Send message to thread
      setIsTyping(true);
      const messageAdded = await addMessageToThread(threadId, inputValue);

      if (!messageAdded) {
        throw new Error("Failed to send message");
      }

      // Run the assistant to get a response
      const assistantMessages = await runAssistant(
        threadId,
        assistantId,
        "professional-coach",
        handleToolCall
      );

      if (assistantMessages && assistantMessages.length > 0) {
        // Get the latest message
        const latestMessage = assistantMessages[assistantMessages.length - 1];

        // Add assistant's response to UI
        const assistantMessage: Message = {
          id: latestMessage.id,
          role: "assistant",
          content: latestMessage.content,
          timestamp: latestMessage.createdAt,
        };

        setMessages((prev) => [...prev, assistantMessage]);

        // Extract data from the message for progress tracking
        extractDataFromMessages([...messages, userMessage, assistantMessage]);
      }
    } catch (error) {
      console.error("Failed to send message:", error);
      setError("There was an error processing your message. Please try again.");
    } finally {
      setIsTyping(false);
    }
  };

  // Extract data from messages to track completion
  const extractDataFromMessages = (msgs: Message[]) => {
    const allText = msgs.map((msg) => msg.content).join(" ");
    const data: ExtractedUserData = {};

    // Extract weight
    const weightMatch = allText.match(
      /(\d+\.?\d*)\s*(kg|kilograms|pounds|lbs)/i
    );
    if (weightMatch) {
      data.currentWeight = parseFloat(weightMatch[1]);
    }

    // Extract height
    const heightMatch = allText.match(
      /(\d+\.?\d*)\s*(cm|centimeters|meters|m|feet|ft|foot|inches|in|'|")/i
    );
    if (heightMatch) {
      data.height = parseFloat(heightMatch[1]);
    }

    // Extract age
    const ageMatch = allText.match(/(\d+)\s*(years|year|yr|y.o.|years old)/i);
    if (ageMatch) {
      data.age = parseInt(ageMatch[1]);
    }

    // Extract activity level
    const activityLevels = [
      "sedentary",
      "lightly active",
      "moderately active",
      "very active",
      "extremely active",
    ];
    for (const level of activityLevels) {
      if (allText.toLowerCase().includes(level)) {
        data.activityLevel = level;
        break;
      }
    }

    // Extract goal type
    const goals = [
      "weight loss",
      "lose weight",
      "weight gain",
      "gain weight",
      "muscle gain",
      "maintenance",
      "maintain weight",
    ];
    for (const goal of goals) {
      if (allText.toLowerCase().includes(goal)) {
        data.goalType = goal;
        break;
      }
    }

    // Update extracted data
    setExtractedData((prev) => {
      const updated = { ...prev, ...data };
      setOnboardingStep(calculateCompletionStep(updated));
      return updated;
    });
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

          // Show transcribed text in input
          setInputValue(transcribedText);

          // If we have the thread and assistant IDs, automatically send the message
          if (threadId && assistantId) {
            // Add user message to UI
            const userMessage: Message = {
              id: `user-${Date.now()}`,
              role: "user",
              content: transcribedText,
              timestamp: new Date(),
            };

            setMessages((prev) => [...prev, userMessage]);
            setInputValue("");

            // Send message to thread
            const messageAdded = await addMessageToThread(
              threadId,
              transcribedText
            );

            if (!messageAdded) {
              throw new Error("Failed to send message");
            }

            // Run the assistant to get a response
            const assistantMessages = await runAssistant(
              threadId,
              assistantId,
              "professional-coach",
              handleToolCall
            );

            if (assistantMessages && assistantMessages.length > 0) {
              // Get the latest message
              const latestMessage =
                assistantMessages[assistantMessages.length - 1];

              // Add assistant's response to UI
              const assistantMessage: Message = {
                id: latestMessage.id,
                role: "assistant",
                content: latestMessage.content,
                timestamp: latestMessage.createdAt,
              };

              setMessages((prev) => [...prev, assistantMessage]);

              // Extract data from the message for progress tracking
              extractDataFromMessages([
                ...messages,
                userMessage,
                assistantMessage,
              ]);
            }
          }
        } catch (error) {
          console.error("Error processing voice:", error);
          setError("I couldn't process your voice message. Please try again.");
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

  // Complete onboarding and go to dashboard
  const completeOnboarding = async () => {
    if (!session?.user?.id || !threadId || !assistantId) return;

    try {
      // Update user profile with onboarding data
      await createOrUpdateUserProfile(session.user.id, {
        onboardingCompleted: true,
        threadId: threadId,
        assistantId: assistantId,
        ...extractedData,
      });

      // Navigate to dashboard
      router.push("/dashboard");
    } catch (error) {
      console.error("Error completing onboarding:", error);
      setError("There was a problem saving your profile. Please try again.");
    }
  };

  // Show loading state while initializing
  if (isInitializing) {
    return (
      <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-900">
        <header className="p-4 border-b dark:border-gray-800 flex justify-center items-center">
          <div className="text-2xl font-bold">
            niblet<span className="text-blue-400">.ai</span>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <Skeleton className="h-20 w-3/4" />
          <Skeleton className="h-16 w-2/3 ml-auto" />
          <Skeleton className="h-20 w-3/4" />
        </div>

        <div className="p-4 border-t dark:border-gray-800">
          <Skeleton className="h-10 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="p-4 border-b dark:border-gray-800 flex justify-center items-center">
        <div className="text-2xl font-bold">
          niblet<span className="text-blue-400">.ai</span>
        </div>
      </header>

      {/* Progress Indicator */}
      <div className="px-4 pt-2">
        <div className="flex justify-between text-sm text-gray-500 mb-1">
          <span>Onboarding Progress</span>
          <span>{onboardingStep}/5 completed</span>
        </div>
        <Progress value={(onboardingStep / 5) * 100} className="h-2" />
      </div>

      {/* Chat Container */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Error message */}
        {error && (
          <div className="mx-auto bg-red-100 dark:bg-red-900 p-3 rounded-lg text-center">
            {error}
          </div>
        )}

        {/* Chat messages */}
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`rounded-lg p-3 max-w-[80%] ${
              msg.role === "user"
                ? "ml-auto bg-blue-500 text-white"
                : msg.role === "assistant"
                ? "mr-auto bg-gray-200 dark:bg-gray-700 dark:text-white"
                : "mx-auto bg-yellow-100 dark:bg-yellow-900 text-center"
            }`}
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

      {/* Input Area or Complete Button */}
      <div className="p-4 border-t dark:border-gray-800">
        {isComplete ? (
          <Button
            onClick={completeOnboarding}
            className="w-full bg-blue-500 hover:bg-blue-600 text-white"
          >
            Start Using Niblet <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        ) : (
          <div className="flex items-center space-x-2">
            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type your response..."
              className="flex-1"
              disabled={isTyping}
            />
            <Button
              size="icon"
              variant={isRecording ? "destructive" : "outline"}
              onClick={toggleRecording}
              disabled={isTyping}
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
                !inputValue.trim() || isTyping || !threadId || !assistantId
              }
            >
              <Send className="h-5 w-5" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default OnboardingChat;

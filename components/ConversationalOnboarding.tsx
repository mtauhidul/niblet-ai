// components/ConversationalOnboarding.tsx
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
import { Mic, MicOff, Send } from "lucide-react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { formatChatText } from "./ChatContainer";
import { Input } from "./ui/input";
import { Progress } from "./ui/progress";

interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
}

interface ExtractedUserData {
  name?: string;
  age?: number | null;
  gender?: string | null;
  currentWeight?: number | null;
  targetWeight?: number | null;
  height?: number | null;
  activityLevel?: string | null;
  dietaryPreferences?: string[] | null;
  allergies?: string[] | null;
  goalType?: string | null;
  targetDate?: string | null;
}

/**
 * ConversationalOnboarding component that guides users through profile setup
 * using a chat-based interface with AI assistance
 */
const ConversationalOnboarding = () => {
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

        // Add initial system message to guide the assistant with the specific flow
        await addMessageToThread(
          newThreadId,
          "You are helping a new user set up their profile for a nutrition and health app. " +
            "Start by greeting the user with 'Hi, I'm Nibble! I'll be helping you set up your goal and kick off your calorie-tracking journey. First, what's your name?' " +
            "Then follow this exact sequence: " +
            "1. After they provide their name, say 'Nice to meet you, [Name]! What's your current weight?' " +
            "2. After weight, ask 'Great! Now, could you tell me your height and age?' If they provide only one, ask for the missing value. " +
            "3. Then ask 'Tell me about your daily activity. Do you exercise regularly or have a more sedentary routine?' " +
            "4. Next, ask 'Do you follow any particular diet or have specific dietary preferences?' " +
            "5. Finally, ask 'What's your weight loss goal and by what date would you like to reach that goal?' If they provide only one, ask for the missing value. " +
            "Once all information is collected, inform them you're setting up their profile and thank them for the information."
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
              content: welcomeMessage.content,
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
                "Hi, I'm Nibble! I'll be helping you set up your goal and kick off your calorie-tracking journey. First, what's your name?",
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

    if (data.name) step++;
    if (data.currentWeight) step++;
    if (data.height && data.age) step++;
    if (data.activityLevel) step++;
    if (data.dietaryPreferences) step++;
    if (data.targetWeight && data.targetDate) step++;

    return Math.min(step, 6);
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
          "setting up your profile",
        ];

        const messageText = lastMessage.content.toLowerCase();
        const isOnboardingComplete = completionPhrases.some((phrase) =>
          messageText.includes(phrase)
        );

        if (isOnboardingComplete || onboardingStep >= 6) {
          setIsComplete(true);
        }
      }
    }
  }, [messages, onboardingStep]);

  // When onboarding is complete, save data and redirect to dashboard
  useEffect(() => {
    if (isComplete && threadId && session?.user?.id) {
      const completeOnboarding = async () => {
        try {
          // Save all the onboarding data to user profile
          await createOrUpdateUserProfile(session.user.id, {
            onboardingThreadId: threadId,
            onboardingCompleted: true,
            name: extractedData.name,
            age: extractedData.age || undefined,
            gender: extractedData.gender || undefined,
            currentWeight: extractedData.currentWeight || undefined,
            targetWeight: extractedData.targetWeight || undefined,
            height: extractedData.height || undefined,
            activityLevel: extractedData.activityLevel || undefined,
            dietaryPreferences: extractedData.dietaryPreferences || undefined,
            goalType: extractedData.targetWeight ? "Weight Loss" : undefined,
          });

          // Wait a moment to show the final message
          setTimeout(() => {
            // Redirect to dashboard
            router.push("/dashboard");
          }, 2000);
        } catch (error) {
          console.error("Error completing onboarding:", error);
          setError(
            "There was a problem saving your profile. Please try again."
          );
        }
      };

      completeOnboarding();
    }
  }, [isComplete, threadId, session?.user?.id, router, extractedData]);

  // Send message to assistant
  const handleSendMessage = async () => {
    if (!inputValue.trim() || !threadId || !assistantId || isTyping) return;

    // Format the input text
    const formattedText = formatChatText(inputValue);

    // Add user message to UI
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content: formattedText,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setError(null);

    try {
      // Send message to thread
      setIsTyping(true);
      const messageAdded = await addMessageToThread(threadId, formattedText);

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

    // Extract name - typically would be in the first user response
    const nameMatch = allText.match(
      /my name is ([A-Za-z]+)|i'm ([A-Za-z]+)|i am ([A-Za-z]+)/i
    );
    if (nameMatch) {
      data.name = nameMatch[1] || nameMatch[2] || nameMatch[3];
    }

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

    // Extract dietary preferences
    const diets = [
      "vegetarian",
      "vegan",
      "pescatarian",
      "keto",
      "paleo",
      "mediterranean",
      "gluten-free",
      "dairy-free",
    ];
    const dietPreferences = [];
    for (const diet of diets) {
      if (allText.toLowerCase().includes(diet)) {
        dietPreferences.push(diet);
      }
    }
    if (dietPreferences.length > 0) {
      data.dietaryPreferences = dietPreferences;
    }

    // Extract target weight
    const targetWeightMatch = allText.match(
      /target weight .*?(\d+\.?\d*)|goal .*?(\d+\.?\d*)\s*(kg|kilograms|pounds|lbs)|reach .*?(\d+\.?\d*)\s*(kg|kilograms|pounds|lbs)|get down to .*?(\d+\.?\d*)\s*(kg|kilograms|pounds|lbs)/i
    );
    if (targetWeightMatch) {
      const matchGroups = targetWeightMatch.filter(
        (group) => group !== undefined
      );
      for (const group of matchGroups) {
        if (!isNaN(parseFloat(group))) {
          data.targetWeight = parseFloat(group);
          break;
        }
      }
    }

    // Extract target date
    const dateRegex =
      /by\s+(jan|january|feb|february|mar|march|apr|april|may|jun|june|jul|july|aug|august|sep|september|oct|october|nov|november|dec|december)\s+(\d{1,2})(?:st|nd|rd|th)?(?:\s*,\s*(\d{4}))?|by\s+(\d{1,2})(?:st|nd|rd|th)?\s+(jan|january|feb|february|mar|march|apr|april|may|jun|june|jul|july|aug|august|sep|september|oct|october|nov|november|dec|december)(?:\s*,\s*(\d{4}))?|in\s+(\d+)\s+(days|weeks|months|years)/i;

    const dateMatch = allText.match(dateRegex);
    if (dateMatch) {
      // Just store the raw match for now, we can process it more precisely if needed
      data.targetDate = dateMatch[0];
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

          // Apply formatting to ensure 'i' is capitalized
          const formattedText = formatChatText(transcribedText);

          // Show transcribed text in input
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
            setInputValue("");

            // Send message to thread
            const messageAdded = await addMessageToThread(
              threadId,
              formattedText
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

  // Prevent hydration errors by not rendering until mounted
  useEffect(() => {
    // Mounted is already handled by the auth check
  }, []);

  if (isInitializing) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-300">
            Getting your onboarding ready...
          </p>
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
          <span>{onboardingStep}/6 completed</span>
        </div>
        <Progress value={(onboardingStep / 6) * 100} className="h-2" />
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
          <div className="text-center p-4">
            <div className="w-16 h-16 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="mb-4 text-lg font-semibold">
              Setting up your profile...
            </p>
            <p className="text-gray-500 dark:text-gray-400">
              You'll be redirected to your dashboard in a moment
            </p>
          </div>
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

export default ConversationalOnboarding;

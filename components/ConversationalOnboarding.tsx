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
import { formatChatText } from "@/lib/utils";
import { Mic, MicOff, Send } from "lucide-react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
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
  startingWeight?: number | null;
  targetWeight?: number | null;
  height?: number | null;
  activityLevel?: string | null;
  dietaryPreferences?: string[] | null;
  allergies?: string[] | null;
  goalType?: string | null;
  targetDate?: string | null;
}

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
  const [isProfileSaving, setIsProfileSaving] = useState(false); // New state to prevent double saving

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

        // Add initial system message with the exact script from requirements
        await addMessageToThread(
          newThreadId,
          "You are helping a new user set up their profile for a nutrition and health app. " +
            "Start by greeting the user with 'Hi, I'm niblet! I'll be helping you set up your goal and kick off your calorie-tracking journey. First, what's your name?' " +
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
          // Fallback welcome message that matches the script
          setMessages([
            {
              id: "welcome",
              role: "assistant",
              content:
                "Hi, I'm niblet! I'll be helping you set up your goal and kick off your calorie-tracking journey. First, what's your name?",
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

  // When onboarding is complete, save data and redirect to dashboard
  useEffect(() => {
    if (isComplete && threadId && session?.user?.id && !isProfileSaving) {
      const completeOnboarding = async () => {
        setIsProfileSaving(true); // Prevent duplicate calls
        try {
          console.log(
            "Starting onboarding completion with data:",
            extractedData
          );

          // Calculate target calories based on profile data
          let targetCalories = 0;

          if (
            extractedData.startingWeight &&
            extractedData.height &&
            extractedData.age
          ) {
            // Simple BMR calculation based on weight (in lbs), height (in inches), and age
            // Using a modified Harris-Benedict equation
            const weight = extractedData.startingWeight;
            const height = extractedData.height;
            const age = extractedData.age;

            // Base BMR calculation (very simplified)
            const bmr =
              10 * (weight * 0.453592) + 6.25 * (height * 2.54) - 5 * age;

            // Activity multiplier
            let activityMultiplier = 1.2; // Default sedentary
            if (extractedData.activityLevel) {
              const level = extractedData.activityLevel.toLowerCase();
              if (level.includes("lightly active")) activityMultiplier = 1.375;
              else if (level.includes("moderately active"))
                activityMultiplier = 1.55;
              else if (level.includes("very active"))
                activityMultiplier = 1.725;
              else if (level.includes("extremely active"))
                activityMultiplier = 1.9;
            }

            // Adjust for weight goal
            targetCalories = Math.round(bmr * activityMultiplier);

            // If weight loss goal, create a moderate deficit
            if (
              extractedData.targetWeight &&
              extractedData.targetWeight < extractedData.startingWeight
            ) {
              targetCalories -= 500; // Standard deficit for ~1lb/week loss
            }
          } else {
            // Default if we can't calculate
            targetCalories = 2000;
          }

          // Calculate macros based on target calories
          const targetProtein = Math.round((targetCalories * 0.3) / 4); // 30% protein
          const targetFat = Math.round((targetCalories * 0.3) / 9); // 30% fat
          const targetCarbs = Math.round((targetCalories * 0.4) / 4); // 40% carbs

          // Create a new thread for the main chat (separate from onboarding)
          const mainThreadId = await createThread();
          if (!mainThreadId) throw new Error("Failed to create main thread");

          const mainAssistantId = await getOrCreateAssistant("best-friend");
          if (!mainAssistantId)
            throw new Error("Failed to create main assistant");

          // Format target date if it exists
          let formattedTargetDate = null;
          if (extractedData.targetDate) {
            try {
              // Convert descriptive date to a proper date
              if (extractedData.targetDate.includes("in")) {
                // Handle "in X weeks/months/years" format
                const matches = /in\s+(\d+)\s+(days|weeks|months|years)/i.exec(
                  extractedData.targetDate
                );
                if (matches && matches.length >= 3) {
                  const amount = parseInt(matches[1]);
                  const unit = matches[2].toLowerCase();

                  const now = new Date();
                  if (unit === "days") {
                    now.setDate(now.getDate() + amount);
                  } else if (unit === "weeks") {
                    now.setDate(now.getDate() + amount * 7);
                  } else if (unit === "months") {
                    now.setMonth(now.getMonth() + amount);
                  } else if (unit === "years") {
                    now.setFullYear(now.getFullYear() + amount);
                  }

                  formattedTargetDate = now.toISOString();
                }
              } else {
                // Try to parse other date formats
                const date = new Date(extractedData.targetDate);
                if (!isNaN(date.getTime())) {
                  formattedTargetDate = date.toISOString();
                }
              }
            } catch (error) {
              console.error("Error parsing target date:", error);
              // Keep the original string if parsing fails
              formattedTargetDate = extractedData.targetDate;
            }
          }

          // Save all the onboarding data to user profile
          const profileData: Record<string, any> = {
            onboardingThreadId: threadId,
            onboardingCompleted: true,
            threadId: mainThreadId, // Set the main thread ID
            assistantId: mainAssistantId, // Set the main assistant ID
            aiPersonality: "best-friend", // Start with best-friend personality
            targetCalories: targetCalories,
            targetProtein: targetProtein,
            targetCarbs: targetCarbs,
            targetFat: targetFat,
          };

          // Only add fields that have actual values
          if (extractedData.name) profileData.name = extractedData.name;
          if (extractedData.age !== null && extractedData.age !== undefined)
            profileData.age = extractedData.age;
          if (extractedData.gender) profileData.gender = extractedData.gender;
          if (
            extractedData.startingWeight !== null &&
            extractedData.startingWeight !== undefined
          )
            profileData.startingWeight = extractedData.startingWeight;
          if (
            extractedData.targetWeight !== null &&
            extractedData.targetWeight !== undefined
          )
            profileData.targetWeight = extractedData.targetWeight;
          if (
            extractedData.height !== null &&
            extractedData.height !== undefined
          )
            profileData.height = extractedData.height;
          if (extractedData.activityLevel)
            profileData.activityLevel = extractedData.activityLevel;
          if (
            extractedData.dietaryPreferences &&
            extractedData.dietaryPreferences.length > 0
          )
            profileData.dietaryPreferences = extractedData.dietaryPreferences;
          if (formattedTargetDate) profileData.targetDate = formattedTargetDate;

          // Set goal type only if there's a target weight
          if (extractedData.targetWeight) profileData.goalType = "Weight Loss";

          console.log("Saving profile data:", profileData);

          // Now send only the fields with actual values to Firestore
          if (session?.user?.id) {
            await createOrUpdateUserProfile(session.user.id, profileData);
          } else {
            throw new Error("User ID is not available");
          }

          console.log("Profile successfully saved!");

          // Initialize the main chat thread with a welcome and prompt for first meal
          await addMessageToThread(
            mainThreadId,
            `System: Initialize with this user info: 
          Name: ${extractedData.name || "User"}, 
          Current Weight: ${extractedData.startingWeight || "Not provided"}, 
          Target Weight: ${extractedData.targetWeight || "Not provided"}, 
          Height: ${extractedData.height || "Not provided"}, 
          Age: ${extractedData.age || "Not provided"},
          Activity Level: ${extractedData.activityLevel || "Not provided"},
          Dietary Preferences: ${
            extractedData.dietaryPreferences
              ? extractedData.dietaryPreferences.join(", ")
              : "None"
          }.
          
          Welcome them to the app and ask them what they've eaten today so you can log their first meal. Be brief and friendly.`
          );

          // Run the assistant once to generate the welcome message
          await runAssistant(
            mainThreadId,
            mainAssistantId,
            "best-friend",
            async () => {
              return { success: true, message: "Initial setup complete" };
            }
          );

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
          setIsProfileSaving(false); // Reset if there's an error
        }
      };

      completeOnboarding();
    }
  }, [
    isComplete,
    threadId,
    session?.user?.id,
    router,
    extractedData,
    isProfileSaving,
  ]);

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
    if (data.startingWeight) step++;
    if (data.height && data.age) step++;
    if (data.activityLevel) step++;
    if (data.dietaryPreferences) step++;
    if (data.targetWeight) step++; // Modified to only require targetWeight

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

    // Extract name - improved to handle more patterns
    const nameMatch = allText.match(
      /my name is ([A-Za-z]+)|i'm ([A-Za-z]+)|i am ([A-Za-z]+)|name:? ([A-Za-z]+)/i
    );
    if (nameMatch) {
      // Find the first non-undefined capture group
      for (let i = 1; i < nameMatch.length; i++) {
        if (nameMatch[i]) {
          data.name = nameMatch[i];
          break;
        }
      }
    }

    // Extract weight with improved pattern matching
    const weightMatch = allText.match(
      /(\d+\.?\d*)\s*(kg|kilograms|pounds|lbs)|weight:?\s*(\d+\.?\d*)|weigh\s*(\d+\.?\d*)|current weight:?\s*(\d+\.?\d*)/i
    );
    if (weightMatch) {
      // Find first non-undefined number in capture groups
      for (let i = 1; i < weightMatch.length; i++) {
        if (weightMatch[i] && !isNaN(parseFloat(weightMatch[i]))) {
          data.startingWeight = parseFloat(weightMatch[i]);
          break;
        }
      }
    }

    // Extract height with improved pattern
    const heightMatch = allText.match(
      /(\d+\.?\d*)\s*(cm|centimeters|meters|m|feet|ft|foot|inches|in|'|")|height:?\s*(\d+\.?\d*)|tall:?\s*(\d+\.?\d*)/i
    );
    if (heightMatch) {
      // Find first non-undefined number in capture groups
      for (let i = 1; i < heightMatch.length; i++) {
        if (heightMatch[i] && !isNaN(parseFloat(heightMatch[i]))) {
          data.height = parseFloat(heightMatch[i]);
          break;
        }
      }
    }

    // Extract age with improved pattern
    const ageMatch = allText.match(
      /(\d+)\s*(years|year|yr|y\.o\.|years old)|age:?\s*(\d+)|i'm\s*(\d+)\s*(years|year|yr)/i
    );
    if (ageMatch) {
      // Find first non-undefined number in capture groups
      for (let i = 1; i < ageMatch.length; i++) {
        if (ageMatch[i] && !isNaN(parseInt(ageMatch[i]))) {
          data.age = parseInt(ageMatch[i]);
          break;
        }
      }
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
      "omnivore",
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

    // Extract target weight with improved pattern
    const targetWeightMatch = allText.match(
      /target weight:?\s*(\d+\.?\d*)|goal:?\s*(\d+\.?\d*)\s*(kg|kilograms|pounds|lbs)|reach:?\s*(\d+\.?\d*)|get down to:?\s*(\d+\.?\d*)|lose weight to:?\s*(\d+\.?\d*)|goal weight:?\s*(\d+\.?\d*)/i
    );
    if (targetWeightMatch) {
      // Find first non-undefined number in capture groups
      for (let i = 1; i < targetWeightMatch.length; i++) {
        if (targetWeightMatch[i] && !isNaN(parseFloat(targetWeightMatch[i]))) {
          data.targetWeight = parseFloat(targetWeightMatch[i]);
          break;
        }
      }
    }

    // Extract target date with expanded patterns
    const dateRegex =
      /by\s+(jan|january|feb|february|mar|march|apr|april|may|jun|june|jul|july|aug|august|sep|september|oct|october|nov|november|dec|december)\s+(\d{1,2})(?:st|nd|rd|th)?(?:\s*,\s*(\d{4}))?|by\s+(\d{1,2})(?:st|nd|rd|th)?\s+(jan|january|feb|february|mar|march|apr|april|may|jun|june|jul|july|aug|august|sep|september|oct|october|nov|november|dec|december)(?:\s*,\s*(\d{4}))?|in\s+(\d+)\s+(days|weeks|months|years)|by\s+([a-zA-Z]+)/i;

    const dateMatch = allText.match(dateRegex);
    if (dateMatch) {
      // Store the raw target date string
      data.targetDate = dateMatch[0];
    }

    // Special case for gender extraction
    if (allText.match(/\b(male|man|guy|boy)\b/i)) {
      data.gender = "male";
    } else if (allText.match(/\b(female|woman|girl|lady)\b/i)) {
      data.gender = "female";
    } else if (allText.match(/\b(non-binary|nonbinary|enby)\b/i)) {
      data.gender = "non-binary";
    }

    // Extract allergies
    const allergiesMatch = allText.match(/allerg(y|ies|ic)\s+to\s+([^\.]+)/i);
    if (allergiesMatch && allergiesMatch[2]) {
      // Split allergies by commas and clean up
      const allergiesList = allergiesMatch[2]
        .split(/,|and/)
        .map((item) => item.trim())
        .filter((item) => item.length > 0);

      if (allergiesList.length > 0) {
        data.allergies = allergiesList;
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

  if (isInitializing) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-300">
            Let's get your account set up...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-200 max-w-3xl mx-auto rounded-lg shadow-lg max-w-[600px] max-auto">
      {/* Header */}
      <header className="p-4 border-b dark:border-gray-800 flex justify-center items-center">
        <div className="text-2xl font-bold">
          niblet<span className="text-blue-400">.ai</span>
        </div>
      </header>

      {/* Progress Indicator */}
      <div className="px-4 pt-2 pb-4">
        <div className="flex justify-between text-sm text-gray-500 mb-1">
          <span>Onboarding Progress</span>
          <span>{onboardingStep}/6 completed</span>
        </div>
        <Progress value={(onboardingStep / 6) * 100} className="h-2" />
      </div>

      {/* Chat Container - Fixed max height */}
      <div
        className="flex-1 overflow-y-auto p-4 space-y-4"
        style={{ maxHeight: "calc(100vh - 200px)" }}
      >
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
              Creating and warming up your account...
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

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
import OpenAI from "openai";
import { useEffect, useRef, useState } from "react";
import { Input } from "./ui/input";
import { Progress } from "./ui/progress";

const openai = new OpenAI({
  apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true,
});

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
  const [isProfileSaving, setIsProfileSaving] = useState(false);
  const [isAiExtractionEnabled, setIsAiExtractionEnabled] = useState(true);

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
            "1. After they provide their name, say 'Nice to meet you, [Name]! What's your current weight(lbs)?' " +
            "2. After weight, ask 'Great! Now, could you tell me your height(x'y\") and age(years)?' If they provide only one, ask for the missing value. " +
            "3. Then ask 'Tell me about your daily activity. Do you exercise regularly or have a more sedentary routine?' " +
            "4. Next, ask 'Do you follow any particular diet or have specific dietary preferences?' " +
            "5. Finally, ask 'What's your weight loss goal(lbs) and by what date(mm/dd/yyyy) would you like to reach that goal?' If they provide only one, ask for the missing value. " +
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
            // Very simple BMR estimate (Harris-Benedict style)
            const weight = extractedData.startingWeight;
            const height = extractedData.height;
            const age = extractedData.age;

            const bmr =
              10 * (weight * 0.453592) + 6.25 * (height * 2.54) - 5 * age;

            // Activity multiplier
            let activityMultiplier = 1.2; // default sedentary
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

            targetCalories = Math.round(bmr * activityMultiplier);

            // If user wants to lose weight, subtract ~500 for 1 lb/week
            if (
              extractedData.targetWeight &&
              extractedData.targetWeight < extractedData.startingWeight
            ) {
              targetCalories -= 500;
            }
          } else {
            // Fallback
            targetCalories = 2000;
          }

          // Simple macro split
          const targetProtein = Math.round((targetCalories * 0.3) / 4);
          const targetFat = Math.round((targetCalories * 0.3) / 9);
          const targetCarbs = Math.round((targetCalories * 0.4) / 4);

          // Create a new thread for main chat
          const mainThreadId = await createThread();
          if (!mainThreadId) throw new Error("Failed to create main thread");

          const mainAssistantId = await getOrCreateAssistant("best-friend");
          if (!mainAssistantId)
            throw new Error("Failed to create main assistant");

          // Attempt to format target date
          let formattedTargetDate = null;
          if (extractedData.targetDate) {
            try {
              // Handle "in X weeks/months/years" or direct date parse
              if (extractedData.targetDate.toLowerCase().includes("in")) {
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
                // Try standard date parse
                const date = new Date(extractedData.targetDate);
                if (!isNaN(date.getTime())) {
                  formattedTargetDate = date.toISOString();
                }
              }
            } catch (err) {
              console.error("Error parsing target date:", err);
              // fallback
              formattedTargetDate = extractedData.targetDate;
            }
          }

          // Build profile data
          const profileData: Record<string, any> = {
            onboardingThreadId: threadId,
            onboardingCompleted: true,
            threadId: mainThreadId,
            assistantId: mainAssistantId,
            aiPersonality: "best-friend",
            targetCalories,
            targetProtein,
            targetCarbs,
            targetFat,
          };

          // Basic fields
          if (extractedData.name) profileData.name = extractedData.name;
          if (extractedData.age !== null && extractedData.age !== undefined)
            profileData.age = extractedData.age;
          if (extractedData.gender) profileData.gender = extractedData.gender;
          if (
            extractedData.startingWeight !== null &&
            extractedData.startingWeight !== undefined
          ) {
            profileData.startingWeight = extractedData.startingWeight;
          }
          if (
            extractedData.height !== null &&
            extractedData.height !== undefined
          ) {
            profileData.height = extractedData.height;
          }
          if (extractedData.activityLevel) {
            profileData.activityLevel = extractedData.activityLevel;
          }

          // Ensure target weight is saved
          if (
            extractedData.targetWeight !== null &&
            extractedData.targetWeight !== undefined
          ) {
            profileData.targetWeight = extractedData.targetWeight;
          }

          // Ensure target date is saved
          if (extractedData.targetDate) {
            profileData.targetDate =
              formattedTargetDate || extractedData.targetDate;
          }

          // Dietary preferences
          if (
            extractedData.dietaryPreferences &&
            extractedData.dietaryPreferences.length > 0
          ) {
            profileData.dietaryPreferences = extractedData.dietaryPreferences;
          }

          // If we have a target weight, set a goal type
          if (profileData.targetWeight) {
            profileData.goalType = "Weight Loss";
          }

          console.log("Final profile data to save:", profileData);

          // Save profile
          if (session?.user?.id) {
            await createOrUpdateUserProfile(session.user.id, profileData);
          } else {
            throw new Error("User ID is not available");
          }
          console.log("Profile successfully saved!");

          // Initialize main chat with a system message (but don’t call runAssistant again)
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

          // Redirect after a short delay
          setTimeout(() => {
            router.push("/dashboard");
          }, 2000);
        } catch (error) {
          console.error("Error completing onboarding:", error);
          setError(
            "There was a problem saving your profile. Please try again."
          );
          setIsProfileSaving(false);
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

  /**
   * Handle the tool calls (extract_user_data).
   */
  const handleToolCall = async (toolName: string, toolArgs: any) => {
    if (toolName === "extract_user_data") {
      // Merge with existing data
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

  /**
   * Calculate the onboarding step (max 6).
   */
  const calculateCompletionStep = (data: ExtractedUserData): number => {
    let step = 0;
    if (data.name) step++;
    if (data.startingWeight) step++;
    if (data.height && data.age) step++;
    if (data.activityLevel) step++;
    if (data.dietaryPreferences) step++;
    if (data.targetWeight) step++;
    return Math.min(step, 6);
  };

  // Auto-scroll to the bottom
  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  // Check if the last assistant message indicates onboarding is complete
  useEffect(() => {
    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage.role === "assistant") {
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
        const msgLower = lastMessage.content.toLowerCase();

        const isOnboardingComplete = completionPhrases.some((phrase) =>
          msgLower.includes(phrase)
        );

        if (isOnboardingComplete || onboardingStep >= 6) {
          setIsComplete(true);
        }
      }
    }
  }, [messages, onboardingStep]);

  /**
   * AI-based data extraction from messages.
   */
  async function extractDataWithAI(
    msgs: Message[]
  ): Promise<ExtractedUserData> {
    const conversationText = msgs
      .map((msg) => `${msg.role}: ${msg.content}`)
      .join("\n");

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: `You are a data extraction assistant. Extract the following information from the conversation text:
            - name
            - age (number)
            - gender
            - startingWeight (lbs, number)
            - targetWeight (lbs, number)
            - height (inches, number)
            - activityLevel
            - dietaryPreferences (array)
            - allergies (array)
            - targetDate (date or timeframe)
            
            If the user mentions losing X lbs from current weight, compute targetWeight = currentWeight - X.
            Return only valid JSON with those fields. If unsure, omit the field.`,
          },
          {
            role: "user",
            content: conversationText,
          },
        ],
        temperature: 0.1,
      });

      try {
        const content = response.choices[0].message?.content;
        if (!content) {
          throw new Error("No content in response");
        }
        const extracted = JSON.parse(content) as ExtractedUserData;
        return extracted;
      } catch (parseError) {
        console.error("Error parsing AI response:", parseError);
        return {};
      }
    } catch (error) {
      console.error("Error extracting data with AI:", error);
      return {};
    }
  }

  function fallbackExtraction(msgs: Message[]): ExtractedUserData {
    const allText = msgs.map((msg) => msg.content).join(" ");
    const data: ExtractedUserData = {};

    // Name
    const nameMatch = allText.match(
      /my name is ([A-Za-z\s]+)|i'm ([A-Za-z\s]+)|i am ([A-Za-z\s]+)|name:? ([A-Za-z\s]+)/i
    );
    if (nameMatch) {
      for (let i = 1; i < nameMatch.length; i++) {
        if (nameMatch[i]) {
          data.name = nameMatch[i].trim();
          break;
        }
      }
    }

    // Starting weight
    const weightMatch = allText.match(
      /(\d+\.?\d*)\s*(kg|kilograms|pounds|lbs)|weight:?\s*(\d+\.?\d*)|weigh\s*(\d+\.?\d*)|current weight:?\s*(\d+\.?\d*)/i
    );
    if (weightMatch) {
      for (let i = 1; i < weightMatch.length; i++) {
        if (weightMatch[i] && !isNaN(parseFloat(weightMatch[i]))) {
          data.startingWeight = parseFloat(weightMatch[i]);
          break;
        }
      }
    }

    // Height
    const heightMatch = allText.match(
      /(\d+\.?\d*)\s*(cm|centimeters|meters|m|feet|ft|foot|inches|in|'|")|height:?\s*(\d+\.?\d*)|tall:?\s*(\d+\.?\d*)/i
    );
    if (heightMatch) {
      for (let i = 1; i < heightMatch.length; i++) {
        if (heightMatch[i] && !isNaN(parseFloat(heightMatch[i]))) {
          data.height = parseFloat(heightMatch[i]);
          break;
        }
      }
    }

    // Age
    const ageMatch = allText.match(
      /(\d+)\s*(years|year|yr|y\.o\.|years old)|age:?\s*(\d+)|i'm\s*(\d+)\s*(years|year|yr)/i
    );
    if (ageMatch) {
      for (let i = 1; i < ageMatch.length; i++) {
        if (ageMatch[i] && !isNaN(parseInt(ageMatch[i]))) {
          data.age = parseInt(ageMatch[i]);
          break;
        }
      }
    }

    // Activity level
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

    // Dietary preferences
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
    const foundDiets: string[] = [];
    for (const diet of diets) {
      if (allText.toLowerCase().includes(diet)) {
        foundDiets.push(diet);
      }
    }
    if (foundDiets.length > 0) {
      data.dietaryPreferences = foundDiets;
    }

    // Target weight
    const targetWeightMatch = allText.match(
      /(?:target|goal|aim for|want to reach|want to weigh|target weight|goal weight|would like to be|trying to reach|get down to|drop to|lose to|weight goal of|reduce to|aiming for|desired weight of|ideal weight of)\s*[:]?(\d+\.?\d+)/i
    );
    if (targetWeightMatch && targetWeightMatch[1]) {
      data.targetWeight = parseFloat(targetWeightMatch[1]);
    } else {
      // Or "lose X lbs" from current
      const loseWeightMatch = allText.match(
        /lose\s+(\d+\.?\d*)\s*(?:lbs?|pounds?|kilos?|kg)/i
      );
      if (loseWeightMatch && loseWeightMatch[1] && data.startingWeight) {
        data.targetWeight =
          data.startingWeight - parseFloat(loseWeightMatch[1]);
      }
    }

    // Target date
    const datePatterns = [
      // e.g. "by January 20th, 2025"
      /(?:by|before|until)\s+(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+(\d{1,2})(?:,\s*(\d{4}))?/i,
      // e.g. "by 01/20/2025"
      /(?:by|before|until)\s+(\d{1,2})\/(\d{1,2})\/(\d{2,4})/i,
      // relative: "in 3 months"
      /in\s+(\d+)\s+(days?|weeks?|months?|years?)/i,
    ];
    for (const pattern of datePatterns) {
      const match = allText.match(pattern);
      if (match) {
        data.targetDate = match[0];
        break;
      }
    }

    // Gender
    if (allText.match(/\b(male|man|guy|boy)\b/i)) {
      data.gender = "male";
    } else if (allText.match(/\b(female|woman|girl|lady)\b/i)) {
      data.gender = "female";
    } else if (allText.match(/\b(non-binary|nonbinary|enby)\b/i)) {
      data.gender = "non-binary";
    }

    // Allergies
    const allergiesMatch = allText.match(/allerg(y|ies|ic)\s+to\s+([^\.]+)/i);
    if (allergiesMatch && allergiesMatch[2]) {
      const allergiesList = allergiesMatch[2]
        .split(/,|and/)
        .map((item) => item.trim())
        .filter((item) => item.length > 0);

      if (allergiesList.length > 0) {
        data.allergies = allergiesList;
      }
    }

    return data;
  }

  async function extractDataFromMessages(msgs: Message[]) {
    let extractedDataResult: ExtractedUserData = {};

    if (isAiExtractionEnabled) {
      try {
        const aiData = await extractDataWithAI(msgs);
        if (Object.keys(aiData).length > 0) {
          extractedDataResult = aiData;
        } else {
          extractedDataResult = fallbackExtraction(msgs);
        }
      } catch (error) {
        console.error("AI extraction failed, falling back to regex:", error);
        extractedDataResult = fallbackExtraction(msgs);
      }
    } else {
      extractedDataResult = fallbackExtraction(msgs);
    }

    setExtractedData((prev) => {
      const updated = { ...prev, ...extractedDataResult };
      setOnboardingStep(calculateCompletionStep(updated));
      return updated;
    });
  }

  /**
   * Handle sending text input to the assistant.
   */
  const handleSendMessage = async () => {
    if (!inputValue.trim() || !threadId || !assistantId || isTyping) return;

    const formattedText = formatChatText(inputValue);

    // Add user message
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
      setIsTyping(true);
      const messageAdded = await addMessageToThread(threadId, formattedText);
      if (!messageAdded) {
        throw new Error("Failed to send message");
      }

      // Get assistant response
      const assistantMessages = await runAssistant(
        threadId,
        assistantId,
        "professional-coach",
        handleToolCall
      );
      if (assistantMessages && assistantMessages.length > 0) {
        const latestMessage = assistantMessages[assistantMessages.length - 1];
        const assistantMessage: Message = {
          id: latestMessage.id,
          role: "assistant",
          content: latestMessage.content,
          timestamp: latestMessage.createdAt,
        };
        setMessages((prev) => [...prev, assistantMessage]);

        // Extract data
        await extractDataFromMessages([
          ...messages,
          userMessage,
          assistantMessage,
        ]);
      }
    } catch (error) {
      console.error("Failed to send message:", error);
      setError("There was an error processing your message. Please try again.");
    } finally {
      setIsTyping(false);
    }

    // If user was recording, stop
    if (mediaRecorder && mediaRecorder.state === "recording") {
      stopRecording();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  /**
   * Voice recording logic.
   */
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

          const formattedText = formatChatText(transcribedText);
          // Put it in input (optional) or send directly
          setInputValue(formattedText);

          // Auto-send the transcribed text
          if (threadId && assistantId) {
            const userMessage: Message = {
              id: `user-${Date.now()}`,
              role: "user",
              content: formattedText,
              timestamp: new Date(),
            };

            setMessages((prev) => [...prev, userMessage]);
            setInputValue("");

            const messageAdded = await addMessageToThread(
              threadId,
              formattedText
            );
            if (!messageAdded) {
              throw new Error("Failed to send message");
            }

            const assistantMessages = await runAssistant(
              threadId,
              assistantId,
              "professional-coach",
              handleToolCall
            );
            if (assistantMessages && assistantMessages.length > 0) {
              const latestMessage =
                assistantMessages[assistantMessages.length - 1];
              const assistantMessage: Message = {
                id: latestMessage.id,
                role: "assistant",
                content: latestMessage.content,
                timestamp: latestMessage.createdAt,
              };
              setMessages((prev) => [...prev, assistantMessage]);

              await extractDataFromMessages([
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
    <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-200 max-w-[600px] mx-auto rounded-lg shadow-lg">
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

      {/* Chat Container */}
      <div
        className="flex-1 overflow-y-auto p-4 space-y-4"
        style={{ maxHeight: "calc(100vh - 200px)" }}
      >
        {error && (
          <div className="mx-auto bg-red-100 dark:bg-red-900 p-3 rounded-lg text-center">
            {error}
          </div>
        )}

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

      {/* Input or Finalizing */}
      <div className="p-4 border-t dark:border-gray-800">
        {isComplete ? (
          <div className="text-center p-4">
            <div className="w-16 h-16 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="mb-4 text-lg font-semibold">
              Creating and warming up your account...
            </p>
            <p className="text-gray-500 dark:text-gray-400">
              You’ll be redirected to your dashboard in a moment
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

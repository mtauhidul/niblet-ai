// components/ConversationalOnboarding.tsx
"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { updateUserProfile } from "@/lib/auth/authService";
import { Mic, MicOff, Send } from "lucide-react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const ConversationalOnboarding = () => {
  const [messages, setMessages] = useState<
    { id: string; role: string; content: string }[]
  >([]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [stage, setStage] = useState("intro"); // intro, personal, goals, dietary, complete
  const [userData, setUserData] = useState({
    name: "",
    age: null as number | null,
    gender: "",
    currentWeight: null as number | null,
    targetWeight: null as number | null,
    height: null as number | null,
    activityLevel: "",
    dietaryPreferences: [] as string[],
    allergies: [] as string[],
    goalType: "", // weight loss, maintenance, muscle gain
  });
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(
    null
  );
  const [threadId, setThreadId] = useState<string | null>(null);

  const messageEndRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { data: session } = useSession();

  // Initialize chat
  useEffect(() => {
    // Set name from session if available
    if (session?.user?.name) {
      setUserData((prev) => ({
        ...prev,
        name: session.user.name || "",
      }));
    }

    const initializeChat = async () => {
      // Create thread
      try {
        const response = await fetch("/api/assistant", { method: "POST" });
        const data = await response.json();
        setThreadId(data.threadId);

        // Add welcome message
        setIsTyping(true);
        setTimeout(() => {
          setMessages([
            {
              id: "welcome",
              role: "assistant",
              content: `Hi there${
                session?.user?.name ? ", " + session.user.name : ""
              }! 👋 I'm Nibble, your personal nutrition assistant. I'm excited to get to know you so I can help you reach your health goals! ${
                !session?.user?.name
                  ? "First, what's your name?"
                  : "What's your age?"
              }`,
            },
          ]);
          setIsTyping(false);

          // If we already have the name, skip to personal stage
          if (session?.user?.name) {
            setStage("personal");
          }
        }, 1000);
      } catch (error) {
        console.error("Error initializing chat:", error);
      }
    };

    initializeChat();
  }, [session]);

  // Auto scroll to bottom of chat
  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  // Process responses based on current stage
  const processResponse = (userMessage: string) => {
    // Add user message to chat
    const newMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: userMessage,
    };
    setMessages((prev) => [...prev, newMessage]);

    // Process based on current stage
    if (stage === "intro") {
      // Capture name
      setUserData((prev) => ({ ...prev, name: userMessage }));
      setIsTyping(true);

      setTimeout(() => {
        setMessages((prev) => [
          ...prev,
          {
            id: `assistant-${Date.now()}`,
            role: "assistant",
            content: `Nice to meet you, ${userMessage}! 😊 Now, I'd like to know a bit about you so I can better help with your nutrition. What's your age?`,
          },
        ]);
        setIsTyping(false);
        setStage("personal");
      }, 1000);
    } else if (stage === "personal") {
      // Process personal info sequentially
      if (!userData.age) {
        // Capture age
        const age = parseInt(userMessage);
        if (isNaN(age)) {
          // Invalid age
          setMessages((prev) => [
            ...prev,
            {
              id: `assistant-${Date.now()}`,
              role: "assistant",
              content:
                "I need your age as a number to help customize your nutrition plan. Can you please share that with me?",
            },
          ]);
          return;
        }

        setUserData((prev) => ({ ...prev, age }));
        setIsTyping(true);

        setTimeout(() => {
          setMessages((prev) => [
            ...prev,
            {
              id: `assistant-${Date.now()}`,
              role: "assistant",
              content: `Thanks! What's your gender? This helps me calculate your nutritional needs more accurately.`,
            },
          ]);
          setIsTyping(false);
        }, 1000);
      } else if (!userData.gender) {
        // Capture gender
        setUserData((prev) => ({ ...prev, gender: userMessage }));
        setIsTyping(true);

        setTimeout(() => {
          setMessages((prev) => [
            ...prev,
            {
              id: `assistant-${Date.now()}`,
              role: "assistant",
              content: `Great! What's your current weight in pounds?`,
            },
          ]);
          setIsTyping(false);
        }, 1000);
      } else if (!userData.currentWeight) {
        // Capture current weight
        const weight = parseFloat(userMessage);
        if (isNaN(weight)) {
          // Invalid weight
          setMessages((prev) => [
            ...prev,
            {
              id: `assistant-${Date.now()}`,
              role: "assistant",
              content:
                "I need your weight as a number to help customize your nutrition plan. Can you please share that with me?",
            },
          ]);
          return;
        }

        setUserData((prev) => ({ ...prev, currentWeight: weight }));
        setIsTyping(true);

        setTimeout(() => {
          setMessages((prev) => [
            ...prev,
            {
              id: `assistant-${Date.now()}`,
              role: "assistant",
              content: `Thanks! And how tall are you in inches? (For example, 5'10" is 70 inches)`,
            },
          ]);
          setIsTyping(false);
        }, 1000);
      } else if (!userData.height) {
        // Capture height
        const height = parseFloat(userMessage);
        if (isNaN(height)) {
          // Invalid height
          setMessages((prev) => [
            ...prev,
            {
              id: `assistant-${Date.now()}`,
              role: "assistant",
              content:
                "I need your height as a number in inches to help customize your nutrition plan. Can you please share that with me?",
            },
          ]);
          return;
        }

        setUserData((prev) => ({ ...prev, height }));
        setIsTyping(true);

        setTimeout(() => {
          setMessages((prev) => [
            ...prev,
            {
              id: `assistant-${Date.now()}`,
              role: "assistant",
              content: `Great! How would you describe your activity level? (Sedentary, Lightly Active, Moderately Active, Very Active, or Extremely Active)`,
            },
          ]);
          setIsTyping(false);
        }, 1000);
      } else if (!userData.activityLevel) {
        // Capture activity level
        setUserData((prev) => ({ ...prev, activityLevel: userMessage }));
        setIsTyping(true);

        // Move to goals stage
        setTimeout(() => {
          setMessages((prev) => [
            ...prev,
            {
              id: `assistant-${Date.now()}`,
              role: "assistant",
              content: `Thanks for sharing all that info, ${userData.name}! Now, what's your primary goal? (Weight Loss, Weight Maintenance, or Muscle Gain)`,
            },
          ]);
          setIsTyping(false);
          setStage("goals");
        }, 1000);
      }
    } else if (stage === "goals") {
      // Process goals info
      if (!userData.goalType) {
        // Capture goal type
        setUserData((prev) => ({ ...prev, goalType: userMessage }));
        setIsTyping(true);

        setTimeout(() => {
          setMessages((prev) => [
            ...prev,
            {
              id: `assistant-${Date.now()}`,
              role: "assistant",
              content: `Great choice! What's your target weight in pounds? If you're focusing on maintenance, just enter your current weight.`,
            },
          ]);
          setIsTyping(false);
        }, 1000);
      } else if (!userData.targetWeight) {
        // Capture target weight
        const targetWeight = parseFloat(userMessage);
        if (isNaN(targetWeight)) {
          // Invalid target weight
          setMessages((prev) => [
            ...prev,
            {
              id: `assistant-${Date.now()}`,
              role: "assistant",
              content:
                "I need your target weight as a number to help customize your nutrition plan. Can you please share that with me?",
            },
          ]);
          return;
        }

        setUserData((prev) => ({ ...prev, targetWeight }));
        setIsTyping(true);

        // Move to dietary stage
        setTimeout(() => {
          setMessages((prev) => [
            ...prev,
            {
              id: `assistant-${Date.now()}`,
              role: "assistant",
              content: `Perfect! Now, do you have any dietary preferences or restrictions? (e.g., Vegetarian, Vegan, Pescatarian, Keto, Gluten-Free, etc.) You can list multiple or say "None" if you don't have any.`,
            },
          ]);
          setIsTyping(false);
          setStage("dietary");
        }, 1000);
      }
    } else if (stage === "dietary") {
      // Process dietary preferences
      if (userData.dietaryPreferences.length === 0) {
        // Capture dietary preferences
        const preferences =
          userMessage.toLowerCase() === "none"
            ? []
            : userMessage.split(",").map((pref) => pref.trim());

        setUserData((prev) => ({ ...prev, dietaryPreferences: preferences }));
        setIsTyping(true);

        setTimeout(() => {
          setMessages((prev) => [
            ...prev,
            {
              id: `assistant-${Date.now()}`,
              role: "assistant",
              content: `Got it! Do you have any food allergies I should know about? Please list them or say "None" if you don't have any.`,
            },
          ]);
          setIsTyping(false);
        }, 1000);
      } else if (userData.allergies.length === 0) {
        // Capture allergies
        const allergies =
          userMessage.toLowerCase() === "none"
            ? []
            : userMessage.split(",").map((allergy) => allergy.trim());

        setUserData((prev) => ({ ...prev, allergies }));
        setIsTyping(true);

        // Complete the onboarding
        setTimeout(() => {
          // Calculate BMI and TDEE for the summary
          if (userData.height === null) {
            setMessages((prev) => [
              ...prev,
              {
                id: `error-${Date.now()}`,
                role: "system",
                content: "Height is required to calculate BMI.",
              },
            ]);
            return;
          }
          const heightInMeters = userData.height * 0.0254;
          if (userData.currentWeight === null) {
            setMessages((prev) => [
              ...prev,
              {
                id: `error-${Date.now()}`,
                role: "system",
                content: "Current weight is required to calculate BMI.",
              },
            ]);
            return;
          }
          const weightInKg = userData.currentWeight * 0.453592;
          const bmi = weightInKg / (heightInMeters * heightInMeters);

          // Basic TDEE calculation (this is simplified)
          let bmr = 0;
          if (userData.gender.toLowerCase() === "male") {
            bmr =
              88.362 +
              13.397 * weightInKg +
              4.799 * userData.height * 2.54 -
              5.677 * (userData.age ?? 0);
          } else {
            bmr =
              447.593 +
              9.247 * weightInKg +
              3.098 * userData.height * 2.54 -
              4.33 * (userData.age ?? 0);
          }

          // Activity multiplier
          let activityMultiplier = 1.2; // Default to sedentary
          switch (userData.activityLevel.toLowerCase()) {
            case "lightly active":
              activityMultiplier = 1.375;
              break;
            case "moderately active":
              activityMultiplier = 1.55;
              break;
            case "very active":
              activityMultiplier = 1.725;
              break;
            case "extremely active":
              activityMultiplier = 1.9;
              break;
          }

          const tdee = Math.round(bmr * activityMultiplier);

          // Calculate target calories
          let targetCalories = tdee;
          if (userData.goalType.toLowerCase().includes("loss")) {
            targetCalories = Math.round(tdee * 0.8); // 20% deficit
          } else if (userData.goalType.toLowerCase().includes("gain")) {
            targetCalories = Math.round(tdee * 1.1); // 10% surplus
          }

          setMessages((prev) => [
            ...prev,
            {
              id: `assistant-${Date.now()}`,
              role: "assistant",
              content: `Thank you for all this information, ${
                userData.name
              }! 🎉 I've created your personal profile:

**Basic Information:**
- Age: ${userData.age}
- Current Weight: ${userData.currentWeight} lbs
- Target Weight: ${userData.targetWeight} lbs
- Height: ${userData.height} inches
- Activity Level: ${userData.activityLevel}

**Nutrition Plan:**
- Goal: ${userData.goalType}
- Estimated Daily Calories: ${targetCalories} calories
- BMI: ${bmi.toFixed(1)}

I'll use this information to provide personalized meal suggestions and track your progress. You can always update your preferences in settings later.

Ready to start your journey?`,
            },
          ]);
          setIsTyping(false);
          setStage("complete");

          // Save the user profile if we have a valid session
          if (session?.user?.id) {
            saveUserProfile(targetCalories, tdee, bmi);
          }
        }, 1500);
      }
    }
  };

  // Save user profile to database
  const saveUserProfile = async (
    targetCalories: number,
    tdee: number,
    bmi: number
  ) => {
    if (!session?.user?.id) {
      console.error("No user ID found in session");
      return;
    }

    try {
      const targetProtein = Math.round(
        (userData.goalType.toLowerCase().includes("gain") ? 1.8 : 1.2) *
          (userData.currentWeight || 0) *
          0.453592
      );
      const targetFat = Math.round((targetCalories * 0.25) / 9); // 25% of calories from fat
      const targetCarbs = Math.round(
        (targetCalories - targetProtein * 4 - targetFat * 9) / 4
      );

      await updateUserProfile(session.user.id, {
        age: userData.age || undefined,
        gender: userData.gender,
        currentWeight: userData.currentWeight || undefined,
        targetWeight: userData.targetWeight || undefined,
        height: userData.height || undefined,
        activityLevel: userData.activityLevel,
        dietaryPreferences: userData.dietaryPreferences,
        allergies: userData.allergies,
        goalType: userData.goalType,
        targetCalories: targetCalories,
        targetProtein: targetProtein,
        targetCarbs: targetCarbs,
        targetFat: targetFat,
        threadId: threadId || undefined,
        onboardingCompleted: true,
      });
    } catch (error) {
      console.error("Error saving user profile:", error);
    }
  };

  // Send message to assistant
  const handleSendMessage = () => {
    if (!inputValue.trim()) return;

    processResponse(inputValue.trim());
    setInputValue("");
  };

  // Handle key press (Enter to send)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSendMessage();
    }
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
            processResponse(data.text);
          } else {
            setMessages((prev) => [
              ...prev,
              {
                id: `error-${Date.now()}`,
                role: "system",
                content:
                  "Sorry, I couldn't understand the audio. Please try again or type your message.",
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
            },
          ]);
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
      setMessages((prev) => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          role: "system",
          content:
            "Sorry, I couldn't access your microphone. Please check your browser permissions or type your message instead.",
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

  // Complete onboarding and move to dashboard
  const completeOnboarding = async () => {
    router.push("/dashboard");
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="p-4 border-b dark:border-gray-800 flex justify-center items-center">
        <div className="text-2xl font-bold">
          niblet<span className="text-blue-400">.ai</span>
        </div>
      </header>

      {/* Chat Container */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
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
        {stage === "complete" ? (
          <Button
            onClick={completeOnboarding}
            className="w-full bg-blue-500 hover:bg-blue-600"
          >
            Start Using Niblet.ai
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
              disabled={!inputValue.trim() || isTyping}
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

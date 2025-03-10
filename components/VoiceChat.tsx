import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  addMessageToThread,
  PersonalityKey,
  runAssistant,
  transcribeAudio,
} from "@/lib/assistantService";
import { Message } from "@/types/chat";
import { AudioLines, Mic, MicOff, PhoneOff } from "lucide-react";
import React, { useCallback, useEffect, useRef, useState } from "react";

interface EnhancedVoiceChatProps {
  isOpen: boolean;
  onClose: () => void;
  threadId: string | null;
  assistantId: string | null;
  aiPersonality: PersonalityKey;
  onMessageReceived?: (message: Message) => void;
  onMealLogged?: () => void;
  onWeightLogged?: () => void;
}

// Component for the visual audio wave animation
const AudioWaveform: React.FC<{ isActive: boolean }> = ({ isActive }) => {
  return (
    <div
      className={`flex items-center justify-center h-8 ${
        isActive ? "opacity-100" : "opacity-30"
      }`}
    >
      {[...Array(5)].map((_, i) => (
        <div
          key={i}
          className={`w-1 mx-0.5 bg-blue-500 rounded-full transform transition-all duration-200 ${
            isActive ? "animate-sound-wave" : "h-2"
          }`}
          style={{
            height: isActive ? `${Math.random() * 16 + 4}px` : "8px",
            animationDelay: `${i * 0.1}s`,
          }}
        />
      ))}
    </div>
  );
};

// Speech recognition status component
const RecognitionStatus: React.FC<{ status: string; text: string }> = ({
  status,
  text,
}) => {
  return (
    <div className="max-w-md mx-auto mt-4 p-3 bg-gray-100 dark:bg-gray-800 rounded-lg">
      <div className="flex items-center">
        <div className="mr-2">
          {status === "listening" && (
            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
          )}
          {status === "processing" && (
            <div className="w-3 h-3 bg-yellow-500 rounded-full animate-pulse"></div>
          )}
          {status === "speaking" && (
            <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
          )}
        </div>
        <div className="text-sm font-medium">
          {status === "listening" && "Listening..."}
          {status === "processing" && "Processing..."}
          {status === "speaking" && "Speaking..."}
        </div>
      </div>
      {text && (
        <div className="mt-2 text-sm text-gray-600 dark:text-gray-300">
          {text}
        </div>
      )}
    </div>
  );
};

const EnhancedVoiceChat: React.FC<EnhancedVoiceChatProps> = ({
  isOpen,
  onClose,
  threadId,
  assistantId,
  aiPersonality,
  onMessageReceived,
  onMealLogged,
  onWeightLogged,
}) => {
  // Chat state
  const [isCallActive, setIsCallActive] = useState(false);
  const [status, setStatus] = useState<
    "idle" | "listening" | "processing" | "speaking"
  >("idle");
  const [transcribedText, setTranscribedText] = useState("");
  const [assistantResponse, setAssistantResponse] = useState("");
  const [callDuration, setCallDuration] = useState(0);
  const [transcript, setTranscript] = useState<
    Array<{ role: "user" | "assistant"; text: string }>
  >([]);

  // Refs for managing audio and recording
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<BlobPart[]>([]);
  const callTimerRef = useRef<NodeJS.Timeout | null>(null);
  const speechSynthesisRef = useRef<SpeechSynthesisUtterance | null>(null);
  const processingRef = useRef<boolean>(false);
  const listeningRef = useRef<boolean>(false);

  // Start timer for call duration
  const startCallTimer = useCallback(() => {
    if (callTimerRef.current) clearInterval(callTimerRef.current);
    setCallDuration(0);
    callTimerRef.current = setInterval(() => {
      setCallDuration((prev) => prev + 1);
    }, 1000);
  }, []);

  // Format time display (MM:SS)
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  };

  // Handle tool calls from the assistant
  const handleToolCall = useCallback(
    async (toolName: string, toolArgs: any) => {
      try {
        if (toolName === "log_meal") {
          onMealLogged?.();
          return {
            success: true,
            message: `Logged ${toolArgs.meal_name} with ${toolArgs.calories} calories.`,
          };
        } else if (toolName === "log_weight") {
          onWeightLogged?.();
          return {
            success: true,
            message: `Logged weight: ${toolArgs.weight} lbs`,
          };
        } else if (toolName === "get_nutrition_info") {
          return {
            success: true,
            message: "Nutrition info retrieved",
            data: { calories: 300, protein: 25, carbs: 30, fat: 10 },
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
    [onMealLogged, onWeightLogged]
  );

  // Setup speech synthesis with voice selection
  const setupSpeechSynthesis = useCallback(() => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;

    const utterance = new SpeechSynthesisUtterance();
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    // Try to find a good female voice
    const voices = window.speechSynthesis.getVoices();
    const femaleVoice = voices.find(
      (voice) =>
        voice.name.includes("female") ||
        voice.name.includes("Samantha") ||
        voice.name.includes("Google UK English Female")
    );

    if (femaleVoice) {
      utterance.voice = femaleVoice;
    }

    speechSynthesisRef.current = utterance;

    // Make sure voices are loaded (needed in some browsers)
    if (voices.length === 0) {
      window.speechSynthesis.onvoiceschanged = () => {
        const updatedVoices = window.speechSynthesis.getVoices();
        const updatedFemaleVoice = updatedVoices.find(
          (voice) =>
            voice.name.includes("female") ||
            voice.name.includes("Samantha") ||
            voice.name.includes("Google UK English Female")
        );

        if (updatedFemaleVoice && speechSynthesisRef.current) {
          speechSynthesisRef.current.voice = updatedFemaleVoice;
        }
      };
    }
  }, []);

  // Speak text using speech synthesis
  const speakText = useCallback(
    (text: string) => {
      if (typeof window === "undefined" || !window.speechSynthesis || !text)
        return;

      // Cancel any ongoing speech
      window.speechSynthesis.cancel();

      if (!speechSynthesisRef.current) {
        setupSpeechSynthesis();
      }

      if (speechSynthesisRef.current) {
        speechSynthesisRef.current.text = text;

        // Set event handlers
        speechSynthesisRef.current.onstart = () => {
          setStatus("speaking");
          listeningRef.current = false;
        };

        speechSynthesisRef.current.onend = () => {
          setStatus("idle");
          // If call is still active, resume listening after a short delay
          if (isCallActive && !processingRef.current) {
            setTimeout(() => {
              startListening();
            }, 500);
          }
        };

        speechSynthesisRef.current.onerror = (event) => {
          console.error("Speech synthesis error:", event);
          setStatus("idle");
          if (isCallActive && !processingRef.current) {
            startListening();
          }
        };

        window.speechSynthesis.speak(speechSynthesisRef.current);
      }
    },
    [isCallActive, setupSpeechSynthesis]
  );

  // Start listening for user speech
  const startListening = useCallback(() => {
    if (
      !streamRef.current ||
      !mediaRecorderRef.current ||
      processingRef.current
    )
      return;

    try {
      audioChunksRef.current = [];
      mediaRecorderRef.current.start();
      setStatus("listening");
      listeningRef.current = true;

      // Auto-stop after 7 seconds of silence or 15 seconds max
      setTimeout(() => {
        if (
          listeningRef.current &&
          mediaRecorderRef.current?.state === "recording"
        ) {
          stopListening();
        }
      }, 15000);
    } catch (error) {
      console.error("Error starting listening:", error);
    }
  }, []);

  // Stop listening and process the recorded audio
  const stopListening = useCallback(() => {
    if (
      !mediaRecorderRef.current ||
      mediaRecorderRef.current.state !== "recording"
    )
      return;

    listeningRef.current = false;
    mediaRecorderRef.current.stop();
  }, []);

  // Process the audio after recording
  const processAudio = useCallback(
    async (audioBlob: Blob) => {
      if (!threadId || !assistantId || processingRef.current) return;
      if (audioBlob.size < 1000) return; // Skip if too small

      processingRef.current = true;
      setStatus("processing");

      try {
        // Transcribe audio
        const text = await transcribeAudio(audioBlob);

        if (!text || text.trim() === "") {
          console.log("No speech detected or transcription failed");
          processingRef.current = false;
          setStatus("idle");
          if (isCallActive) startListening();
          return;
        }

        // Update UI with transcribed text
        setTranscribedText(text);

        // Add to transcript history
        setTranscript((prev) => [...prev, { role: "user", text }]);

        // Send to assistant
        const userMessage: Message = {
          id: `user-${Date.now()}`,
          role: "user",
          content: text,
          timestamp: new Date(),
        };

        if (onMessageReceived) {
          onMessageReceived(userMessage);
        }

        // Add message to thread
        await addMessageToThread(threadId, text);

        // Run the assistant
        const assistantMessages = await runAssistant(
          threadId,
          assistantId,
          aiPersonality,
          handleToolCall
        );

        if (assistantMessages && assistantMessages.length > 0) {
          const response = assistantMessages[assistantMessages.length - 1];

          // Update UI with assistant response
          setAssistantResponse(response.content);

          // Add to transcript history
          setTranscript((prev) => [
            ...prev,
            { role: "assistant", text: response.content },
          ]);

          // Send to message handler if available
          const assistantMessage: Message = {
            id: response.id,
            role: "assistant",
            content: response.content,
            timestamp: response.createdAt,
          };

          if (onMessageReceived) {
            onMessageReceived(assistantMessage);
          }

          // Speak the response
          speakText(response.content);
        }
      } catch (error) {
        console.error("Error processing audio:", error);
      } finally {
        processingRef.current = false;

        // If not speaking and call is still active, resume listening
        if (status !== "speaking" && isCallActive) {
          startListening();
        }
      }
    },
    [
      threadId,
      assistantId,
      aiPersonality,
      handleToolCall,
      isCallActive,
      onMessageReceived,
      speakText,
      status,
    ]
  );

  // Initialize the call
  const startCall = useCallback(async () => {
    try {
      setIsCallActive(true);
      setTranscript([]);

      // Get microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      streamRef.current = stream;

      // Setup media recorder
      const recorder = new MediaRecorder(stream);

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        if (audioChunksRef.current.length > 0) {
          const audioBlob = new Blob(audioChunksRef.current, {
            type: "audio/webm",
          });
          await processAudio(audioBlob);
        }
      };

      mediaRecorderRef.current = recorder;

      // Setup speech synthesis
      setupSpeechSynthesis();

      // Start call timer
      startCallTimer();

      // Send initial greeting from assistant
      if (threadId && assistantId) {
        // Send a system message to trigger the assistant
        await addMessageToThread(
          threadId,
          "Hi, I'd like to start a voice conversation. Please greet me."
        );

        const messages = await runAssistant(
          threadId,
          assistantId,
          aiPersonality,
          handleToolCall
        );

        if (messages && messages.length > 0) {
          const greeting = messages[messages.length - 1];

          // Add to transcript
          setTranscript([{ role: "assistant", text: greeting.content }]);
          setAssistantResponse(greeting.content);

          // Create message object
          const greetingMessage: Message = {
            id: greeting.id,
            role: "assistant",
            content: greeting.content,
            timestamp: greeting.createdAt,
          };

          if (onMessageReceived) {
            onMessageReceived(greetingMessage);
          }

          // Speak greeting
          speakText(greeting.content);
        }
      }

      // Start listening (after greeting is done)
      setTimeout(() => {
        if (isCallActive && status !== "speaking") {
          startListening();
        }
      }, 1000);
    } catch (error) {
      console.error("Error starting call:", error);
      setIsCallActive(false);
    }
  }, [
    threadId,
    assistantId,
    aiPersonality,
    handleToolCall,
    onMessageReceived,
    setupSpeechSynthesis,
    speakText,
    startCallTimer,
    startListening,
    status,
  ]);

  // End the call and clean up resources
  const endCall = useCallback(() => {
    // Cancel any ongoing speech
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }

    // Stop recording if active
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state === "recording"
    ) {
      mediaRecorderRef.current.stop();
    }

    // Stop all audio tracks
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
    }

    // Clear timers
    if (callTimerRef.current) {
      clearInterval(callTimerRef.current);
      callTimerRef.current = null;
    }

    // Reset states
    setIsCallActive(false);
    setStatus("idle");
    setCallDuration(0);
    listeningRef.current = false;
    processingRef.current = false;

    // Reset refs
    mediaRecorderRef.current = null;
    streamRef.current = null;
    audioChunksRef.current = [];
  }, []);

  // Close dialog handler
  const handleClose = useCallback(() => {
    endCall();
    onClose();
  }, [endCall, onClose]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      endCall();
    };
  }, [endCall]);

  // When dialog opens, start call automatically
  useEffect(() => {
    if (isOpen && !isCallActive && threadId && assistantId) {
      startCall();
    }
  }, [isOpen, isCallActive, threadId, assistantId, startCall]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-md md:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-center">Voice Conversation</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center space-y-6 py-4">
          {/* Call Timer */}
          <div className="text-3xl font-bold">{formatTime(callDuration)}</div>

          {/* Status Indicators */}
          <div className="flex flex-col items-center space-y-2">
            {status === "listening" && (
              <RecognitionStatus status="listening" text="I'm listening..." />
            )}
            {status === "processing" && (
              <RecognitionStatus status="processing" text={transcribedText} />
            )}
            {status === "speaking" && (
              <RecognitionStatus status="speaking" text={assistantResponse} />
            )}
          </div>

          {/* Audio Visualization */}
          <div className="h-16 w-full flex items-center justify-center">
            <AudioWaveform
              isActive={status === "speaking" || status === "listening"}
            />
          </div>

          {/* Conversation Transcript */}
          <div className="w-full max-h-[200px] overflow-y-auto p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            {transcript.length === 0 ? (
              <p className="text-center text-gray-500 dark:text-gray-400">
                Your conversation will appear here
              </p>
            ) : (
              <div className="space-y-3">
                {transcript.map((entry, index) => (
                  <div
                    key={index}
                    className={`${
                      entry.role === "user"
                        ? "ml-auto bg-blue-500 text-white"
                        : "mr-auto bg-gray-200 dark:bg-gray-700 dark:text-white"
                    } rounded-lg p-2 max-w-[80%]`}
                  >
                    {entry.text}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Call Controls */}
          <div className="flex items-center justify-center space-x-4">
            {isCallActive ? (
              <>
                <Button
                  variant={status === "listening" ? "default" : "outline"}
                  size="icon"
                  className="h-12 w-12 rounded-full"
                  onClick={() =>
                    status === "listening" ? stopListening() : startListening()
                  }
                  disabled={status === "processing" || status === "speaking"}
                >
                  {status === "listening" ? (
                    <Mic className="h-5 w-5 text-white" />
                  ) : (
                    <MicOff className="h-5 w-5" />
                  )}
                </Button>

                <Button
                  variant="destructive"
                  size="icon"
                  className="h-14 w-14 rounded-full"
                  onClick={endCall}
                >
                  <PhoneOff className="h-6 w-6" />
                </Button>
              </>
            ) : (
              <Button
                onClick={startCall}
                className="h-14 px-6 rounded-full"
                disabled={!threadId || !assistantId}
              >
                <AudioLines className="h-5 w-5 mr-2" />
                Start Voice Chat
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EnhancedVoiceChat;

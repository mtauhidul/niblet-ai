// components/VoiceChat.tsx
import { Button } from "@/components/ui/button";
import {
  addMessageToThread,
  PersonalityKey,
  runAssistant,
  transcribeAudio,
} from "@/lib/assistantService";
import { Message } from "@/types/chat";
import { Mic, MicOff, Phone, PhoneOff } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

interface VoiceChatProps {
  threadId: string | null;
  assistantId: string | null;
  aiPersonality: PersonalityKey;
  onMessageReceived?: (message: Message) => void;
  onMealLogged?: () => void;
  onWeightLogged?: () => void;
  onEndCall?: () => void;
}

const VoiceChat: React.FC<VoiceChatProps> = ({
  threadId,
  assistantId,
  aiPersonality,
  onMessageReceived,
  onMealLogged,
  onWeightLogged,
  onEndCall,
}) => {
  // State
  const [isCallActive, setIsCallActive] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [callDuration, setCallDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const callTimerRef = useRef<NodeJS.Timeout | null>(null);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const processingRef = useRef(false);
  // A ref to track the current call status reliably inside callbacks
  const callActiveRef = useRef(false);

  // Ensure voices are loaded (in case getVoices returns empty initially)
  useEffect(() => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = () => {
        // Trigger a dummy call to getVoices so subsequent calls have voices loaded
        window.speechSynthesis.getVoices();
      };
    }
  }, []);

  // Handle tool calls for meal logging, etc.
  const handleToolCalls = useCallback(
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

  // Format time for display
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  };

  // Start call timer
  const startCallTimer = useCallback(() => {
    if (callTimerRef.current) clearInterval(callTimerRef.current);
    setCallDuration(0);
    callTimerRef.current = setInterval(() => {
      setCallDuration((prev) => prev + 1);
    }, 1000);
  }, []);

  const startRecording = useCallback(() => {
    if (
      !mediaRecorderRef.current ||
      !callActiveRef.current ||
      isRecording ||
      isSpeaking
    )
      return;

    try {
      chunksRef.current = [];
      mediaRecorderRef.current.start();
      setIsRecording(true);

      if (recordingTimerRef.current) clearTimeout(recordingTimerRef.current);
      recordingTimerRef.current = setTimeout(() => {
        stopRecording();
      }, 5000);

      console.log("Recording started");
    } catch (error) {
      console.error("Error starting recording:", error);
      setError("Failed to start recording. Please try again.");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRecording, isSpeaking]);

  // Set up utterance and initiate speech
  const setupUtteranceAndSpeak = useCallback(
    (utterance: SpeechSynthesisUtterance) => {
      // Set voice properties; adjust as needed for emotion or pitch.
      utterance.rate = 1.0;
      utterance.pitch = 1.0;

      // When speech starts, mark speaking and stop recording.
      utterance.onstart = () => {
        console.log("Speech started");
        setIsSpeaking(true);
        stopRecording();
      };

      // When speech ends, update state and restart recording only if call is active.
      utterance.onend = () => {
        console.log("Speech ended");
        setIsSpeaking(false);
        if (callActiveRef.current && !processingRef.current) {
          startRecording();
        }
      };

      // If error occurs, log it, update state, and try restarting recording if still active.
      utterance.onerror = (event) => {
        console.error("Speech error:", event);
        setIsSpeaking(false);
        if (callActiveRef.current && !processingRef.current) {
          startRecording();
        }
      };

      window.speechSynthesis.speak(utterance);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [startRecording]
  );

  // Speak text using speech synthesis
  const speakText = useCallback(
    (text: string) => {
      if (!text) return;

      // Cancel any ongoing speech
      if (window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel();
      }

      const utterance = new SpeechSynthesisUtterance(text);

      let voices = window.speechSynthesis.getVoices();
      // If voices are not loaded yet, wait a short period and try again.
      if (!voices.length) {
        setTimeout(() => {
          voices = window.speechSynthesis.getVoices();
          if (voices.length) {
            const femaleVoice = voices.find(
              (v) =>
                v.name.toLowerCase().includes("female") ||
                v.name.toLowerCase().includes("samantha") ||
                v.name.toLowerCase().includes("google uk english female")
            );
            if (femaleVoice) {
              utterance.voice = femaleVoice;
            }
          }
          setupUtteranceAndSpeak(utterance);
        }, 100);
      } else {
        const femaleVoice = voices.find(
          (v) =>
            v.name.toLowerCase().includes("female") ||
            v.name.toLowerCase().includes("samantha") ||
            v.name.toLowerCase().includes("google uk english female")
        );
        if (femaleVoice) {
          utterance.voice = femaleVoice;
        }
        setupUtteranceAndSpeak(utterance);
      }
    },
    [setupUtteranceAndSpeak]
  );

  // Process recorded audio chunks
  const processAudioChunk = useCallback(
    async (audioBlob: Blob) => {
      if (!threadId || !assistantId || processingRef.current) return;
      if (audioBlob.size < 1000) return; // Skip if too small

      setIsProcessing(true);
      processingRef.current = true;

      try {
        const transcribedText = await transcribeAudio(audioBlob);

        if (!transcribedText || transcribedText.trim() === "") {
          console.log("No speech detected");
          return;
        }

        console.log("Transcribed:", transcribedText);
        setTranscript(transcribedText);

        const userMessage: Message = {
          id: `user-${Date.now()}`,
          role: "user",
          content: transcribedText,
          timestamp: new Date(),
        };

        if (onMessageReceived) onMessageReceived(userMessage);

        await addMessageToThread(threadId, transcribedText);

        const assistantMessages = await runAssistant(
          threadId,
          assistantId,
          aiPersonality,
          handleToolCalls
        );

        if (assistantMessages && assistantMessages.length > 0) {
          const response = assistantMessages[assistantMessages.length - 1];

          const assistantMessage: Message = {
            id: response.id,
            role: "assistant",
            content: response.content,
            timestamp: response.createdAt,
          };

          if (onMessageReceived) onMessageReceived(assistantMessage);

          // Speak the response
          speakText(response.content);
        }
      } catch (error) {
        console.error("Error processing audio:", error);
        setError("Failed to process your speech. Please try again.");
      } finally {
        setIsProcessing(false);
        processingRef.current = false;
      }
    },
    [
      threadId,
      assistantId,
      aiPersonality,
      handleToolCalls,
      onMessageReceived,
      speakText,
    ]
  );

  // Start recording

  // Stop recording
  const stopRecording = useCallback(() => {
    if (!mediaRecorderRef.current || !isRecording) return;

    try {
      if (mediaRecorderRef.current.state === "recording") {
        mediaRecorderRef.current.stop();
        setIsRecording(false);
        if (recordingTimerRef.current) {
          clearTimeout(recordingTimerRef.current);
          recordingTimerRef.current = null;
        }
        console.log("Recording stopped");
      }
    } catch (error) {
      console.error("Error stopping recording:", error);
    }
  }, [isRecording]);

  // Start voice call
  const startCall = useCallback(async () => {
    try {
      setError(null);
      setIsCallActive(true);
      callActiveRef.current = true;

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      streamRef.current = stream;

      const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        if (chunksRef.current.length > 0) {
          const audioBlob = new Blob(chunksRef.current, { type: "audio/webm" });
          await processAudioChunk(audioBlob);
          if (callActiveRef.current && !processingRef.current && !isSpeaking) {
            startRecording();
          }
        }
      };

      mediaRecorderRef.current = recorder;
      startCallTimer();

      // Send initial greeting
      if (threadId && assistantId) {
        await addMessageToThread(
          threadId,
          "Hello, I'd like to start a voice conversation."
        );
        const messages = await runAssistant(
          threadId,
          assistantId,
          aiPersonality,
          handleToolCalls
        );
        if (messages && messages.length > 0) {
          const greeting = messages[messages.length - 1];
          const greetingMessage: Message = {
            id: greeting.id,
            role: "assistant",
            content: greeting.content,
            timestamp: greeting.createdAt,
          };
          if (onMessageReceived) onMessageReceived(greetingMessage);
          speakText(greeting.content);
        }
      }

      toast.success("Voice call started");
    } catch (error) {
      console.error("Error starting call:", error);
      setError("Could not access microphone. Please check permissions.");
      setIsCallActive(false);
      callActiveRef.current = false;
      toast.error("Failed to start voice call");
    }
  }, [
    threadId,
    assistantId,
    aiPersonality,
    handleToolCalls,
    startCallTimer,
    startRecording,
    onMessageReceived,
    speakText,
    processAudioChunk,
    isSpeaking,
  ]);

  // End call
  const endCall = useCallback(() => {
    console.log("Ending call");

    if (window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
    }

    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state === "recording"
    ) {
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {
        console.error("Error stopping recorder:", e);
      }
    }

    if (streamRef.current) {
      try {
        streamRef.current.getTracks().forEach((track) => track.stop());
      } catch (e) {
        console.error("Error stopping audio tracks:", e);
      }
    }

    if (callTimerRef.current) {
      clearInterval(callTimerRef.current);
      callTimerRef.current = null;
    }

    if (recordingTimerRef.current) {
      clearTimeout(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }

    setIsCallActive(false);
    callActiveRef.current = false;
    setIsRecording(false);
    setIsSpeaking(false);
    setIsProcessing(false);
    setCallDuration(0);
    setTranscript("");

    mediaRecorderRef.current = null;
    streamRef.current = null;
    chunksRef.current = [];
    processingRef.current = false;

    if (onEndCall) onEndCall();
    toast.info("Voice call ended");
  }, [onEndCall]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (isCallActive) {
        endCall();
      }
    };
  }, [endCall, isCallActive]);

  return (
    <div className="flex flex-col items-center justify-center h-full px-4 py-6 bg-gray-50 dark:bg-gray-800 rounded-lg">
      {isCallActive ? (
        <>
          <div className="text-center mb-6">
            <h3 className="text-lg font-semibold mb-2">
              Voice Call with Niblet
            </h3>
            <div className="text-2xl font-bold mb-4">
              {formatTime(callDuration)}
            </div>

            <div className="flex flex-wrap justify-center gap-2 mb-4">
              {isRecording && (
                <div className="px-3 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded-full text-sm flex items-center">
                  <span className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></span>
                  Listening
                </div>
              )}

              {isProcessing && (
                <div className="px-3 py-1 bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 rounded-full text-sm flex items-center">
                  <span className="w-2 h-2 bg-yellow-500 rounded-full mr-2 animate-pulse"></span>
                  Processing
                </div>
              )}

              {isSpeaking && (
                <div className="px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full text-sm flex items-center">
                  <span className="w-2 h-2 bg-blue-500 rounded-full mr-2 animate-pulse"></span>
                  Speaking
                </div>
              )}
            </div>

            {transcript && (
              <div className="bg-white dark:bg-gray-700 p-3 rounded-lg mb-6 max-w-md mx-auto text-left">
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                  You said:
                </div>
                <p className="text-sm">{transcript}</p>
              </div>
            )}

            <div className="flex gap-4 justify-center">
              <Button
                variant={isRecording ? "default" : "outline"}
                size="icon"
                onClick={() =>
                  isRecording ? stopRecording() : startRecording()
                }
                disabled={isSpeaking || isProcessing}
                className="h-12 w-12"
              >
                {isRecording ? (
                  <Mic className="h-5 w-5" />
                ) : (
                  <MicOff className="h-5 w-5" />
                )}
              </Button>

              <Button variant="destructive" onClick={endCall} className="px-4">
                <PhoneOff className="h-5 w-5 mr-2" />
                End Call
              </Button>
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="text-center mb-6">
            <h3 className="text-lg font-semibold mb-4">
              Start a voice conversation with Niblet
            </h3>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              Talk to your AI nutrition assistant using your voice
            </p>

            <Button onClick={startCall} className="px-4">
              <Phone className="h-5 w-5 mr-2" />
              Start Voice Call
            </Button>
          </div>
        </>
      )}

      {error && (
        <div className="mt-4 p-3 bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 rounded-md text-sm">
          {error}
        </div>
      )}
    </div>
  );
};

export default VoiceChat;

// components/VoiceChatModal.tsx
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { PersonalityKey } from "@/lib/assistantService";
import { Message } from "@/types/chat";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "./ui/button";
import VoiceChat from "./VoiceChat";

interface VoiceChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  threadId: string | null;
  assistantId: string | null;
  aiPersonality: PersonalityKey;
  onMessageReceived?: (message: Message) => void;
  onMealLogged?: () => void;
  onWeightLogged?: () => void;
}

export default function VoiceChatModal({
  isOpen,
  onClose,
  threadId,
  assistantId,
  aiPersonality,
  onMessageReceived,
  onMealLogged,
  onWeightLogged,
}: VoiceChatModalProps) {
  const [isMobileView, setIsMobileView] = useState(false);

  // Check viewport size on mount and resize
  useEffect(() => {
    const checkViewport = () => {
      setIsMobileView(window.innerWidth < 768);
    };

    // Initial check
    checkViewport();

    // Listen for resize events
    window.addEventListener("resize", checkViewport);

    // Cleanup
    return () => window.removeEventListener("resize", checkViewport);
  }, []);

  // For mobile: use a full-screen div with animation
  if (isMobileView) {
    return (
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm"
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            transition={{ type: "spring", bounce: 0.1, duration: 0.4 }}
          >
            <div className="relative h-full w-full p-4 pb-16 overflow-hidden flex flex-col">
              {/* Close button */}
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-4 right-4 z-10"
                onClick={onClose}
              >
                <X className="h-5 w-5" />
              </Button>

              {/* Content wrapper with scroll if needed */}
              <div className="flex-1 overflow-auto rounded-xl">
                <VoiceChat
                  threadId={threadId}
                  assistantId={assistantId}
                  aiPersonality={aiPersonality}
                  onMessageReceived={onMessageReceived}
                  onMealLogged={onMealLogged}
                  onWeightLogged={onWeightLogged}
                  onEndCall={onClose}
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    );
  }

  // For desktop: use Dialog component
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg md:max-w-xl lg:max-w-2xl p-0 overflow-hidden bg-background rounded-xl">
        <div className="flex flex-col h-[80vh] max-h-[700px]">
          {/* Header */}
          <div className="flex justify-between items-center py-3 px-6 border-b">
            <h2 className="text-xl font-semibold">Voice Assistant</h2>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-auto">
            <VoiceChat
              threadId={threadId}
              assistantId={assistantId}
              aiPersonality={aiPersonality}
              onMessageReceived={onMessageReceived}
              onMealLogged={onMealLogged}
              onWeightLogged={onWeightLogged}
              onEndCall={onClose}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

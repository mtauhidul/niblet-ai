import { PersonalityKey } from "@/lib/assistantService";
import { Message } from "@/types/chat";
import React from "react";
import EnhancedVoiceChat from "./VoiceChat";

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

const VoiceChatModal: React.FC<VoiceChatModalProps> = ({
  isOpen,
  onClose,
  threadId,
  assistantId,
  aiPersonality,
  onMessageReceived,
  onMealLogged,
  onWeightLogged,
}) => {
  return (
    <EnhancedVoiceChat
      isOpen={isOpen}
      onClose={onClose}
      threadId={threadId}
      assistantId={assistantId}
      aiPersonality={aiPersonality}
      onMessageReceived={onMessageReceived}
      onMealLogged={onMealLogged}
      onWeightLogged={onWeightLogged}
    />
  );
};

export default VoiceChatModal;

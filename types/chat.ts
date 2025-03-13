// types/chat.ts
export interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
  imageUrl?: string;
  isStreaming?: boolean; // Add this flag to indicate streaming
}

export interface AssistantMessage {
  id: string;
  content: string;
  createdAt: Date;
  role?: string;
}

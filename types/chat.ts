// types/chat.ts
export interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
  imageUrl?: string;
}

export interface AssistantMessage {
  id: string;
  content: string;
  createdAt: Date;
  role?: string;
}

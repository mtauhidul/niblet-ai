// lib/configManager.ts
import { PersonalityKey } from "@/lib/assistantService";

// Types
export interface AIPersonality {
  name: string;
  instructions: string;
  temperature: number;
  isActive: boolean;
}

export interface AISettings {
  personalities: Record<string, AIPersonality>;
  defaultPersonality: string;
  generalInstructions: string;
}

export interface Notification {
  id: number;
  title: string;
  message: string;
  triggerTime: string;
  daysActive: string[];
  isActive: boolean;
}

// Default configurations
const DEFAULT_AI_SETTINGS: AISettings = {
  personalities: {
    "best-friend": {
      name: "Niblet (Best Friend)",
      instructions:
        "You are Niblet, a friendly and supportive AI meal tracking assistant. Speak in a warm, casual tone like you're talking to a close friend. Use encouraging language, be empathetic, and occasionally add friendly emojis. Make the user feel comfortable sharing their food choices without judgment. Celebrate their wins and provide gentle guidance when they need it. Your goal is to help users track their meals, estimate calories, and provide nutritional guidance in a fun, approachable way.",
      temperature: 0.7,
      isActive: true,
    },
    "professional-coach": {
      name: "Niblet (Professional Coach)",
      instructions:
        "You are Niblet, a professional nutrition coach and meal tracking assistant. Maintain a supportive but data-driven approach. Speak with authority and precision, focusing on nutritional facts and measurable progress. Use a structured, clear communication style. Provide detailed nutritional breakdowns and specific, actionable advice based on the user's goals. Your responses should be informative, evidence-based, and focused on optimizing the user's nutrition for their specific goals.",
      temperature: 0.3,
      isActive: true,
    },
    "tough-love": {
      name: "Niblet (Tough Love)",
      instructions:
        "You are Niblet, a no-nonsense, tough-love meal tracking assistant. Be direct, straightforward, and push users to be accountable. Don't sugarcoat feedback - if they're making poor choices, tell them directly. Use motivational language that challenges them to do better. Focus on results and holding users to high standards. Your goal is to push users out of their comfort zone, call out excuses, and drive real behavioral change through direct accountability.",
      temperature: 0.5,
      isActive: true,
    },
  },
  defaultPersonality: "best-friend",
  generalInstructions:
    "You are Niblet, an AI assistant specialized in meal tracking, nutrition, and weight management. Your primary role is to help users log their meals, track their calorie intake, monitor their weight progress, and reach their health goals through better nutrition. Always be helpful, supportive, and knowledgeable about nutrition topics.",
};

const DEFAULT_NOTIFICATIONS: Notification[] = [
  {
    id: 1,
    title: "Meal Reminder",
    message: "Time to plan your lunch! What are you thinking of eating today?",
    triggerTime: "11:30",
    daysActive: ["monday", "tuesday", "wednesday", "thursday", "friday"],
    isActive: true,
  },
  {
    id: 2,
    title: "Weight Check-in",
    message:
      "Good morning! Time for your weekly weigh-in. How's your progress this week?",
    triggerTime: "08:00",
    daysActive: ["monday"],
    isActive: true,
  },
];

// Get AI settings from storage
export function getAISettings(): AISettings {
  if (typeof window === "undefined") return DEFAULT_AI_SETTINGS;

  try {
    const savedSettings = localStorage.getItem("niblet-ai-settings");
    if (savedSettings) {
      return JSON.parse(savedSettings);
    }
  } catch (error) {
    console.error("Error loading AI settings:", error);
  }

  return DEFAULT_AI_SETTINGS;
}

// Save AI settings to storage
export function saveAISettings(settings: AISettings): boolean {
  try {
    localStorage.setItem("niblet-ai-settings", JSON.stringify(settings));
    return true;
  } catch (error) {
    console.error("Error saving AI settings:", error);
    return false;
  }
}

// Get notifications from storage
export function getNotifications(): Notification[] {
  if (typeof window === "undefined") return DEFAULT_NOTIFICATIONS;

  try {
    const savedNotifications = localStorage.getItem("niblet-notifications");
    if (savedNotifications) {
      return JSON.parse(savedNotifications);
    }
  } catch (error) {
    console.error("Error loading notifications:", error);
  }

  return DEFAULT_NOTIFICATIONS;
}

// Save notifications to storage
export function saveNotifications(notifications: Notification[]): boolean {
  try {
    localStorage.setItem("niblet-notifications", JSON.stringify(notifications));
    return true;
  } catch (error) {
    console.error("Error saving notifications:", error);
    return false;
  }
}

// Get current personality instructions based on key
export function getPersonalityInstructions(
  personalityKey: PersonalityKey
): string {
  const settings = getAISettings();
  const personality = settings.personalities[personalityKey];

  if (!personality || !personality.isActive) {
    // Fallback to default if personality not found or not active
    return (
      settings.personalities[settings.defaultPersonality]?.instructions ||
      settings.generalInstructions
    );
  }

  // Combine general instructions with personality-specific instructions
  return `${settings.generalInstructions}\n\n${personality.instructions}`;
}

// Get the temperature for a specific personality
export function getTemperatureForPersonality(
  personalityKey: PersonalityKey
): number {
  const settings = getAISettings();
  const personality = settings.personalities[personalityKey];

  if (!personality || !personality.isActive) {
    // Fallback to default if personality not found or not active
    return (
      settings.personalities[settings.defaultPersonality]?.temperature || 0.5
    );
  }

  return personality.temperature;
}

// Get the default personality
export function getDefaultPersonality(): PersonalityKey {
  const settings = getAISettings();
  return settings.defaultPersonality as PersonalityKey;
}

// Check if a notification should be triggered
export function shouldTriggerNotification(notification: Notification): boolean {
  if (!notification.isActive) return false;

  const now = new Date();
  const dayOfWeek = now
    .toLocaleDateString("en-US", { weekday: "long" })
    .toLowerCase();
  const currentTime = now.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  // Check if notification should trigger based on day and time
  return (
    notification.daysActive.includes(dayOfWeek) &&
    notification.triggerTime === currentTime
  );
}

// Get all notifications that should trigger at the current time
export function getCurrentNotifications(): Notification[] {
  const allNotifications = getNotifications();
  return allNotifications.filter((notification) =>
    shouldTriggerNotification(notification)
  );
}

// context/AppConfigContext.tsx
"use client";

import { PersonalityKey } from "@/lib/assistantService";
import {
  AISettings,
  Notification,
  getAISettings,
  getDefaultPersonality,
  getNotifications,
  saveAISettings,
  saveNotifications,
} from "@/lib/configManager";
import {
  ReactNode,
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";

// Define context types
interface AppConfigContextType {
  // AI Settings
  aiSettings: AISettings;
  updateAISettings: (settings: AISettings) => void;

  // Notifications
  notifications: Notification[];
  updateNotifications: (notifications: Notification[]) => void;

  // Current personality (for the logged-in user)
  currentPersonality: PersonalityKey;
  setCurrentPersonality: (personality: PersonalityKey) => void;

  // Admin status
  isAdmin: boolean;
}

// Create the context
const AppConfigContext = createContext<AppConfigContextType | undefined>(
  undefined
);

// Props for the provider component
interface AppConfigProviderProps {
  children: ReactNode;
  initialIsAdmin?: boolean;
}

// Configuration provider component
export function AppConfigProvider({
  children,
  initialIsAdmin = false,
}: AppConfigProviderProps) {
  // State for AI settings
  const [aiSettings, setAISettings] = useState<AISettings>(() =>
    getAISettings()
  );

  // State for notifications
  const [notifications, setNotifications] = useState<Notification[]>(() =>
    getNotifications()
  );

  // State for current personality
  const [currentPersonality, setCurrentPersonality] = useState<PersonalityKey>(
    () => getDefaultPersonality()
  );

  // State for admin status
  const [isAdmin, setIsAdmin] = useState<boolean>(initialIsAdmin);

  // Load saved settings on mount
  useEffect(() => {
    // Only run in browser environment
    if (typeof window !== "undefined") {
      setAISettings(getAISettings());
      setNotifications(getNotifications());

      // Load saved personality from localStorage if available
      const savedPersonality = localStorage.getItem(
        "niblet-current-personality"
      );
      if (savedPersonality) {
        setCurrentPersonality(savedPersonality as PersonalityKey);
      } else {
        setCurrentPersonality(getDefaultPersonality());
      }
    }
  }, []);

  // Update AI settings and persist changes
  const updateAISettings = (settings: AISettings) => {
    setAISettings(settings);
    saveAISettings(settings);
  };

  // Update notifications and persist changes
  const updateNotifications = (newNotifications: Notification[]) => {
    setNotifications(newNotifications);
    saveNotifications(newNotifications);
  };

  // Handle personality change and persist choice
  const handleSetCurrentPersonality = (personality: PersonalityKey) => {
    setCurrentPersonality(personality);
    localStorage.setItem("niblet-current-personality", personality);
  };

  // Context value
  const value: AppConfigContextType = {
    aiSettings,
    updateAISettings,
    notifications,
    updateNotifications,
    currentPersonality,
    setCurrentPersonality: handleSetCurrentPersonality,
    isAdmin,
  };

  return (
    <AppConfigContext.Provider value={value}>
      {children}
    </AppConfigContext.Provider>
  );
}

// Custom hook for using the context
export function useAppConfig() {
  const context = useContext(AppConfigContext);

  if (context === undefined) {
    throw new Error("useAppConfig must be used within an AppConfigProvider");
  }

  return context;
}

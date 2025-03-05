// components/AppWrapper.tsx
"use client";

import { Toaster } from "@/components/ui/sonner";
import { checkOpenAIAvailability } from "@/lib/assistantService";
import dynamic from "next/dynamic";
import { ReactNode, useEffect, useState } from "react";
import ErrorBoundary from "./ErrorBoundary";

// Import AuthProvider dynamically with no SSR to avoid hydration mismatch
const AuthProvider = dynamic(() => import("./AuthProvider"), { ssr: false });

interface AppWrapperProps {
  children: ReactNode;
}

export default function AppWrapper({ children }: AppWrapperProps) {
  const [isOnline, setIsOnline] = useState(true);
  const [apiAvailable, setApiAvailable] = useState(true);

  // Check for online/offline status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    // Set initial status
    setIsOnline(navigator.onLine);

    // Check API availability on mount
    const checkAPI = async () => {
      const available = await checkOpenAIAvailability();
      setApiAvailable(available);
    };
    checkAPI();

    // Add event listeners
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Clean up
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Show offline message if needed
  const OfflineMessage = () => (
    <div className="fixed bottom-4 left-4 z-50 bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 px-4 py-2 rounded-md shadow-md">
      {!isOnline ? (
        <span>You are offline. Some features may be unavailable.</span>
      ) : !apiAvailable ? (
        <span>
          API services unavailable. Some features may not work properly.
        </span>
      ) : null}
    </div>
  );

  return (
    <ErrorBoundary>
      <AuthProvider>
        {children}
        {(!isOnline || !apiAvailable) && <OfflineMessage />}
        <Toaster position="top-center" closeButton richColors />
      </AuthProvider>
    </ErrorBoundary>
  );
}

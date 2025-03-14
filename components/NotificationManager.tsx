// components/NotificationManager.tsx

"use client";
import { useAppConfig } from "@/context/AppConfigContext";
import { Bell } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

const NotificationManager: React.FC = () => {
  const { notifications } = useAppConfig();
  const [lastCheckTime, setLastCheckTime] = useState<string>("");
  const checkIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Check for notifications that should be triggered
  const checkNotifications = () => {
    // Get current time as string in format HH:MM
    const now = new Date();
    const currentTime = now.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });

    // If we've already checked at this exact minute, skip
    if (currentTime === lastCheckTime) return;

    // Update last check time
    setLastCheckTime(currentTime);

    // Get day of week as lowercase string (monday, tuesday, etc.)
    const currentDayOfWeek = now
      .toLocaleDateString("en-US", {
        weekday: "long",
      })
      .toLowerCase();

    // Find notifications that should trigger now
    const triggeredNotifications = notifications.filter((notification) => {
      // Skip inactive notifications
      if (!notification.isActive) return false;

      // Check if day matches
      const isDayMatch = notification.daysActive.includes(currentDayOfWeek);
      if (!isDayMatch) return false;

      // Check if time matches (HH:MM format)
      return notification.triggerTime === currentTime;
    });

    // Show toast notifications for each triggered notification
    triggeredNotifications.forEach((notification) => {
      toast(
        <div className="flex flex-col">
          <span className="font-medium">{notification.title}</span>
          <span className="text-sm mt-1">{notification.message}</span>
        </div>,
        {
          duration: 10000, // Show for 10 seconds
          icon: <Bell className="h-5 w-5 text-blue-500" />,
          action: {
            label: "Open Chat",
            onClick: () => {
              // You could add logic here to open the chat with this notification
              console.log("Open chat with notification:", notification.id);
            },
          },
        }
      );
    });
  };

  // Set up interval to check notifications
  useEffect(() => {
    // Check immediately on mount
    checkNotifications();

    // Set up interval to check every 30 seconds
    checkIntervalRef.current = setInterval(checkNotifications, 30 * 1000);

    // Clean up interval on unmount
    return () => {
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notifications]); // Re-initialize when notifications change

  // This component doesn't render anything visible
  return null;
};

export default NotificationManager;

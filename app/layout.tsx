// app/layout.tsx
// app/layout.tsx
import AppWrapper from "@/components/AppWrapper";
import NotificationManager from "@/components/NotificationManager";
import { AppConfigProvider } from "@/context/AppConfigContext";
import { Metadata } from "next";
import React from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Niblet.ai - AI-Powered Meal Tracking Assistant",
  description: "Track your meals, calories, and nutrition with AI assistance",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        suppressHydrationWarning
        className=" bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-50"
      >
        <AppConfigProvider initialIsAdmin={false}>
          <AppWrapper>
            {children}
            <NotificationManager />
          </AppWrapper>
        </AppConfigProvider>
      </body>
    </html>
  );
}

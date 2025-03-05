// app/layout.tsx
import AppWrapper from "@/components/AppWrapper";
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
      <body suppressHydrationWarning>
        <AppWrapper>{children}</AppWrapper>
      </body>
    </html>
  );
}

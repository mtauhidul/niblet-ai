// components/AppWrapper.tsx
"use client";

import dynamic from "next/dynamic";
import { ReactNode } from "react";

// Import AuthProvider dynamically with no SSR to avoid hydration mismatch
const AuthProvider = dynamic(() => import("./AuthProvider"), { ssr: false });

export default function AppWrapper({ children }: { children: ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}

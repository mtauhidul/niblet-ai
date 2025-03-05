"use client";

import { ReactNode } from "react";
import { AuthProvider } from "./AuthProvider";

export default function AppWrapper({ children }: { children: ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}

// components/AuthProvider.tsx
"use client";

import { auth } from "@/lib/firebase/clientApp";
import { onAuthStateChanged } from "firebase/auth";
import { SessionProvider } from "next-auth/react";
import { ReactNode, useEffect } from "react";

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  // Monitor Firebase auth state for client-side auth changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      // You can add additional logic here if needed
      console.log(
        "Auth state changed",
        user ? "User logged in" : "User logged out"
      );
    });

    // Cleanup subscription
    return () => unsubscribe();
  }, []);

  return <SessionProvider>{children}</SessionProvider>;
};

export default AuthProvider;

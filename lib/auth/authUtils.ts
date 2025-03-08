// lib/auth/authUtils.ts
import { clearAllMessagesCaches } from "@/lib/ChatHistoryManager";
import { auth } from "@/lib/firebase/clientApp";
import {
  browserLocalPersistence,
  GoogleAuthProvider,
  setPersistence,
  signInWithPopup,
} from "firebase/auth";
import {
  signIn as nextAuthSignIn,
  signOut as nextAuthSignOut,
} from "next-auth/react";
import { createOrUpdateUser } from "../firebase/models/user";

/**
 * Google sign-in that handles both Firebase Auth and NextAuth,
 * ensuring the user is stored in Firestore, and sets up a NextAuth session.
 */
export const signInWithGoogle = async (
  callbackUrl = "/dashboard"
): Promise<{ success: boolean; error?: string }> => {
  try {
    // Use browserLocalPersistence so the user stays logged in unless they sign out
    await setPersistence(auth, browserLocalPersistence);

    const provider = new GoogleAuthProvider();
    // Force user to pick an account each time
    provider.setCustomParameters({ prompt: "select_account" });

    // 1) Sign in with Firebase
    const result = await signInWithPopup(auth, provider);
    const user = result.user;

    // 2) Create or update user in Firestore
    await createOrUpdateUser({
      id: user.uid,
      name: user.displayName || undefined,
      email: user.email || undefined,
      image: user.photoURL || undefined,
    });

    // 3) Sign in with NextAuth
    const nextAuthResult = await nextAuthSignIn("google", {
      redirect: false, // We'll handle the redirect ourselves
    });

    if (nextAuthResult?.error) {
      throw new Error(nextAuthResult.error);
    }

    // 4) Manually redirect to callback URL
    window.location.href = callbackUrl;
    return { success: true };
  } catch (error: any) {
    console.error("Google sign in error:", error);
    return {
      success: false,
      error: error.message || "Failed to sign in with Google",
    };
  }
};

/**
 * Sign out from both Firebase and NextAuth, clearing localStorage chat caches.
 * This enhanced version ensures ALL chat data is removed completely.
 */
export const signOutFromAll = async (): Promise<boolean> => {
  try {
    if (typeof window === "undefined") return true;

    console.log("Starting comprehensive sign out process...");

    // 1) Clear all chat message caches
    clearAllMessagesCaches();

    // 2) Aggressively clear all related storage
    const totalKeys = localStorage.length;
    const removedKeys: string[] = [];

    // First, gather all keys that match our patterns
    const chatPatterns = [
      /^niblet_/,
      /assistant_/,
      /thread/i,
      /chat/i,
      /message/i,
      /cache/i,
      /personality/i,
      /^user_/,
    ];

    // Get all keys to remove
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;

      // Check if the key matches any of our patterns
      if (chatPatterns.some((pattern) => pattern.test(key))) {
        keysToRemove.push(key);
      }
    }

    // Now remove all the keys
    keysToRemove.forEach((key) => {
      try {
        localStorage.removeItem(key);
        removedKeys.push(key);
      } catch (err) {
        console.error(`Failed to remove key: ${key}`, err);
      }
    });

    console.log(
      `Cleared ${removedKeys.length} of ${totalKeys} items from localStorage`
    );
    console.log("Removed keys:", removedKeys);

    // 3) For complete certainty, clear sessionStorage too
    try {
      sessionStorage.clear();
      console.log("Cleared session storage");
    } catch (err) {
      console.error("Failed to clear session storage:", err);
    }

    // 4) Clear any indexedDB stores related to our app
    // This is more complex and would need implementation specific to any IndexedDB usage

    // 5) Sign out from Firebase
    await auth.signOut();
    console.log("Signed out from Firebase");

    // 6) Sign out from NextAuth with redirect
    await nextAuthSignOut({ callbackUrl: "/" });
    console.log("Signed out from NextAuth");

    // 7) As a fallback, reload the page if redirect doesn't happen
    setTimeout(() => {
      window.location.href = "/";
    }, 500);

    return true;
  } catch (error) {
    console.error("Sign out error:", error);

    // Force logout by redirecting anyway
    window.location.href = "/";
    return false;
  }
};

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
 */
export const signOutFromAll = async (): Promise<boolean> => {
  try {
    // 1) Clear all chat message caches so user’s conversation is gone
    clearAllMessagesCaches();

    // 2) Sign out from Firebase
    await auth.signOut();

    // 3) Sign out from NextAuth
    await nextAuthSignOut({ callbackUrl: "/" });

    return true;
  } catch (error) {
    console.error("Sign out error:", error);
    return false;
  }
};

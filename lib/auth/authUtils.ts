// lib/auth/authUtils.ts
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
 * Google sign-in function that handles both Firebase and NextAuth
 * with proper redirects
 */
export const signInWithGoogle = async (
  callbackUrl = "/dashboard"
): Promise<{ success: boolean; error?: string }> => {
  try {
    // First sign in with Firebase to create/authenticate the user
    await setPersistence(auth, browserLocalPersistence);

    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });

    const result = await signInWithPopup(auth, provider);
    const user = result.user;

    // Store user in Firestore
    await createOrUpdateUser({
      id: user.uid,
      name: user.displayName || undefined,
      email: user.email || undefined,
      image: user.photoURL || undefined,
    });

    // Then sign in with NextAuth to establish session
    const nextAuthResult = await nextAuthSignIn("google", {
      redirect: false, // Don't redirect immediately
    });

    if (nextAuthResult?.error) {
      throw new Error(nextAuthResult.error);
    }

    // Manually redirect to callback URL
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
 * Signs out from both Firebase and NextAuth
 */
export const signOutFromAll = async (): Promise<boolean> => {
  try {
    // Sign out from Firebase
    await auth.signOut();

    // Sign out from NextAuth
    await nextAuthSignOut({ callbackUrl: "/" });

    return true;
  } catch (error) {
    console.error("Sign out error:", error);
    return false;
  }
};

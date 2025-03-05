// lib/auth/authUtils.ts
import { auth } from "@/lib/firebase/clientApp";
import {
  User as FirebaseUser,
  GoogleAuthProvider,
  signInWithPopup,
} from "firebase/auth";
import {
  signIn as nextAuthSignIn,
  signOut as nextAuthSignOut,
} from "next-auth/react";
import { createOrUpdateUser } from "../firebase/models/user";

/**
 * Handles sign in with Google, syncing both Firebase and NextAuth
 */
export const signInWithGoogle = async (
  callbackUrl = "/dashboard"
): Promise<{ success: boolean; error?: string }> => {
  try {
    // 1. Sign in with Firebase
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);
    const user = result.user;

    // 2. Create or update user in Firestore
    await saveUserToFirestore(user);

    // 3. Sign in with NextAuth to establish session
    await nextAuthSignIn("google", { callbackUrl, redirect: true });

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

/**
 * Saves Firebase user to Firestore
 */
const saveUserToFirestore = async (user: FirebaseUser): Promise<void> => {
  try {
    await createOrUpdateUser({
      id: user.uid,
      name: user.displayName || undefined,
      email: user.email || undefined,
      image: user.photoURL || undefined,
    });
  } catch (error) {
    console.error("Error saving user to Firestore:", error);
    throw error;
  }
};

/**
 * Determine if user needs onboarding
 * This can be called after authentication to check if user should be redirected to onboarding
 */
export const checkNeedsOnboarding = async (
  userId: string
): Promise<boolean> => {
  try {
    // You would need to implement this function to check your database
    // For example, checking if the onboardingCompleted flag is set in the user profile
    const userProfile = await import("../firebase/models/user").then((module) =>
      module.getUserProfile(userId)
    );

    return !userProfile || !userProfile.onboardingCompleted;
  } catch (error) {
    console.error("Error checking onboarding status:", error);
    // Default to needing onboarding if there's an error
    return true;
  }
};

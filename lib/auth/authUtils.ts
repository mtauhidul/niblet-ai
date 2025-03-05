// lib/auth/authUtils.ts
import { auth } from "@/lib/firebase/clientApp";
import {
  browserLocalPersistence,
  User as FirebaseUser,
  GoogleAuthProvider,
  setPersistence,
  signInWithPopup,
} from "firebase/auth";
import {
  signIn as nextAuthSignIn,
  signOut as nextAuthSignOut,
} from "next-auth/react";
import { createOrUpdateUser, getUserProfile } from "../firebase/models/user";

/**
 * Improved Google sign-in function that handles both Firebase and NextAuth
 */
export const signInWithGoogle = async (
  callbackUrl = "/dashboard"
): Promise<{ success: boolean; error?: string }> => {
  try {
    // Use NextAuth's built-in Google provider
    const result = await nextAuthSignIn("google", {
      callbackUrl,
      redirect: false,
    });

    // Check if NextAuth sign-in was successful
    if (result?.error) {
      console.error("NextAuth Google sign-in error:", result.error);
      return {
        success: false,
        error: result.error || "Failed to sign in with Google",
      };
    }

    // If successful, manually redirect - this helps avoid redirect_uri mismatch errors
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
 * Original Firebase-specific Google sign-in as backup
 */
export const signInWithGoogleFirebase = async () => {
  try {
    // Set persistence to LOCAL to keep user logged in
    await setPersistence(auth, browserLocalPersistence);

    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({
      prompt: "select_account",
    });

    const result = await signInWithPopup(auth, provider);
    const user = result.user;

    // Store user in Firestore
    await saveUserToFirestore(user);

    return user;
  } catch (error: any) {
    console.error("Firebase Google sign in error:", error);
    throw error;
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
    const userProfile = await getUserProfile(userId);
    return !userProfile || !userProfile.onboardingCompleted;
  } catch (error) {
    console.error("Error checking onboarding status:", error);
    // Default to needing onboarding if there's an error
    return true;
  }
};

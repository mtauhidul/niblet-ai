// lib/auth/authService.ts

import { db } from "@/lib/firebase/clientApp";
import { UserProfile } from "@/lib/firebase/models/user";
import { createUserWithEmailAndPassword, getAuth } from "firebase/auth";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  where,
} from "firebase/firestore";
// lib/auth/authService.ts
// Add this function to your existing authService.ts file

import { updateDoc } from "firebase/firestore";

/**
 * Get a user profile by ID from Firestore
 * @param userId The ID of the user to fetch
 * @returns Promise with the user profile data or null if not found
 */
export async function getUserProfileById(
  userId: string
): Promise<UserProfile | null> {
  try {
    const userProfileRef = doc(db, "userProfiles", userId);
    const userProfileSnap = await getDoc(userProfileRef);

    if (userProfileSnap.exists()) {
      const data = userProfileSnap.data();
      return {
        ...(data as UserProfile),
        id: userProfileSnap.id,
        userId: data.userId,
      };
    }

    return null;
  } catch (error) {
    console.error("Error fetching user profile:", error);
    return null;
  }
}

/**
 * Update a user profile in Firestore
 * @param userId The ID of the user to update
 * @param data The profile data to update
 * @returns Promise with the updated user profile data
 */
export async function updateUserProfile(
  userId: string,
  data: Partial<UserProfile>
): Promise<UserProfile | null> {
  try {
    // Reference to the user profile document
    const userProfileRef = doc(db, "userProfiles", userId);

    // Get the current profile to check if it exists
    const userProfileSnap = await getDoc(userProfileRef);

    if (!userProfileSnap.exists()) {
      console.error(`User profile not found for ID: ${userId}`);
      return null;
    }

    // Add updatedAt timestamp to the data
    const updateData = {
      ...data,
      updatedAt: new Date(),
    };

    // Update the document
    await updateDoc(userProfileRef, updateData);

    // Get the updated document
    const updatedSnap = await getDoc(userProfileRef);
    const updatedData = updatedSnap.data();

    return {
      ...updatedData,
      id: updatedSnap.id,
    } as UserProfile;
  } catch (error) {
    console.error("Error updating user profile:", error);
    throw error;
  }
}

/**
 * Check if a user with the given email already exists
 */
export async function emailExists(email: string): Promise<boolean> {
  try {
    // Normalize email to lowercase
    const normalizedEmail = email.toLowerCase();

    // Query users by email field
    const usersRef = collection(db, "users");
    const q = query(usersRef, where("email", "==", normalizedEmail));
    const snapshot = await getDocs(q);

    return !snapshot.empty;
  } catch (error) {
    console.error("Error checking email existence:", error);
    throw error;
  }
}

/**
 * Register a new user with email and password
 */
export async function registerUser({
  name,
  email,
  password,
}: {
  name: string;
  email: string;
  password: string;
}): Promise<any> {
  try {
    // First check if email exists
    const exists = await emailExists(email);
    if (exists) {
      throw new Error("Email already in use");
    }

    // Create Firebase auth user
    const auth = getAuth();
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      email,
      password
    );
    const user = userCredential.user;

    // Create user document with userId as document ID, not with email as ID
    const userDocRef = doc(db, "users", user.uid);
    await setDoc(userDocRef, {
      uid: user.uid,
      name: name,
      email: email.toLowerCase(), // Normalize email
      createdAt: new Date(),
    });

    // Also create userProfile document
    const profileDocRef = doc(db, "userProfiles", user.uid);
    await setDoc(profileDocRef, {
      userId: user.uid,
      name: name,
      email: email.toLowerCase(),
      onboardingCompleted: false,
      createdAt: new Date(),
    });

    return {
      id: user.uid,
      email: user.email,
      name: name,
    };
  } catch (error) {
    console.error("Error registering user:", error);
    throw error;
  }
}

/**
 * Create a user document for OAuth users (Google, Facebook)
 */
export async function createOAuthUser(
  userId: string,
  name: string | null,
  email: string | null
): Promise<any> {
  try {
    if (!email) {
      throw new Error("Email is required");
    }

    // Check if user document already exists
    const userDocRef = doc(db, "users", userId);
    const userDoc = await getDoc(userDocRef);

    if (userDoc.exists()) {
      // User already exists, just return
      return userDoc.data();
    }

    // Check if email is already used by another user
    const exists = await emailExists(email);
    if (exists) {
      throw new Error("Email already in use by another account");
    }

    // Create new user document
    const userData = {
      uid: userId,
      name: name || "User",
      email: email.toLowerCase(),
      createdAt: new Date(),
    };

    await setDoc(userDocRef, userData);

    // Create userProfile document
    const profileDocRef = doc(db, "userProfiles", userId);
    await setDoc(profileDocRef, {
      userId: userId,
      name: name || "User",
      email: email.toLowerCase(),
      onboardingCompleted: false,
      createdAt: new Date(),
    });

    return userData;
  } catch (error) {
    console.error("Error creating OAuth user:", error);
    throw error;
  }
}

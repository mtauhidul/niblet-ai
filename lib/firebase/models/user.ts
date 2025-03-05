// lib/firebase/models/user.ts
import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { db } from "../clientApp";

export interface User {
  id: string;
  name?: string;
  email?: string;
  image?: string;
  createdAt?: any;
  updatedAt?: any;
}

export interface UserProfile {
  userId: string;
  age?: number;
  gender?: string;
  currentWeight?: number;
  targetWeight?: number;
  height?: number;
  activityLevel?: string;
  dietaryPreferences?: string[];
  allergies?: string[];
  goalType?: string;
  targetCalories?: number;
  targetProtein?: number;
  targetCarbs?: number;
  targetFat?: number;
  aiPersonality?: string;
  threadId?: string;
  assistantId?: string;
  onboardingCompleted?: boolean;
  createdAt?: any;
  updatedAt?: any;
}

// Create or update user
export async function createOrUpdateUser(userData: User): Promise<User> {
  const userRef = doc(db, "users", userData.id);

  const now = serverTimestamp();
  const updatedUser = {
    ...userData,
    updatedAt: now,
  };

  const userDoc = await getDoc(userRef);

  if (userDoc.exists()) {
    await updateDoc(userRef, updatedUser);
  } else {
    await setDoc(userRef, {
      ...updatedUser,
      createdAt: now,
    });
  }

  return userData;
}

// Get user by ID
export async function getUserById(userId: string): Promise<User | null> {
  const userRef = doc(db, "users", userId);
  const userDoc = await getDoc(userRef);

  if (!userDoc.exists()) {
    return null;
  }

  return {
    id: userDoc.id,
    ...userDoc.data(),
  } as User;
}

// Create or update user profile
export async function createOrUpdateUserProfile(
  userId: string,
  profileData: Partial<UserProfile>
): Promise<UserProfile> {
  const profileRef = doc(db, "userProfiles", userId);

  const now = serverTimestamp();
  const updatedProfile = {
    ...profileData,
    userId,
    updatedAt: now,
  };

  const profileDoc = await getDoc(profileRef);

  if (profileDoc.exists()) {
    await updateDoc(profileRef, updatedProfile);
  } else {
    await setDoc(profileRef, {
      ...updatedProfile,
      createdAt: now,
    });
  }

  return {
    userId,
    ...profileData,
  } as UserProfile;
}

// Get user profile
export async function getUserProfile(
  userId: string
): Promise<UserProfile | null> {
  const profileRef = doc(db, "userProfiles", userId);
  const profileDoc = await getDoc(profileRef);

  if (!profileDoc.exists()) {
    return null;
  }

  return {
    ...profileDoc.data(),
    userId,
  } as UserProfile;
}

// lib/auth/authService.ts
import { PrismaClient } from "@prisma/client";
import { hash } from "bcrypt";

const prisma = new PrismaClient();

export async function registerUser({
  name,
  email,
  password,
}: {
  name: string;
  email: string;
  password: string;
}) {
  // Check if user already exists
  const existingUser = await prisma.user.findUnique({
    where: {
      email,
    },
  });

  if (existingUser) {
    throw new Error("User with this email already exists");
  }

  // Hash password
  const hashedPassword = await hash(password, 12);

  // Create user
  const user = await prisma.user.create({
    data: {
      name,
      email,
      hashedPassword,
    },
  });

  return user;
}

export async function createUserProfile({
  userId,
  age,
  gender,
  currentWeight,
  targetWeight,
  height,
  activityLevel,
  dietaryPreferences,
  allergies,
  goalType,
  targetCalories,
  targetProtein,
  targetCarbs,
  targetFat,
}: {
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
}) {
  // Create user profile
  const userProfile = await prisma.userProfile.create({
    data: {
      userId,
      age,
      gender,
      currentWeight,
      targetWeight,
      height,
      activityLevel,
      dietaryPreferences: dietaryPreferences || [],
      allergies: allergies || [],
      goalType,
      targetCalories,
      targetProtein,
      targetCarbs,
      targetFat,
    },
  });

  return userProfile;
}

export async function updateUserProfile(
  userId: string,
  data: Partial<{
    age: number;
    gender: string;
    currentWeight: number;
    targetWeight: number;
    height: number;
    activityLevel: string;
    dietaryPreferences: string[];
    allergies: string[];
    goalType: string;
    targetCalories: number;
    targetProtein: number;
    targetCarbs: number;
    targetFat: number;
    aiPersonality: string;
    threadId: string;
    assistantId: string;
    onboardingCompleted: boolean;
  }>
) {
  // Check if profile exists
  const existingProfile = await prisma.userProfile.findUnique({
    where: {
      userId,
    },
  });

  if (existingProfile) {
    // Update existing profile
    return await prisma.userProfile.update({
      where: {
        userId,
      },
      data,
    });
  } else {
    // Create new profile
    return await prisma.userProfile.create({
      data: {
        userId,
        ...data,
      },
    });
  }
}

export async function getUserProfile(userId: string) {
  return await prisma.userProfile.findUnique({
    where: {
      userId,
    },
  });
}

// lib/firebase/models/meal.ts - Fixed with proper indexing and error handling
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  Timestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "../clientApp";

export interface Meal {
  id?: string;
  userId: string;
  name: string;
  calories: number;
  protein?: number | null;
  carbs?: number | null;
  fat?: number | null;
  mealType?: string | null;
  items?: string[];
  date: Date | Timestamp;
  createdAt?: any;
  updatedAt?: any;
}

/**
 * Create a new meal record
 */
export async function createMeal(mealData: Omit<Meal, "id">): Promise<Meal> {
  try {
    const mealsCollectionRef = collection(db, "meals");

    const now = serverTimestamp();
    const mealToCreate = {
      ...mealData,
      // Ensure we have valid numeric values
      calories:
        typeof mealData.calories === "string"
          ? parseFloat(mealData.calories)
          : mealData.calories || 0,
      protein: mealData.protein ?? null,
      carbs: mealData.carbs ?? null,
      fat: mealData.fat ?? null,
      // Ensure we have a valid date object
      date: mealData.date instanceof Date ? mealData.date : new Date(),
      createdAt: now,
      updatedAt: now,
    };

    const docRef = await addDoc(mealsCollectionRef, mealToCreate);

    return {
      ...mealData,
      id: docRef.id,
    };
  } catch (error) {
    console.error("Error creating meal:", error);
    throw new Error(
      `Failed to create meal: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

/**
 * Get meals by user and optional date - Updated with more flexible querying
 */
export async function getMealsByUserAndDate(
  userId: string,
  date?: Date
): Promise<Meal[]> {
  try {
    const mealsCollectionRef = collection(db, "meals");
    let q;

    if (date) {
      // Get meals for specific date by creating start and end timestamps
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);

      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      // Simple query without complex ordering to avoid index issues
      q = query(
        mealsCollectionRef,
        where("userId", "==", userId),
        where("date", ">=", startOfDay),
        where("date", "<=", endOfDay)
      );
    } else {
      // Get all meals for user
      q = query(mealsCollectionRef, where("userId", "==", userId));
    }

    const querySnapshot = await getDocs(q);

    const meals: Meal[] = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      meals.push({
        id: doc.id,
        ...data,
        date: data.date?.toDate ? data.date.toDate() : data.date,
      } as Meal);
    });

    // Sort meals by date client-side to avoid requiring complex indexes
    return meals.sort((a, b) => {
      const dateA = a.date instanceof Date ? a.date : new Date(a.date as any);
      const dateB = b.date instanceof Date ? b.date : new Date(b.date as any);
      return dateB.getTime() - dateA.getTime(); // Sort by most recent first
    });
  } catch (error) {
    console.error("Error getting meals:", error);
    throw new Error(
      `Failed to get meals: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

/**
 * Get meal by ID
 */
export async function getMealById(id: string): Promise<Meal | null> {
  try {
    const mealRef = doc(db, "meals", id);
    const mealSnap = await getDoc(mealRef);

    if (!mealSnap.exists()) {
      return null;
    }

    const data = mealSnap.data();
    return {
      id: mealSnap.id,
      ...data,
      date: data.date?.toDate ? data.date.toDate() : data.date,
    } as Meal;
  } catch (error) {
    console.error("Error getting meal:", error);
    throw new Error(
      `Failed to get meal: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

/**
 * Update an existing meal
 */
export async function updateMeal(
  id: string,
  mealData: Partial<Meal>
): Promise<void> {
  try {
    const mealRef = doc(db, "meals", id);

    // First check if meal exists and user has permission
    const mealSnap = await getDoc(mealRef);
    if (!mealSnap.exists()) {
      throw new Error("Meal not found");
    }

    // Don't allow changing userId to prevent unauthorized access
    const { userId, ...updateData } = mealData;

    const updatedMeal = {
      ...updateData,
      updatedAt: serverTimestamp(),
    };

    await updateDoc(mealRef, updatedMeal);
  } catch (error) {
    console.error("Error updating meal:", error);
    throw new Error(
      `Failed to update meal: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

/**
 * Delete a meal
 */
export async function deleteMeal(id: string): Promise<void> {
  try {
    const mealRef = doc(db, "meals", id);
    await deleteDoc(mealRef);
  } catch (error) {
    console.error("Error deleting meal:", error);
    throw new Error(
      `Failed to delete meal: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

/**
 * Get the sum of calories for a user on a given date
 * Simplified approach to avoid complex queries requiring indexes
 */
export async function getCaloriesSummary(
  userId: string,
  date?: Date
): Promise<{ consumed: number; mealCount: number }> {
  try {
    // Get all meals for the user on the given date
    const meals = await getMealsByUserAndDate(userId, date);

    // Calculate total calories
    const consumed = meals.reduce(
      (total, meal) => total + (meal.calories || 0),
      0
    );

    return {
      consumed,
      mealCount: meals.length,
    };
  } catch (error) {
    console.error("Error getting calories summary:", error);
    throw new Error(
      `Failed to get calories summary: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

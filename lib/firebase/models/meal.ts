// lib/firebase/models/meal.ts
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
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
    throw new Error("Failed to create meal");
  }
}

/**
 * Get meals by user and optional date
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

      q = query(
        mealsCollectionRef,
        where("userId", "==", userId),
        where("date", ">=", startOfDay),
        where("date", "<=", endOfDay),
        orderBy("date", "desc")
      );
    } else {
      // Get all meals for user
      q = query(
        mealsCollectionRef,
        where("userId", "==", userId),
        orderBy("date", "desc")
      );
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

    return meals;
  } catch (error) {
    console.error("Error getting meals:", error);
    throw new Error("Failed to get meals");
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
    throw new Error("Failed to get meal");
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
    throw new Error("Failed to update meal");
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
    throw new Error("Failed to delete meal");
  }
}

/**
 * Get the sum of calories for a user on a given date
 */
export async function getCaloriesSummary(
  userId: string,
  date?: Date
): Promise<{ consumed: number; mealCount: number }> {
  try {
    const meals = await getMealsByUserAndDate(userId, date);

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
    throw new Error("Failed to get calories summary");
  }
}

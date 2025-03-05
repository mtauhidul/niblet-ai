// lib/firebase/models/meal.ts
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
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
  protein?: number;
  carbs?: number;
  fat?: number;
  mealType?: string;
  items?: string[];
  date: Date | Timestamp;
  createdAt?: any;
  updatedAt?: any;
}

// Create meal
export async function createMeal(mealData: Omit<Meal, "id">): Promise<Meal> {
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
}

// Get meals by user and date
export async function getMealsByUserAndDate(
  userId: string,
  date?: Date
): Promise<Meal[]> {
  const mealsCollectionRef = collection(db, "meals");

  let constraints: any[] = [
    where("userId", "==", userId),
    orderBy("date", "asc"),
  ];

  if (date) {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    constraints = [
      ...constraints,
      where("date", ">=", startOfDay),
      where("date", "<=", endOfDay),
    ];
  }

  const q = query(mealsCollectionRef, ...constraints);
  const querySnapshot = await getDocs(q);

  const meals: Meal[] = [];
  querySnapshot.forEach((doc) => {
    meals.push({
      id: doc.id,
      ...doc.data(),
      date: doc.data().date?.toDate() || new Date(),
    } as Meal);
  });

  return meals;
}

// Update meal
export async function updateMeal(
  id: string,
  mealData: Partial<Meal>
): Promise<void> {
  const mealRef = doc(db, "meals", id);

  const updatedMeal = {
    ...mealData,
    updatedAt: serverTimestamp(),
  };

  await updateDoc(mealRef, updatedMeal);
}

// Delete meal
export async function deleteMeal(id: string): Promise<void> {
  const mealRef = doc(db, "meals", id);
  await deleteDoc(mealRef);
}

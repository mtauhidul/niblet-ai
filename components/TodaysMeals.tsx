// components/TodaysMeals.tsx
"use client";

import { Edit, Plus } from "lucide-react";
import { Button } from "./ui/button";

interface Meal {
  id: string;
  name: string;
  calories: number;
  mealType?: string;
  items?: string[];
  date?: string;
}

interface TodaysMealsProps {
  meals: Meal[];
}

const TodaysMeals = ({ meals = [] }: TodaysMealsProps) => {
  // Group meals by type
  const mealsByType: Record<string, Meal[]> = {};

  meals.forEach((meal) => {
    const type = meal.mealType || "Other";
    if (!mealsByType[type]) {
      mealsByType[type] = [];
    }
    mealsByType[type].push(meal);
  });

  // Sort meal types in logical order
  const orderedMealTypes = [
    "Breakfast",
    "Morning Snack",
    "Lunch",
    "Afternoon Snack",
    "Dinner",
    "Evening Snack",
    "Other",
  ];

  // Filter and sort meal types
  const sortedMealTypes = Object.keys(mealsByType).sort((a, b) => {
    const indexA = orderedMealTypes.indexOf(a);
    const indexB = orderedMealTypes.indexOf(b);
    return (indexA === -1 ? 999 : indexA) - (indexB === -1 ? 999 : indexB);
  });

  if (meals.length === 0) {
    return (
      <div className="text-center py-4">
        <h3 className="font-bold mb-2">Today's Meals</h3>
        <p className="text-gray-500 dark:text-gray-400 mb-4">
          No meals logged today. Start tracking your meals!
        </p>
        <Button size="sm" className="flex items-center gap-1">
          <Plus className="h-4 w-4" /> Add Meal
        </Button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-2">
        <h3 className="font-bold">Today's Meals</h3>
        <Button size="sm" variant="ghost" className="flex items-center gap-1">
          <Plus className="h-4 w-4" /> Add
        </Button>
      </div>

      {sortedMealTypes.map((mealType) => (
        <div key={mealType} className="mb-3">
          <div className="font-medium text-sm text-gray-600 dark:text-gray-300 mb-1">
            {mealType}
          </div>

          {mealsByType[mealType].map((meal) => (
            <div
              key={meal.id}
              className="flex justify-between items-center mb-1 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <div>
                <div className="font-medium">{meal.name}</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  {meal.items && meal.items.length > 0
                    ? `${meal.items.length} item${
                        meal.items.length !== 1 ? "s" : ""
                      }`
                    : "No details"}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="text-sm font-medium">{meal.calories} cal</div>
                <Button size="sm" variant="ghost" className="p-1">
                  <Edit className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
};

export default TodaysMeals;

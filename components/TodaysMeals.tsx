"use client";

import type { Meal } from "@/lib/firebase/models/meal";
import { Edit, Plus, Trash } from "lucide-react";
import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./ui/alert-dialog";
import { Button } from "./ui/button";
import { Skeleton } from "./ui/skeleton";

interface TodaysMealsProps {
  meals: Meal[];
  isLoading?: boolean;
  onMealDeleted?: () => void;
}

const TodaysMeals = ({
  meals = [],
  isLoading = false,
  onMealDeleted,
}: TodaysMealsProps) => {
  const [deletingMealId, setDeletingMealId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Group meals by type
  const mealsByType: Record<string, Meal[]> = {};

  // Add meals to their respective type groups
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

  // Delete a meal
  const handleDeleteMeal = async () => {
    if (!deletingMealId) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/meals/${deletingMealId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        // Call the onMealDeleted callback to refresh the meal list
        if (onMealDeleted) {
          onMealDeleted();
        }
      } else {
        console.error("Failed to delete meal");
      }
    } catch (error) {
      console.error("Error deleting meal:", error);
    } finally {
      setIsDeleting(false);
      setDeletingMealId(null);
    }
  };

  // Calculate daily totals
  const totalCalories = meals.reduce(
    (sum, meal) => sum + (meal.calories || 0),
    0
  );
  const totalProtein = meals.reduce(
    (sum, meal) => sum + (meal.protein || 0),
    0
  );
  const totalCarbs = meals.reduce((sum, meal) => sum + (meal.carbs || 0), 0);
  const totalFat = meals.reduce((sum, meal) => sum + (meal.fat || 0), 0);

  if (isLoading) {
    return (
      <div>
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold">Today's Meals</h3>
        </div>
        <Skeleton className="h-16 mb-2" />
        <Skeleton className="h-16 mb-2" />
        <Skeleton className="h-16 mb-2" />
      </div>
    );
  }

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
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-bold">Today's Meals</h3>
        <Button size="sm" variant="ghost" className="flex items-center gap-1">
          <Plus className="h-4 w-4" /> Add
        </Button>
      </div>

      {sortedMealTypes.map((mealType) => (
        <div key={mealType} className="mb-4">
          <div className="font-medium text-sm text-gray-600 dark:text-gray-300 mb-2">
            {mealType}
          </div>

          {mealsByType[mealType].map((meal) => (
            <div
              key={meal.id}
              className="flex justify-between items-center mb-2 p-3 rounded-lg bg-white dark:bg-gray-800 shadow-sm"
            >
              <div>
                <div className="font-medium">{meal.name}</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  {meal.items && meal.items.length > 0
                    ? meal.items.join(", ")
                    : "No details"}
                </div>
              </div>
              <div className="flex flex-col items-end">
                <div className="text-sm font-medium">{meal.calories} cal</div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {meal.protein ? `P: ${meal.protein}g` : ""}{" "}
                  {meal.carbs ? `C: ${meal.carbs}g` : ""}{" "}
                  {meal.fat ? `F: ${meal.fat}g` : ""}
                </div>
                <div className="flex gap-1 mt-1">
                  <Button size="sm" variant="ghost" className="h-6 w-6 p-0">
                    <Edit className="h-3 w-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 w-6 p-0"
                    onClick={() => meal.id && setDeletingMealId(meal.id)}
                  >
                    <Trash className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ))}

      {/* Daily nutrition summary */}
      <div className="mt-6 p-4 rounded-lg bg-gray-100 dark:bg-gray-800">
        <h3 className="font-bold text-sm mb-2">Daily Totals</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              Calories
            </div>
            <div className="font-medium">{totalCalories}</div>
          </div>
          <div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              Protein
            </div>
            <div className="font-medium">{totalProtein}g</div>
          </div>
          <div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              Carbs
            </div>
            <div className="font-medium">{totalCarbs}g</div>
          </div>
          <div>
            <div className="text-xs text-gray-500 dark:text-gray-400">Fat</div>
            <div className="font-medium">{totalFat}g</div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={!!deletingMealId}
        onOpenChange={(open: boolean) => !open && setDeletingMealId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this meal from your records.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteMeal}
              disabled={isDeleting}
              className="bg-red-500 hover:bg-red-600"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default TodaysMeals;

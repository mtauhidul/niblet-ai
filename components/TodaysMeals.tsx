// components/TodaysMeals.tsx
"use client";

import type { Meal as BaseMeal } from "@/lib/firebase/models/meal";
import { Edit, Trash } from "lucide-react";
import { useState } from "react";
import EditMealModal from "./EditMealModal";
import NutritionSummary from "./NutritionSummary";
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

interface Meal extends BaseMeal {
  canEdit?: boolean;
}

interface TodaysMealsProps {
  meals: Meal[];
  isLoading?: boolean;
  onMealDeleted?: () => void;
  showTitle?: boolean; // New prop to control title display
}

const TodaysMeals = ({
  meals = [],
  isLoading = false,
  onMealDeleted,
  showTitle = false, // Default to not showing the title
}: TodaysMealsProps) => {
  const [deletingMealId, setDeletingMealId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [editingMeal, setEditingMeal] = useState<Meal | null>(null);
  const [showEditMealModal, setShowEditMealModal] = useState(false);

  // Group meals by type
  const mealsByType: Record<string, Meal[]> = {};

  // Add meals to their respective type groups
  meals.forEach((meal, index) => {
    const type = meal.mealType || "Other";
    if (!mealsByType[type]) {
      mealsByType[type] = [];
    }

    // Add canEdit flag - only first 3 meals can be edited
    const canEdit = index < 3;
    mealsByType[type].push({
      ...meal,
      canEdit,
    });
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
        {showTitle && <h3 className="font-bold mb-4">Today's Meals</h3>}
        <Skeleton className="h-16 mb-2" />
        <Skeleton className="h-16 mb-2" />
        <Skeleton className="h-16 mb-2" />
      </div>
    );
  }

  if (meals.length === 0) {
    return (
      <div className="text-center py-4">
        {showTitle && <h3 className="font-bold mb-2">Today's Meals</h3>}
        <p className="text-gray-500 dark:text-gray-400 mb-4">
          No meals logged today. Try logging meals through chat!
        </p>
      </div>
    );
  }

  const fetchNutritionData = async () => {
    try {
      const response = await fetch("/api/nutrition");

      // Check if the request was successful
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      // Check content type to ensure it's JSON
      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        console.error("API returned non-JSON response:", await response.text());
        throw new Error("API returned non-JSON response");
      }

      // Parse the JSON response
      const data = await response.json();

      // Return the data with validation
      return {
        calories: Number(data.calories) || 0,
        protein: Number(data.protein) || 0,
        carbs: Number(data.carbs) || 0,
        fat: Number(data.fat) || 0,
      };
    } catch (error) {
      console.error("Nutrition data fetch error:", error);

      // Return current values as fallback to prevent UI disruption
      return {
        calories: totalCalories,
        protein: totalProtein,
        carbs: totalCarbs,
        fat: totalFat,
      };
    }
  };

  return (
    <div>
      {/* Only show title if explicitly requested */}
      {showTitle && <h3 className="font-bold mb-4">Today's Meals</h3>}

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
                {meal.canEdit && (
                  <div className="flex gap-1 mt-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 w-6 p-0"
                      onClick={() => {
                        setEditingMeal(meal);
                        setShowEditMealModal(true);
                      }}
                    >
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
                )}
              </div>
            </div>
          ))}
        </div>
      ))}

      {/* Daily nutrition summary */}
      <NutritionSummary
        initialData={{
          calories: totalCalories,
          protein: totalProtein,
          carbs: totalCarbs,
          fat: totalFat,
        }}
        fetchNutritionData={fetchNutritionData}
      />

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

      {/* Edit Meal Modal */}
      <EditMealModal
        open={showEditMealModal}
        onOpenChange={setShowEditMealModal}
        onMealUpdated={onMealDeleted || (() => {})} // Reuse the existing callback or provide a default
        meal={editingMeal}
      />
    </div>
  );
};

export default TodaysMeals;

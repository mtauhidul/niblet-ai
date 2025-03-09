// components/TodaysMeals.tsx
"use client";

import type { Meal as BaseMeal } from "@/lib/firebase/models/meal";
import { ChevronDown, ChevronUp, Edit, Trash } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import EditMealModal from "./EditMealModal";
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
import { Card } from "./ui/card";
import { Skeleton } from "./ui/skeleton";

interface Meal extends BaseMeal {
  canEdit?: boolean;
}

interface MealItem {
  id?: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

interface MealGroup {
  type: string;
  totalCalories: number;
  itemCount: number;
  items: MealItem[];
  expanded: boolean;
}

interface TodaysMealsProps {
  meals: Meal[];
  isLoading?: boolean;
  onMealDeleted?: () => void;
  showTitle?: boolean;
  targetCalories?: number;
  targetProtein?: number;
  targetCarbs?: number;
  targetFat?: number;
}

const TodaysMeals = ({
  meals = [],
  isLoading = false,
  onMealDeleted,
  showTitle = false,
  targetCalories = 2000,
  targetProtein = 50,
  targetCarbs = 250,
  targetFat = 70,
}: TodaysMealsProps) => {
  const [deletingMealId, setDeletingMealId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [editingMeal, setEditingMeal] = useState<Meal | null>(null);
  const [showEditMealModal, setShowEditMealModal] = useState(false);

  // Group meals by type and create expandable sections
  const [mealGroups, setMealGroups] = useState<Record<string, MealGroup>>({});

  // Process meals into grouped format
  useEffect(() => {
    const groups: Record<string, MealGroup> = {};

    meals.forEach((meal) => {
      const type = meal.mealType || "Other";

      if (!groups[type]) {
        groups[type] = {
          type,
          totalCalories: 0,
          itemCount: 0,
          items: [],
          expanded: false,
        };
      }

      groups[type].items.push({
        id: meal.id,
        name: meal.name,
        calories: meal.calories || 0,
        protein: meal.protein || 0,
        carbs: meal.carbs || 0,
        fat: meal.fat || 0,
      });

      groups[type].totalCalories += meal.calories || 0;
      groups[type].itemCount += 1;
    });

    setMealGroups(groups);
  }, [meals]);

  // Toggle expansion for a meal group
  const toggleMealGroup = (type: string) => {
    setMealGroups((prev) => ({
      ...prev,
      [type]: {
        ...prev[type],
        expanded: !prev[type].expanded,
      },
    }));
  };

  // Delete a meal
  const handleDeleteMeal = async () => {
    if (!deletingMealId) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/meals/${deletingMealId}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        let errorMessage = "Failed to delete meal";
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorMessage;
        } catch (e) {
          errorMessage = `Failed to delete meal: ${response.statusText}`;
        }

        throw new Error(errorMessage);
      }

      // Call the onMealDeleted callback to refresh the meal list
      if (onMealDeleted) {
        onMealDeleted();
      }

      toast.success("Meal deleted successfully");
    } catch (error) {
      console.error("Error deleting meal:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to delete meal"
      );
    } finally {
      setIsDeleting(false);
      setDeletingMealId(null);
    }
  };

  // Handle edit meal
  const handleEditMeal = (mealId: string | undefined) => {
    if (!mealId) return;

    const mealToEdit = meals.find((meal) => meal.id === mealId);
    if (mealToEdit) {
      setEditingMeal(mealToEdit);
      setShowEditMealModal(true);
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

  // Calculate calories percentage for progress bar
  const caloriesPercentage = Math.min(
    Math.round((totalCalories / targetCalories) * 100),
    100
  );
  const proteinPercentage = Math.min(
    Math.round((totalProtein / targetProtein) * 100),
    100
  );
  const carbsPercentage = Math.min(
    Math.round((totalCarbs / targetCarbs) * 100),
    100
  );
  const fatPercentage = Math.min(Math.round((totalFat / targetFat) * 100), 100);

  if (isLoading) {
    return (
      <div className="rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
        <div className="p-4 bg-white dark:bg-gray-800">
          <Skeleton className="h-6 w-32 mb-2" />
          <Skeleton className="h-4 w-full" />
        </div>
      </div>
    );
  }

  if (meals.length === 0) {
    return (
      <Card className="p-4 text-center">
        <p className="text-gray-500 dark:text-gray-400">
          No meals logged today. Try logging meals through chat!
        </p>
      </Card>
    );
  }

  // Get ordered meal types for display
  const orderedMealTypes = [
    "Breakfast",
    "Morning Snack",
    "Lunch",
    "Afternoon Snack",
    "Dinner",
    "Evening Snack",
    "Other",
  ];

  // Filter to only meal types that have data
  const mealTypesWithData = Object.keys(mealGroups).sort((a, b) => {
    const indexA = orderedMealTypes.indexOf(a);
    const indexB = orderedMealTypes.indexOf(b);
    return (indexA === -1 ? 999 : indexA) - (indexB === -1 ? 999 : indexB);
  });

  // Function to determine progress bar color based on percentage
  const getProgressColor = (percentage: number) => {
    if (percentage < 50) return "bg-red-500";
    if (percentage < 80) return "bg-yellow-500";
    if (percentage <= 100) return "bg-green-500";
    return "bg-red-500"; // Over 100%
  };

  return (
    <div className="space-y-4">
      {/* Main container for all meal sections */}
      <div className="border rounded-lg bg-white dark:bg-gray-800 overflow-hidden">
        {/* Today's Meals title - if enabled */}
        {showTitle && (
          <div className="p-3 border-b bg-gray-50 dark:bg-gray-700">
            <h3 className="font-medium">Today's Meals</h3>
          </div>
        )}

        {/* Collapsible meal sections */}
        <div className="divide-y">
          {mealTypesWithData.map((mealType) => {
            const group = mealGroups[mealType];

            return (
              <div key={mealType} className="overflow-hidden">
                {/* Collapsed header - always visible */}
                <button
                  className="w-full p-3 flex justify-between items-center text-left"
                  onClick={() => toggleMealGroup(mealType)}
                >
                  <div>
                    <span className="font-medium">{mealType}</span>
                    <span className="text-sm text-gray-500 dark:text-gray-400 ml-2">
                      {group.itemCount}{" "}
                      {group.itemCount === 1 ? "item" : "items"} •{" "}
                      {group.totalCalories} calories
                    </span>
                  </div>
                  {group.expanded ? (
                    <ChevronUp className="h-4 w-4 text-gray-500" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-gray-500" />
                  )}
                </button>

                {/* Expanded content - visible when expanded */}
                {group.expanded && (
                  <div className="animate-in slide-in-from-top-4 duration-300 px-4 pb-4">
                    {/* Nutrition table */}
                    <div className="w-full">
                      <div className="flex items-center text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
                        <div className="w-1/3 text-left">Food Item</div>
                        <div className="w-1/6 text-right">Calories</div>
                        <div className="w-1/6 text-right">Protein (g)</div>
                        <div className="w-1/6 text-right">Carbs (g)</div>
                        <div className="w-1/6 text-right">Fat (g)</div>
                        <div className="w-1/12"></div>
                      </div>

                      {/* Food items */}
                      {group.items.map((item, idx) => (
                        <div
                          key={idx}
                          className="flex items-center text-sm py-1 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-md"
                        >
                          <div className="w-1/3 text-left truncate">
                            {item.name}
                          </div>
                          <div className="w-1/6 text-right">
                            {item.calories}
                          </div>
                          <div className="w-1/6 text-right">{item.protein}</div>
                          <div className="w-1/6 text-right">{item.carbs}</div>
                          <div className="w-1/6 text-right">{item.fat}</div>
                          <div className="w-1/12 flex justify-end">
                            {item.id && (
                              <>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-6 w-6 p-0"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleEditMeal(item.id);
                                  }}
                                >
                                  <Edit className="h-3 w-3" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-6 w-6 p-0"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setDeletingMealId(item.id ?? null);
                                  }}
                                >
                                  <Trash className="h-3 w-3" />
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                      ))}

                      {/* Total row */}
                      <div className="flex items-center text-sm font-medium border-t pt-1 mt-1">
                        <div className="w-1/3 text-left">Total</div>
                        <div className="w-1/6 text-right">
                          {group.totalCalories}
                        </div>
                        <div className="w-1/6 text-right">
                          {group.items.reduce(
                            (sum, item) => sum + item.protein,
                            0
                          )}
                        </div>
                        <div className="w-1/6 text-right">
                          {group.items.reduce(
                            (sum, item) => sum + item.carbs,
                            0
                          )}
                        </div>
                        <div className="w-1/6 text-right">
                          {group.items.reduce((sum, item) => sum + item.fat, 0)}
                        </div>
                        <div className="w-1/12"></div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Daily total row */}
        <div className="p-3 border-t bg-gray-50 dark:bg-gray-700 flex justify-between">
          <div className="font-medium">{totalCalories} cal</div>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            {caloriesPercentage}% of {targetCalories} cal
          </div>
        </div>
      </div>

      {/* Daily Target Progress Chart - Now visible by default */}
      <div className="border rounded-lg bg-white dark:bg-gray-800 p-4">
        {/* Combined Macronutrients Progress */}
        <div className="mb-4">
          <div className="flex justify-between mb-1">
            <div className="text-sm text-gray-500 dark:text-gray-400 flex gap-3">
              <span>P: {totalProtein}g</span>
              <span>C: {totalCarbs}g</span>
              <span>F: {totalFat}g</span>
            </div>
          </div>

          {/* Stacked Bar for Macronutrients */}
          <div className="w-full h-6 bg-gray-200 dark:bg-gray-700 rounded-md overflow-hidden">
            {/* Calculate each macro's proportion of the total target macros for display width */}
            {(() => {
              const totalTargetGrams = targetProtein + targetCarbs + targetFat;
              const proteinWidth = (targetProtein / totalTargetGrams) * 100;
              const carbsWidth = (targetCarbs / totalTargetGrams) * 100;
              const fatWidth = (targetFat / totalTargetGrams) * 100;

              // Calculate consumed percentage for each macro
              const proteinConsumedPercent =
                Math.min(totalProtein / targetProtein, 1) * 100;
              const carbsConsumedPercent =
                Math.min(totalCarbs / targetCarbs, 1) * 100;
              const fatConsumedPercent =
                Math.min(totalFat / targetFat, 1) * 100;

              return (
                <div className="flex h-full w-full">
                  {/* Protein Bar */}
                  <div
                    className="h-full relative"
                    style={{ width: `${proteinWidth}%` }}
                  >
                    <div className="absolute inset-0 bg-gray-100 dark:bg-gray-600"></div>
                    <div
                      className="absolute inset-0 bg-blue-500"
                      style={{ width: `${proteinConsumedPercent}%` }}
                    ></div>
                  </div>

                  {/* Carbs Bar */}
                  <div
                    className="h-full relative"
                    style={{ width: `${carbsWidth}%` }}
                  >
                    <div className="absolute inset-0 bg-gray-100 dark:bg-gray-600"></div>
                    <div
                      className="absolute inset-0 bg-green-500"
                      style={{ width: `${carbsConsumedPercent}%` }}
                    ></div>
                  </div>

                  {/* Fat Bar */}
                  <div
                    className="h-full relative"
                    style={{ width: `${fatWidth}%` }}
                  >
                    <div className="absolute inset-0 bg-gray-100 dark:bg-gray-600"></div>
                    <div
                      className="absolute inset-0 bg-red-500"
                      style={{ width: `${fatConsumedPercent}%` }}
                    ></div>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Macro Labels */}
          <div className="flex w-full text-xs mt-1">
            {(() => {
              const totalTargetGrams = targetProtein + targetCarbs + targetFat;
              const proteinWidth = (targetProtein / totalTargetGrams) * 100;
              const carbsWidth = (targetCarbs / totalTargetGrams) * 100;
              const fatWidth = (targetFat / totalTargetGrams) * 100;

              return (
                <>
                  <div
                    className="text-center"
                    style={{ width: `${proteinWidth}%` }}
                  >
                    <div className="flex items-center justify-center">
                      <div className="w-2 h-2 bg-blue-500 rounded-full mr-1"></div>
                      Protein
                    </div>
                    <div className="text-gray-500 dark:text-gray-400">
                      {Math.round((totalProtein / targetProtein) * 100)}%
                    </div>
                  </div>

                  <div
                    className="text-center"
                    style={{ width: `${carbsWidth}%` }}
                  >
                    <div className="flex items-center justify-center">
                      <div className="w-2 h-2 bg-green-500 rounded-full mr-1"></div>
                      Carbs
                    </div>
                    <div className="text-gray-500 dark:text-gray-400">
                      {Math.round((totalCarbs / targetCarbs) * 100)}%
                    </div>
                  </div>

                  <div
                    className="text-center"
                    style={{ width: `${fatWidth}%` }}
                  >
                    <div className="flex items-center justify-center">
                      <div className="w-2 h-2 bg-red-500 rounded-full mr-1"></div>
                      Fat
                    </div>
                    <div className="text-gray-500 dark:text-gray-400">
                      {Math.round((totalFat / targetFat) * 100)}%
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
        </div>

        {/* Macronutrient breakdown as percentage of calories */}
        <div className="flex justify-between pt-2 mt-2 border-t text-xs text-gray-500 dark:text-gray-400">
          <div className="flex items-center">
            <div className="w-3 h-3 bg-blue-500 rounded-full mr-1"></div>
            <span>
              Protein:{" "}
              {Math.round(((totalProtein * 4) / totalCalories) * 100 || 0)}% of
              calories
            </span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-green-500 rounded-full mr-1"></div>
            <span>
              Carbs: {Math.round(((totalCarbs * 4) / totalCalories) * 100 || 0)}
              % of calories
            </span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-red-500 rounded-full mr-1"></div>
            <span>
              Fat: {Math.round(((totalFat * 9) / totalCalories) * 100 || 0)}% of
              calories
            </span>
          </div>
        </div>
      </div>

      {/* Edit Meal Modal */}
      <EditMealModal
        open={showEditMealModal}
        onOpenChange={setShowEditMealModal}
        onMealUpdated={onMealDeleted || (() => {})}
        meal={editingMeal}
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
    </div>
  );
};

export default TodaysMeals;

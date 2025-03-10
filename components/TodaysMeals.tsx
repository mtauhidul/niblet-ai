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
                    {/* Nutrition table-like header (for larger screens) */}
                    <div className="hidden sm:grid grid-cols-12 text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
                      <div className="col-span-3 text-left">Food Item</div>
                      <div className="col-span-2 text-right">Calories</div>
                      <div className="col-span-2 text-right">Protein (g)</div>
                      <div className="col-span-2 text-right">Carbs (g)</div>
                      <div className="col-span-2 text-right">Fat (g)</div>
                      <div className="col-span-1"></div>
                    </div>

                    {/* Food items */}
                    {group.items.map((item, idx) => (
                      <div key={idx}>
                        {/* Desktop / larger screens */}
                        <div className="hidden sm:grid grid-cols-12 items-center text-sm py-1 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-md">
                          <div className="col-span-3 truncate">{item.name}</div>
                          <div className="col-span-2 text-right">
                            {item.calories}
                          </div>
                          <div className="col-span-2 text-right">
                            {item.protein}
                          </div>
                          <div className="col-span-2 text-right">
                            {item.carbs}
                          </div>
                          <div className="col-span-2 text-right">
                            {item.fat}
                          </div>
                          <div className="col-span-1 flex justify-end">
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

                        {/* Mobile / smaller screens */}
                        <div className="block sm:hidden text-sm py-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-md">
                          <div className="flex justify-between">
                            <div className="font-medium truncate">
                              {item.name}
                            </div>
                            <div className="flex items-center">
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
                          <div className="flex flex-wrap gap-2 mt-1 text-xs text-gray-600 dark:text-gray-400">
                            <span>{item.calories} cal</span>
                            <span>{item.protein}g P</span>
                            <span>{item.carbs}g C</span>
                            <span>{item.fat}g F</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
          <div>
            <div className="p-4 flex justify-between items-center">
              <div>
                <span className="font-medium">Totals</span>
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                {totalCalories} calories
              </div>
            </div>
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

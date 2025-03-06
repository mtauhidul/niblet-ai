// components/GoalsPage.tsx
"use client";

import HamburgerMenu from "@/components/HamburgerMenu";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { getUserProfileById } from "@/lib/auth/authService";
import { createOrUpdateUserProfile } from "@/lib/firebase/models/user";
import { ArrowLeft, Save } from "lucide-react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

interface Goals {
  targetWeight: number | null;
  targetCalories: number;
  targetProtein: number;
  targetCarbs: number;
  targetFat: number;
  goalType: string;
  weeklyWeightGoal: number;
  activityLevel: string;
}

const GoalsPage = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [currentWeight, setCurrentWeight] = useState<number | null>(null);
  const [targetWeight, setTargetWeight] = useState<number | null>(null);
  const [calculatedCalories, setCalculatedCalories] = useState(2000);
  const [goals, setGoals] = useState<Goals>({
    targetWeight: null,
    targetCalories: 2000,
    targetProtein: 120,
    targetCarbs: 200,
    targetFat: 60,
    goalType: "Weight Loss",
    weeklyWeightGoal: 1.0,
    activityLevel: "Moderately Active",
  });

  const router = useRouter();
  const { data: session, status } = useSession();

  // Set mounted state to prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  // Check authentication status
  useEffect(() => {
    if (mounted && status === "unauthenticated") {
      router.push("/auth/signin");
    }
  }, [status, router, mounted]);

  // Load goals from profile
  const loadGoals = useCallback(async () => {
    if (!session?.user?.id) return;

    setIsLoading(true);
    try {
      const profile = await getUserProfileById(session.user.id);

      if (profile) {
        // Set current weight if available
        if (profile.currentWeight) {
          setCurrentWeight(profile.currentWeight);
        }

        // Set goal values from profile
        const updatedGoals = { ...goals };

        if (profile.targetWeight) {
          updatedGoals.targetWeight = profile.targetWeight;
          setTargetWeight(profile.targetWeight);
        }

        if (profile.targetCalories) {
          updatedGoals.targetCalories = profile.targetCalories;
          setCalculatedCalories(profile.targetCalories);
        }

        if (profile.targetProtein) {
          updatedGoals.targetProtein = profile.targetProtein;
        }

        if (profile.targetCarbs) {
          updatedGoals.targetCarbs = profile.targetCarbs;
        }

        if (profile.targetFat) {
          updatedGoals.targetFat = profile.targetFat;
        }

        if (profile.goalType) {
          updatedGoals.goalType = profile.goalType;
        }

        // Remove weeklyWeightGoal check as it does not exist on UserProfile

        if (profile.activityLevel) {
          updatedGoals.activityLevel = profile.activityLevel;
        }

        setGoals(updatedGoals);
      }
    } catch (error) {
      console.error("Error loading goals:", error);
      toast.error("Failed to load your goals");
    } finally {
      setIsLoading(false);
    }
  }, [session?.user?.id, goals]);

  // Load goals when component mounts and user is authenticated
  useEffect(() => {
    if (mounted && status === "authenticated") {
      loadGoals();
    }
  }, [mounted, status, loadGoals]);

  // Calculate calories based on goal type, activity level and weight goals
  const calculateCalories = useCallback(() => {
    if (!currentWeight) return calculatedCalories;

    // Base metabolic rate estimation (simplified)
    const bmr = currentWeight * 10; // Very rough approximation

    // Activity multiplier
    let activityMultiplier = 1.2; // Sedentary default

    switch (goals.activityLevel) {
      case "Sedentary":
        activityMultiplier = 1.2;
        break;
      case "Lightly Active":
        activityMultiplier = 1.375;
        break;
      case "Moderately Active":
        activityMultiplier = 1.55;
        break;
      case "Very Active":
        activityMultiplier = 1.725;
        break;
      case "Extremely Active":
        activityMultiplier = 1.9;
        break;
    }

    // Total daily energy expenditure
    let tdee = Math.round(bmr * activityMultiplier);

    // Adjust based on goal
    if (goals.goalType === "Weight Loss") {
      // 500 calorie deficit per pound per week
      tdee -= Math.round(500 * goals.weeklyWeightGoal);
    } else if (goals.goalType === "Weight Gain") {
      // 500 calorie surplus per pound per week
      tdee += Math.round(500 * goals.weeklyWeightGoal);
    }

    // Ensure minimum healthy calories
    const minHealthyCalories = 1200;
    return Math.max(tdee, minHealthyCalories);
  }, [
    currentWeight,
    goals.activityLevel,
    goals.goalType,
    goals.weeklyWeightGoal,
    calculatedCalories,
  ]);

  // Recalculate when relevant parameters change
  useEffect(() => {
    if (currentWeight) {
      const newCalculatedCalories = calculateCalories();
      setCalculatedCalories(newCalculatedCalories);

      // Update goals with new calculated calories
      setGoals((prevGoals) => ({
        ...prevGoals,
        targetCalories: newCalculatedCalories,
      }));
    }
  }, [
    currentWeight,
    goals.goalType,
    goals.activityLevel,
    goals.weeklyWeightGoal,
    calculateCalories,
  ]);

  // Update macronutrient targets based on calories
  useEffect(() => {
    if (goals.targetCalories) {
      // Approximate macronutrient ratios (40/30/30 for protein/carbs/fat by default)
      const protein = Math.round((goals.targetCalories * 0.3) / 4); // 30% of calories, 4 calories per gram
      const carbs = Math.round((goals.targetCalories * 0.4) / 4); // 40% of calories, 4 calories per gram
      const fat = Math.round((goals.targetCalories * 0.3) / 9); // 30% of calories, 9 calories per gram

      setGoals((prevGoals) => ({
        ...prevGoals,
        targetProtein: protein,
        targetCarbs: carbs,
        targetFat: fat,
      }));
    }
  }, [goals.targetCalories]);

  // Save goals to profile
  const saveGoals = async () => {
    if (!session?.user?.id) return;

    setIsSaving(true);
    try {
      await createOrUpdateUserProfile(session.user.id, {
        targetWeight: goals.targetWeight ?? undefined,
        targetCalories: goals.targetCalories,
        targetProtein: goals.targetProtein,
        targetCarbs: goals.targetCarbs,
        targetFat: goals.targetFat,
        goalType: goals.goalType,
        // weeklyWeightGoal: goals.weeklyWeightGoal,
        activityLevel: goals.activityLevel,
      });

      toast.success("Goals saved successfully!");
    } catch (error) {
      console.error("Error saving goals:", error);
      toast.error("Failed to save goals");
    } finally {
      setIsSaving(false);
    }
  };

  // Calculate weight loss progress percentage
  const calculateWeightProgress = () => {
    if (!currentWeight || !targetWeight) return 0;

    // If weight loss goal
    if (targetWeight < currentWeight) {
      // Calculate what percentage of their weight loss goal they've achieved
      const startingWeight = currentWeight * 1.1; // Assume they started 10% heavier (placeholder)
      const totalToLose = startingWeight - targetWeight;
      const lostSoFar = startingWeight - currentWeight;
      return Math.min(100, Math.round((lostSoFar / totalToLose) * 100));
    }
    // If weight gain goal
    else if (targetWeight > currentWeight) {
      // Calculate what percentage of their weight gain goal they've achieved
      const startingWeight = currentWeight * 0.9; // Assume they started 10% lighter (placeholder)
      const totalToGain = targetWeight - startingWeight;
      const gainedSoFar = currentWeight - startingWeight;
      return Math.min(100, Math.round((gainedSoFar / totalToGain) * 100));
    }

    // If maintenance goal
    return 100;
  };

  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;

    if (name === "targetWeight") {
      const parsedValue = parseFloat(value);
      setTargetWeight(parsedValue || null);
      setGoals((prev) => ({ ...prev, [name]: parsedValue || null }));
    } else {
      setGoals((prev) => ({ ...prev, [name]: value }));
    }
  };

  // Handle select changes
  const handleSelectChange = (name: string, value: string) => {
    setGoals((prev) => ({ ...prev, [name]: value }));
  };

  // Handle slider changes
  const handleSliderChange = (name: string, value: number[]) => {
    setGoals((prev) => ({ ...prev, [name]: value[0] }));
  };

  // Prevent hydration errors by not rendering until mounted
  if (!mounted) {
    return null;
  }

  if (status === "loading" || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-300">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="py-3 px-4 border-b dark:border-gray-800 flex justify-between items-center">
        <div className="flex items-center">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/dashboard")}
            className="mr-2"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold">Your Goals</h1>
        </div>
        <div className="text-2xl font-bold">
          niblet<span className="text-blue-400">.ai</span>
        </div>
        <HamburgerMenu />
      </header>

      <div className="max-w-4xl mx-auto p-4 space-y-6">
        {/* Weight Goal Progress */}
        {currentWeight && targetWeight && (
          <Card>
            <CardHeader>
              <CardTitle>Weight Goal Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <div className="flex justify-between text-sm text-gray-500 mb-1">
                  <span>Progress: {calculateWeightProgress()}%</span>
                  <span>
                    {currentWeight} lbs → {targetWeight} lbs
                  </span>
                </div>
                <Progress value={calculateWeightProgress()} className="h-2" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded-lg">
                  <div className="text-sm text-gray-500">Current Weight</div>
                  <div className="text-2xl font-bold">{currentWeight} lbs</div>
                </div>
                <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded-lg">
                  <div className="text-sm text-gray-500">Goal Progress</div>
                  <div className="text-2xl font-bold">
                    {calculateWeightProgress()}%
                  </div>
                </div>
                <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded-lg">
                  <div className="text-sm text-gray-500">Target Weight</div>
                  <div className="text-2xl font-bold">{targetWeight} lbs</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Weight Goals */}
        <Card>
          <CardHeader>
            <CardTitle>Weight Goals</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="currentWeight">Current Weight (lbs)</Label>
                  <div className="text-2xl font-bold">
                    {currentWeight || "Not set"}
                  </div>
                  <p className="text-sm text-gray-500">
                    Update your current weight in the Dashboard
                  </p>
                </div>

                <div>
                  <Label htmlFor="targetWeight">Target Weight (lbs)</Label>
                  <Input
                    id="targetWeight"
                    name="targetWeight"
                    type="number"
                    value={goals.targetWeight || ""}
                    onChange={handleInputChange}
                    placeholder="Enter target weight"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="goalType">Goal Type</Label>
                  <Select
                    value={goals.goalType}
                    onValueChange={(value) =>
                      handleSelectChange("goalType", value)
                    }
                  >
                    <SelectTrigger id="goalType">
                      <SelectValue placeholder="Select goal type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Weight Loss">Weight Loss</SelectItem>
                      <SelectItem value="Weight Maintenance">
                        Weight Maintenance
                      </SelectItem>
                      <SelectItem value="Weight Gain">Weight Gain</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {goals.goalType !== "Weight Maintenance" && (
                  <div>
                    <div className="flex justify-between">
                      <Label htmlFor="weeklyWeightGoal">
                        Weekly{" "}
                        {goals.goalType === "Weight Loss" ? "Loss" : "Gain"}{" "}
                        Goal
                      </Label>
                      <span className="text-sm text-gray-500">
                        {goals.weeklyWeightGoal} lbs per week
                      </span>
                    </div>
                    <Slider
                      id="weeklyWeightGoal"
                      value={[goals.weeklyWeightGoal * 10]}
                      min={5}
                      max={20}
                      step={1}
                      onValueChange={(value) =>
                        handleSliderChange("weeklyWeightGoal", [value[0] / 10])
                      }
                      className="mt-2"
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>0.5 lbs</span>
                      <span>2.0 lbs</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Activity Level */}
        <Card>
          <CardHeader>
            <CardTitle>Activity Level</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <Label htmlFor="activityLevel">Activity Level</Label>
                <Select
                  value={goals.activityLevel}
                  onValueChange={(value) =>
                    handleSelectChange("activityLevel", value)
                  }
                >
                  <SelectTrigger id="activityLevel">
                    <SelectValue placeholder="Select activity level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Sedentary">
                      Sedentary (little or no exercise)
                    </SelectItem>
                    <SelectItem value="Lightly Active">
                      Lightly Active (light exercise 1-3 days/week)
                    </SelectItem>
                    <SelectItem value="Moderately Active">
                      Moderately Active (moderate exercise 3-5 days/week)
                    </SelectItem>
                    <SelectItem value="Very Active">
                      Very Active (hard exercise 6-7 days/week)
                    </SelectItem>
                    <SelectItem value="Extremely Active">
                      Extremely Active (very hard exercise, physical job or
                      training twice a day)
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Nutrition Goals */}
        <Card>
          <CardHeader>
            <CardTitle>Nutrition Goals</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div>
                <Label htmlFor="targetCalories">Daily Calorie Target</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="targetCalories"
                    name="targetCalories"
                    type="number"
                    value={goals.targetCalories}
                    onChange={handleInputChange}
                    className="flex-1"
                  />
                  <Button
                    variant="outline"
                    onClick={() => {
                      const calculated = calculateCalories();
                      setGoals((prev) => ({
                        ...prev,
                        targetCalories: calculated,
                      }));
                    }}
                    className="whitespace-nowrap"
                  >
                    Calculate
                  </Button>
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  Suggested calories based on your goals: {calculatedCalories}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="targetProtein">Protein Target (g)</Label>
                  <Input
                    id="targetProtein"
                    name="targetProtein"
                    type="number"
                    value={goals.targetProtein}
                    onChange={handleInputChange}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="targetCarbs">Carbohydrates Target (g)</Label>
                  <Input
                    id="targetCarbs"
                    name="targetCarbs"
                    type="number"
                    value={goals.targetCarbs}
                    onChange={handleInputChange}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="targetFat">Fat Target (g)</Label>
                  <Input
                    id="targetFat"
                    name="targetFat"
                    type="number"
                    value={goals.targetFat}
                    onChange={handleInputChange}
                  />
                </div>
              </div>

              <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                <h3 className="font-medium mb-2">Macronutrient Ratio</h3>
                <div className="h-6 w-full flex rounded-md overflow-hidden">
                  <div
                    className="bg-blue-500"
                    style={{
                      width: `${Math.round(
                        ((goals.targetProtein * 4) /
                          (goals.targetProtein * 4 +
                            goals.targetCarbs * 4 +
                            goals.targetFat * 9)) *
                          100
                      )}%`,
                    }}
                  />
                  <div
                    className="bg-green-500"
                    style={{
                      width: `${Math.round(
                        ((goals.targetCarbs * 4) /
                          (goals.targetProtein * 4 +
                            goals.targetCarbs * 4 +
                            goals.targetFat * 9)) *
                          100
                      )}%`,
                    }}
                  />
                  <div
                    className="bg-red-500"
                    style={{
                      width: `${Math.round(
                        ((goals.targetFat * 9) /
                          (goals.targetProtein * 4 +
                            goals.targetCarbs * 4 +
                            goals.targetFat * 9)) *
                          100
                      )}%`,
                    }}
                  />
                </div>
                <div className="flex justify-between mt-2 text-xs text-gray-500">
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-blue-500 rounded-full mr-1"></div>
                    <span>
                      Protein:{" "}
                      {Math.round(
                        ((goals.targetProtein * 4) /
                          (goals.targetProtein * 4 +
                            goals.targetCarbs * 4 +
                            goals.targetFat * 9)) *
                          100
                      )}
                      %
                    </span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-green-500 rounded-full mr-1"></div>
                    <span>
                      Carbs:{" "}
                      {Math.round(
                        ((goals.targetCarbs * 4) /
                          (goals.targetProtein * 4 +
                            goals.targetCarbs * 4 +
                            goals.targetFat * 9)) *
                          100
                      )}
                      %
                    </span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-red-500 rounded-full mr-1"></div>
                    <span>
                      Fat:{" "}
                      {Math.round(
                        ((goals.targetFat * 9) /
                          (goals.targetProtein * 4 +
                            goals.targetCarbs * 4 +
                            goals.targetFat * 9)) *
                          100
                      )}
                      %
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end mt-6">
          <Button onClick={saveGoals} disabled={isSaving} className="min-w-32">
            {isSaving ? (
              <>
                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"></div>
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Goals
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default GoalsPage;

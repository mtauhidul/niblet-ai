"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getUserProfileById } from "@/lib/auth/authService";
import { createOrUpdateUserProfile } from "@/lib/firebase/models/user";
import { ArrowLeft, Save } from "lucide-react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import HamburgerMenu from "./HamburgerMenu";

// Interface for user profile data
interface UserProfile {
  userId: string;
  age?: number | null;
  gender?: string | null;
  currentWeight?: number | null;
  targetWeight?: number | null;
  height?: number | null;
  activityLevel?: string | null;
  dietaryPreferences?: string[] | null;
  allergies?: string[] | null;
  goalType?: string | null;
  targetCalories?: number | null;
  targetProtein?: number | null;
  targetCarbs?: number | null;
  targetFat?: number | null;
}

// Accepted activity level types
type ActivityLevel =
  | "Sedentary"
  | "Lightly Active"
  | "Moderately Active"
  | "Very Active"
  | "Extremely Active";

// Accepted goal types
type GoalType = "Weight Loss" | "Weight Maintenance" | "Muscle Gain";

const GoalsPage: React.FC = () => {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [mounted, setMounted] = useState<boolean>(false);
  const [weightProgressPercentage, setWeightProgressPercentage] =
    useState<number>(0);

  // Form state
  const [targetWeight, setTargetWeight] = useState<number | null>(null);
  const [targetCalories, setTargetCalories] = useState<number>(2000);
  const [targetProtein, setTargetProtein] = useState<number>(120);
  const [targetCarbs, setTargetCarbs] = useState<number>(200);
  const [targetFat, setTargetFat] = useState<number>(60);
  const [activityLevel, setActivityLevel] =
    useState<ActivityLevel>("Moderately Active");
  const [goalType, setGoalType] = useState<GoalType>("Weight Loss");
  const [currentWeight, setCurrentWeight] = useState<number | null>(null);

  const router = useRouter();
  const { data: session, status } = useSession();

  // Prevent hydration errors by setting `mounted`
  useEffect(() => {
    setMounted(true);
  }, []);

  // Redirect unauthenticated users after mount
  useEffect(() => {
    if (mounted && status === "unauthenticated") {
      router.push("/auth/signin");
    }
  }, [status, router, mounted]);

  // Calculate weight progress percentage
  const calculateWeightProgress = useCallback(
    (current: number | null, target: number | null): number => {
      if (!current || !target) return 0;

      // Estimate starting weight as 10% more than current if target < current (weight loss)
      // or 10% less than current if target > current (weight gain)
      const startWeight = target < current ? current * 1.1 : current * 0.9;

      const totalProgress = Math.abs(startWeight - target);
      const currentProgress = Math.abs(startWeight - current);

      if (totalProgress <= 0) return 0;

      const percentage = (currentProgress / totalProgress) * 100;
      return Math.min(Math.max(percentage, 0), 100); // Clamp between 0 and 100
    },
    []
  );

  // Calculate macronutrient percentages based on goals
  const calculateMacroPercentages = (
    calories: number,
    protein: number,
    carbs: number,
    fat: number
  ): { protein: number; carbs: number; fat: number } => {
    const proteinCalories = protein * 4;
    const carbsCalories = carbs * 4;
    const fatCalories = fat * 9;

    const proteinPercentage = (proteinCalories / calories) * 100;
    const carbsPercentage = (carbsCalories / calories) * 100;
    const fatPercentage = (fatCalories / calories) * 100;

    return {
      protein: Math.round(proteinPercentage),
      carbs: Math.round(carbsPercentage),
      fat: Math.round(fatPercentage),
    };
  };

  // Auto-calculate macronutrients based on target calories
  const recalculateMacros = useCallback(
    (calories: number, goalType: GoalType): void => {
      let proteinPercentage = 0;
      let carbsPercentage = 0;
      let fatPercentage = 0;

      // Adjust macros based on goal type
      switch (goalType) {
        case "Weight Loss":
          proteinPercentage = 0.35; // 35% protein
          fatPercentage = 0.3; // 30% fat
          carbsPercentage = 0.35; // 35% carbs
          break;
        case "Muscle Gain":
          proteinPercentage = 0.3; // 30% protein
          fatPercentage = 0.25; // 25% fat
          carbsPercentage = 0.45; // 45% carbs
          break;
        case "Weight Maintenance":
        default:
          proteinPercentage = 0.25; // 25% protein
          fatPercentage = 0.3; // 30% fat
          carbsPercentage = 0.45; // 45% carbs
      }

      // Convert percentages to grams
      const protein = Math.round((calories * proteinPercentage) / 4);
      const carbs = Math.round((calories * carbsPercentage) / 4);
      const fat = Math.round((calories * fatPercentage) / 9);

      setTargetProtein(protein);
      setTargetCarbs(carbs);
      setTargetFat(fat);
    },
    []
  );

  // Load user profile data
  const loadUserProfile = useCallback(async (): Promise<void> => {
    if (!session?.user?.id) return;

    setIsLoading(true);

    try {
      // Fetch user profile
      const profile = await getUserProfileById(session.user.id);

      if (profile) {
        // Set form values from profile
        setTargetWeight(profile.targetWeight || null);
        setTargetCalories(profile.targetCalories || 2000);
        setTargetProtein(profile.targetProtein || 120);
        setTargetCarbs(profile.targetCarbs || 200);
        setTargetFat(profile.targetFat || 60);
        setActivityLevel(
          (profile.activityLevel as ActivityLevel) || "Moderately Active"
        );
        setGoalType((profile.goalType as GoalType) || "Weight Loss");
        setCurrentWeight(profile.currentWeight || null);

        // Calculate weight progress
        if (profile.currentWeight && profile.targetWeight) {
          const progressPercentage = calculateWeightProgress(
            profile.currentWeight,
            profile.targetWeight
          );
          setWeightProgressPercentage(progressPercentage);
        }
      }
    } catch (error) {
      console.error("Error loading user profile:", error);
      toast.error("Failed to load your profile data. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [session?.user?.id, calculateWeightProgress]);

  // Load data when component mounts
  useEffect(() => {
    if (mounted && session?.user?.id) {
      loadUserProfile();
    }
  }, [mounted, session?.user?.id, loadUserProfile]);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();

    if (!session?.user?.id) return;

    setIsSaving(true);

    try {
      await createOrUpdateUserProfile(session.user.id, {
        targetWeight: targetWeight ?? undefined,
        targetCalories,
        targetProtein,
        targetCarbs,
        targetFat,
        activityLevel,
        goalType,
      });

      toast.success("Goals updated successfully!");

      // Reload data to reflect changes
      await loadUserProfile();
    } catch (error) {
      console.error("Error updating goals:", error);
      toast.error("Failed to update goals. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  // Handle auto-calculation of macros
  const handleAutoCalcMacros = (): void => {
    recalculateMacros(targetCalories, goalType);
    toast.success(
      "Macronutrients automatically calculated based on your goal!"
    );
  };

  // Handle hydration properly - don't render until mounted
  if (!mounted) {
    return null;
  }

  if (status === "loading" || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-300">
            Loading your goals...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header - Matching the design from the image */}
      <header className="flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
        <HamburgerMenu />
        <div className="text-2xl font-bold">
          niblet<span className="text-blue-400">.ai</span>
        </div>
        <div className="w-6"></div> {/* Empty div for balanced spacing */}
      </header>

      <div className="container max-w-4xl mx-auto p-4 space-y-6">
        {/* Header with back button */}
        <div className="flex items-center mb-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/dashboard")}
            className="mr-2"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold">Goals</h1>
        </div>

        {/* Weight Progress Card */}
        {currentWeight && targetWeight && (
          <Card className="overflow-hidden">
            <CardHeader>
              <CardTitle>Weight Progress</CardTitle>
              <CardDescription>
                Track your progress towards your weight goal
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <div className="mb-6">
                <div className="flex justify-between text-sm text-gray-500 mb-1">
                  <span>Progress: {weightProgressPercentage.toFixed(0)}%</span>
                  <span>
                    {currentWeight} lbs → {targetWeight} lbs
                  </span>
                </div>
                <Progress value={weightProgressPercentage} className="h-2" />
              </div>

              <div className="grid grid-cols-2 gap-4 text-center">
                <div className="space-y-1">
                  <p className="text-sm text-gray-500">Current</p>
                  <p className="text-xl font-bold">{currentWeight} lbs</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-gray-500">Target</p>
                  <p className="text-xl font-bold">{targetWeight} lbs</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Weight Goals Card */}
          <Card>
            <CardHeader>
              <CardTitle>Weight Goals</CardTitle>
              <CardDescription>Set your target weight goals</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div>
                  <label
                    htmlFor="targetWeight"
                    className="block text-sm font-medium mb-2"
                  >
                    Target Weight (lbs)
                  </label>
                  <Input
                    id="targetWeight"
                    type="number"
                    step="0.1"
                    placeholder="Enter target weight"
                    value={targetWeight === null ? "" : targetWeight}
                    onChange={(e) =>
                      setTargetWeight(
                        e.target.value ? parseFloat(e.target.value) : null
                      )
                    }
                    className="w-full"
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Your desired weight goal
                  </p>
                </div>

                <div>
                  <label
                    htmlFor="goalType"
                    className="block text-sm font-medium mb-2"
                  >
                    Goal Type
                  </label>
                  <Select
                    value={goalType}
                    onValueChange={(value) => setGoalType(value as GoalType)}
                  >
                    <SelectTrigger id="goalType">
                      <SelectValue placeholder="Select your goal" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Weight Loss">Weight Loss</SelectItem>
                      <SelectItem value="Weight Maintenance">
                        Weight Maintenance
                      </SelectItem>
                      <SelectItem value="Muscle Gain">Muscle Gain</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label
                    htmlFor="activityLevel"
                    className="block text-sm font-medium mb-2"
                  >
                    Activity Level
                  </label>
                  <Select
                    value={activityLevel}
                    onValueChange={(value) =>
                      setActivityLevel(value as ActivityLevel)
                    }
                  >
                    <SelectTrigger id="activityLevel">
                      <SelectValue placeholder="Select your activity level" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Sedentary">
                        Sedentary (little to no exercise)
                      </SelectItem>
                      <SelectItem value="Lightly Active">
                        Lightly Active (1-3 days/week)
                      </SelectItem>
                      <SelectItem value="Moderately Active">
                        Moderately Active (3-5 days/week)
                      </SelectItem>
                      <SelectItem value="Very Active">
                        Very Active (6-7 days/week)
                      </SelectItem>
                      <SelectItem value="Extremely Active">
                        Extremely Active (athlete/physical job)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Nutrition Goals Card */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div>
                <CardTitle>Nutrition Goals</CardTitle>
                <CardDescription>
                  Set your daily calorie and macronutrient targets
                </CardDescription>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAutoCalcMacros}
              >
                Auto-Calculate Macros
              </Button>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              <div>
                <label
                  htmlFor="targetCalories"
                  className="block text-sm font-medium mb-2"
                >
                  Daily Calorie Target
                </label>
                <Input
                  id="targetCalories"
                  type="number"
                  step="50"
                  placeholder="Enter daily calorie target"
                  value={targetCalories}
                  onChange={(e) =>
                    setTargetCalories(parseInt(e.target.value) || 0)
                  }
                  className="w-full"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label
                    htmlFor="targetProtein"
                    className="block text-sm font-medium mb-2"
                  >
                    Protein (g)
                  </label>
                  <Input
                    id="targetProtein"
                    type="number"
                    step="5"
                    placeholder="Protein in grams"
                    value={targetProtein}
                    onChange={(e) =>
                      setTargetProtein(parseInt(e.target.value) || 0)
                    }
                    className="w-full"
                  />
                </div>

                <div>
                  <label
                    htmlFor="targetCarbs"
                    className="block text-sm font-medium mb-2"
                  >
                    Carbs (g)
                  </label>
                  <Input
                    id="targetCarbs"
                    type="number"
                    step="5"
                    placeholder="Carbs in grams"
                    value={targetCarbs}
                    onChange={(e) =>
                      setTargetCarbs(parseInt(e.target.value) || 0)
                    }
                    className="w-full"
                  />
                </div>

                <div>
                  <label
                    htmlFor="targetFat"
                    className="block text-sm font-medium mb-2"
                  >
                    Fat (g)
                  </label>
                  <Input
                    id="targetFat"
                    type="number"
                    step="5"
                    placeholder="Fat in grams"
                    value={targetFat}
                    onChange={(e) =>
                      setTargetFat(parseInt(e.target.value) || 0)
                    }
                    className="w-full"
                  />
                </div>
              </div>

              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-sm">
                <p className="mb-2 font-medium">Macronutrient Distribution</p>
                <div className="text-xs text-gray-500 space-y-1">
                  <div className="flex justify-between">
                    <span>
                      Protein:{" "}
                      {
                        calculateMacroPercentages(
                          targetCalories,
                          targetProtein,
                          targetCarbs,
                          targetFat
                        ).protein
                      }
                      %
                    </span>
                    <span>{targetProtein * 4} calories</span>
                  </div>
                  <div className="flex justify-between">
                    <span>
                      Carbs:{" "}
                      {
                        calculateMacroPercentages(
                          targetCalories,
                          targetProtein,
                          targetCarbs,
                          targetFat
                        ).carbs
                      }
                      %
                    </span>
                    <span>{targetCarbs * 4} calories</span>
                  </div>
                  <div className="flex justify-between">
                    <span>
                      Fat:{" "}
                      {
                        calculateMacroPercentages(
                          targetCalories,
                          targetProtein,
                          targetCarbs,
                          targetFat
                        ).fat
                      }
                      %
                    </span>
                    <span>{targetFat * 9} calories</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Submit Button */}
          <Button
            type="submit"
            className="w-full md:w-auto"
            disabled={isSaving}
          >
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
        </form>
      </div>
    </div>
  );
};

export default GoalsPage;

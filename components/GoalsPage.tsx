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
import { Label } from "@/components/ui/label";
import { createOrUpdateUserProfile } from "@/lib/firebase/models/user";
import { Save, X } from "lucide-react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import ActivityZoneSelector from "./ActivityZoneSelector";
import HeightSelector from "./HeightSelector";

export default function GoalsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Simplified goals with only necessary fields
  const [currentWeight, setCurrentWeight] = useState<number | null>(null);
  const [targetWeight, setTargetWeight] = useState<number | null>(null);
  const [targetCalories, setTargetCalories] = useState<number>(2000);
  const [height, setHeight] = useState<number | null>(null);
  const [activityZone, setActivityZone] = useState<number>(3);
  const [activityLabel, setActivityLabel] =
    useState<string>("Moderately Active");

  // Set mounted state to prevent hydration issues
  useEffect(() => {
    setMounted(true);
  }, []);

  // Redirect if not authenticated
  useEffect(() => {
    if (mounted && status === "unauthenticated") {
      router.push("/auth/signin");
    }
  }, [status, router, mounted]);

  // Fetch user profile data
  const fetchUserProfile = useCallback(async () => {
    if (!session?.user?.id) return;

    try {
      const response = await fetch("/api/user/profile");
      if (response.ok) {
        const userProfile = await response.json();

        // Set form values from profile
        if (userProfile.currentWeight)
          setCurrentWeight(userProfile.currentWeight);
        if (userProfile.targetWeight) setTargetWeight(userProfile.targetWeight);
        if (userProfile.targetCalories)
          setTargetCalories(userProfile.targetCalories);
        if (userProfile.height) setHeight(userProfile.height);

        // Set activity zone
        if (userProfile.activityLevel) {
          const activityMap: Record<string, number> = {
            sedentary: 1,
            "lightly active": 2,
            "moderately active": 3,
            "very active": 4,
            "extremely active": 5,
          };

          const level = userProfile.activityLevel.toLowerCase();
          if (activityMap[level]) {
            setActivityZone(activityMap[level]);
            setActivityLabel(userProfile.activityLevel);
          }
        }
      }
    } catch (error) {
      console.error("Error fetching user profile:", error);
      toast.error("Failed to load profile data");
    }
  }, [session?.user?.id]);

  // Initialize form with session data and fetch profile
  useEffect(() => {
    if (mounted && status === "authenticated" && session?.user) {
      fetchUserProfile();
    }
  }, [status, session, mounted, fetchUserProfile]);

  // Handle height change
  const handleHeightChange = (heightInInches: number) => {
    setHeight(heightInInches);
  };

  // Handle activity zone change
  const handleActivityZoneChange = (zone: number, label: string) => {
    setActivityZone(zone);
    setActivityLabel(label);
  };

  // Calculate estimated daily calorie needs based on user stats
  const calculateDailyCalories = (): number => {
    if (!currentWeight) return 2000; // Default value

    // Basic BMR calculation using the Harris-Benedict equation (simplified version)
    // For this implementation, we'll use a simplified formula based on weight
    const bmr = currentWeight * 10; // Very simplified BMR estimate

    // Activity multiplier based on zone
    const activityMultipliers = [1.2, 1.375, 1.55, 1.725, 1.9];
    const multiplier = activityMultipliers[activityZone - 1] || 1.55;

    // Calculate daily needs
    let dailyCalories = Math.round(bmr * multiplier);

    // If there's a weight loss goal, adjust calories
    if (targetWeight && targetWeight < currentWeight) {
      // Create a deficit (about 500 calories is common for 1lb/week loss)
      dailyCalories -= 500;
    }

    return dailyCalories;
  };

  // Update calorie target when relevant inputs change
  useEffect(() => {
    if (currentWeight) {
      const calculatedCalories = calculateDailyCalories();
      setTargetCalories(calculatedCalories);
    }
  }, [currentWeight, targetWeight, activityZone]);

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();

    if (!session?.user?.id) return;

    setIsSaving(true);

    try {
      // Simplified data model with just the essential fields
      await createOrUpdateUserProfile(session.user.id, {
        currentWeight: currentWeight ?? undefined,
        targetWeight: targetWeight ?? undefined,
        targetCalories,
        height: height ?? undefined,
        activityLevel: activityLabel,
      });

      toast.success("Goals updated successfully!");

      // Return to dashboard
      setTimeout(() => {
        router.push("/dashboard");
      }, 1500);
    } catch (error) {
      console.error("Error updating goals:", error);
      toast.error("Failed to update goals. Please try again.");
      setIsSaving(false);
    }
  };

  // Handle hydration properly - don't render until mounted
  if (!mounted) {
    return null;
  }

  if (status === "loading") {
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
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
        <div></div>
        <div className="text-2xl font-bold">
          niblet<span className="text-blue-400">.ai</span>
        </div>
        <Button
          size="icon"
          variant="ghost"
          onClick={() => router.push("/dashboard")}
        >
          <X className="h-5 w-5" />
        </Button>
      </header>

      <div className="container max-w-4xl mx-auto p-4 space-y-6">
        <h1 className="text-xl font-bold">Weight Goals</h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Weight goals card - simplified */}
          <Card>
            <CardHeader>
              <CardTitle>Your Weight Journey</CardTitle>
              <CardDescription>
                Track your progress towards your target weight
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="currentWeight">Current Weight (lbs)</Label>
                  <Input
                    id="currentWeight"
                    type="number"
                    step="0.1"
                    placeholder="Enter your current weight"
                    value={currentWeight === null ? "" : currentWeight}
                    onChange={(e) =>
                      setCurrentWeight(
                        e.target.value ? parseFloat(e.target.value) : null
                      )
                    }
                  />
                </div>

                <div>
                  <Label htmlFor="targetWeight">Target Weight (lbs)</Label>
                  <Input
                    id="targetWeight"
                    type="number"
                    step="0.1"
                    placeholder="Enter your target weight"
                    value={targetWeight === null ? "" : targetWeight}
                    onChange={(e) =>
                      setTargetWeight(
                        e.target.value ? parseFloat(e.target.value) : null
                      )
                    }
                  />
                </div>
              </div>

              <div className="mt-4">
                <HeightSelector
                  initialHeight={height || undefined}
                  onChange={handleHeightChange}
                />
              </div>

              <div className="mt-4">
                <ActivityZoneSelector
                  initialZone={activityZone}
                  onChange={handleActivityZoneChange}
                />
              </div>

              {currentWeight && (
                <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <div className="mb-2">
                    <div className="font-medium">
                      Calculated Daily Calorie Target
                    </div>
                    <div className="text-2xl font-bold">
                      {targetCalories} calories
                    </div>
                  </div>
                  <div className="text-sm text-gray-500">
                    Based on your current weight, target weight, and profile
                    information
                  </div>
                </div>
              )}
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
}

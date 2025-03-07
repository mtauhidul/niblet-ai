"use client";

import HamburgerMenu from "@/components/HamburgerMenu";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { getUserProfileById } from "@/lib/auth/authService";
import { createOrUpdateUserProfile } from "@/lib/firebase/models/user";
import { ArrowLeft, Save } from "lucide-react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

const GoalsPage = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [currentWeight, setCurrentWeight] = useState<number | null>(null);
  const [targetWeight, setTargetWeight] = useState<number | null>(null);
  const [goals, setGoals] = useState({
    targetWeight: null as number | null,
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

  // Load user goals from Firestore
  const loadGoals = useCallback(async () => {
    if (!session?.user?.id || status !== "authenticated") return;

    setIsLoading(true);
    try {
      const profile = await getUserProfileById(session.user.id);

      if (profile) {
        setCurrentWeight(profile.currentWeight || null);
        setTargetWeight(profile.targetWeight || null);

        setGoals((prev) => ({
          ...prev,
          targetWeight: profile.targetWeight || null,
          targetCalories: profile.targetCalories || 2000,
          targetProtein: profile.targetProtein || 120,
          targetCarbs: profile.targetCarbs || 200,
          targetFat: profile.targetFat || 60,
          goalType: profile.goalType || "Weight Loss",
          activityLevel: profile.activityLevel || "Moderately Active",
        }));
      }
    } catch (error) {
      console.error("Error loading goals:", error);
      toast.error("Failed to load your goals.");
    } finally {
      setIsLoading(false);
    }
  }, [session?.user?.id, status]);

  // Load goals when authenticated and mounted
  useEffect(() => {
    if (mounted && status === "authenticated") {
      loadGoals();
    }
  }, [mounted, status, loadGoals]);

  // Save goals
  const saveGoals = async () => {
    if (!session?.user?.id) return;

    setIsSaving(true);
    try {
      await createOrUpdateUserProfile(session.user.id, {
        ...goals,
        targetWeight: goals.targetWeight ?? undefined,
      });
      toast.success("Goals saved successfully!");
    } catch (error) {
      console.error("Error saving goals:", error);
      toast.error("Failed to save goals.");
    } finally {
      setIsSaving(false);
    }
  };

  // Prevent rendering until mounted to avoid hydration mismatch
  if (!mounted) {
    return null;
  }

  // Show loading state if still fetching
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
                  <span>Progress: 50%</span>
                  <span>
                    {currentWeight} lbs → {targetWeight} lbs
                  </span>
                </div>
                <Progress value={50} className="h-2" />
              </div>
            </CardContent>
          </Card>
        )}

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

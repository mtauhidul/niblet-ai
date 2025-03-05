// components/Dashboard.tsx - Enhanced with dynamic data updates
"use client";

import { Card, CardContent } from "@/components/ui/card";
import { PersonalityKey } from "@/lib/assistantService";
import { getUserProfileById } from "@/lib/auth/authService";
import type { Meal } from "@/lib/firebase/models/meal";
import { LogOut, RefreshCw, User } from "lucide-react";
import { signOut, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import ChatContainer from "./ChatContainer";
import TodaysMeals from "./TodaysMeals";
import { Button } from "./ui/button";
import { Skeleton } from "./ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "./ui/tabs";

interface UserProfile {
  userId: string;
  targetCalories?: number;
  aiPersonality?: string;
  threadId?: string;
  assistantId?: string;
  currentWeight?: number;
  targetWeight?: number;
}

interface DashboardProps {
  aiPersonality?: PersonalityKey;
}

const Dashboard = ({
  aiPersonality: propAiPersonality,
}: DashboardProps = {}) => {
  const [caloriesConsumed, setCaloriesConsumed] = useState(0);
  const [caloriesRemaining, setCaloriesRemaining] = useState(0);
  const [targetCalories, setTargetCalories] = useState(2000); // Default target
  const [todaysMeals, setTodaysMeals] = useState<Meal[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [aiPersonality, setAiPersonality] = useState<PersonalityKey>(
    propAiPersonality || "best-friend"
  );
  const [activeTab, setActiveTab] = useState<"chat" | "stats">("chat");
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [loadingError, setLoadingError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState(Date.now()); // For forcing re-fetches

  const { data: session, status } = useSession();
  const router = useRouter();

  // Set mounted state to prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  // Fetch today's meals with dedicated error handling - made into a memoized function
  // Updated fetchTodaysMeals function for Dashboard.tsx
  const fetchTodaysMeals = useCallback(async () => {
    if (!session?.user?.id) return;

    setIsRefreshing(true);
    try {
      console.log("Fetching meals at:", new Date().toISOString());

      // Format date as YYYY-MM-DD and add timestamp to prevent caching
      const today = new Date().toISOString().split("T")[0];
      const timestamp = Date.now();

      try {
        const response = await fetch(
          `/api/meals?date=${today}&_t=${timestamp}`
        );

        if (!response.ok) {
          console.error(
            "Meals API Error:",
            response.status,
            response.statusText
          );
          // Don't throw error, just log it and continue with empty array
          setTodaysMeals([]);
          setCaloriesConsumed(0);
          setCaloriesRemaining(targetCalories);

          // Show toast message
          toast.error("Failed to load your meals. Please try again later.");
          return;
        }

        const mealsData = await response.json();
        console.log("Meals data received:", mealsData);

        // Handle empty arrays properly
        if (Array.isArray(mealsData)) {
          setTodaysMeals(mealsData);

          // Calculate calories consumed and remaining
          const totalCalories = mealsData.reduce(
            (sum, meal) => sum + (Number(meal.calories) || 0),
            0
          );

          console.log("Total calories calculated:", totalCalories);
          setCaloriesConsumed(totalCalories);
          setCaloriesRemaining(targetCalories - totalCalories);
        } else {
          // If response is not an array, set empty meals
          setTodaysMeals([]);
          setCaloriesConsumed(0);
          setCaloriesRemaining(targetCalories);
        }
      } catch (fetchError) {
        console.error("Error fetching meals:", fetchError);
        // Set empty meals on error
        setTodaysMeals([]);
        setCaloriesConsumed(0);
        setCaloriesRemaining(targetCalories);

        // Show toast message
        toast.error("Failed to load your meals. Network error occurred.");
      }

      // Always try to fetch summary data separately as a fallback
      try {
        const summaryResponse = await fetch(
          `/api/meals?summary=true&date=${today}&_t=${timestamp}`
        );

        if (summaryResponse.ok) {
          const summaryData = await summaryResponse.json();
          console.log("Calories summary:", summaryData);

          if (summaryData && typeof summaryData.consumed === "number") {
            setCaloriesConsumed(summaryData.consumed);
            setCaloriesRemaining(targetCalories - summaryData.consumed);
          }
        }
      } catch (summaryError) {
        console.error("Error fetching calories summary:", summaryError);
        // Already set fallback values above, so no need to do anything here
      }
    } catch (error) {
      console.error("Error in fetchTodaysMeals:", error);

      // Set empty data
      setTodaysMeals([]);
      setCaloriesConsumed(0);
      setCaloriesRemaining(targetCalories);

      // Show toast message
      toast.error("Something went wrong while loading your meal data.");
    } finally {
      setIsRefreshing(false);
    }
  }, [session?.user?.id, targetCalories]);

  // Fetch user data including profile and meals
  const fetchUserData = useCallback(async () => {
    if (!session?.user?.id) return;

    setIsLoading(true);
    setLoadingError(null);

    try {
      // Fetch user profile
      const profileData = await getUserProfileById(session.user.id);
      if (profileData) {
        setUserProfile(profileData);

        // Set AI personality from profile or use default
        if (profileData.aiPersonality) {
          setAiPersonality(profileData.aiPersonality as PersonalityKey);
        }

        // Set target calories from profile or use default
        if (profileData.targetCalories) {
          setTargetCalories(profileData.targetCalories);
        }
      }

      // Fetch today's meals separately to isolate errors
      await fetchTodaysMeals();
    } catch (error) {
      console.error("Error fetching user data:", error);
      setLoadingError(
        "Failed to load your profile data. Please try refreshing."
      );
    } finally {
      setIsLoading(false);
    }
  }, [session?.user?.id, fetchTodaysMeals]);

  // Initial data loading
  useEffect(() => {
    // Only run client-side code after mounting
    if (!mounted) return;

    // Redirect to sign in if not authenticated
    if (status === "unauthenticated") {
      router.push("/auth/signin");
    } else if (status === "authenticated" && session?.user?.id) {
      fetchUserData();
    }
  }, [status, router, session, mounted, fetchUserData]);

  // Set up periodic refresh for data
  useEffect(() => {
    // Only set up refresh if authenticated and mounted
    if (!mounted || status !== "authenticated" || !session?.user?.id) return;

    // Refresh data every minute to keep it current
    const refreshInterval = setInterval(() => {
      console.log("Auto-refreshing data...");
      fetchTodaysMeals();
      setLastRefresh(Date.now());
    }, 60000); // 1 minute

    return () => clearInterval(refreshInterval);
  }, [mounted, status, session?.user?.id, fetchTodaysMeals]);

  // Refresh data when tab becomes active
  useEffect(() => {
    if (!mounted) return;

    const handleVisibilityChange = () => {
      if (
        document.visibilityState === "visible" &&
        status === "authenticated"
      ) {
        console.log("Tab became visible, refreshing data...");
        fetchTodaysMeals();
        setLastRefresh(Date.now());
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [mounted, status, fetchTodaysMeals]);

  // Handle meal logged from chat or any source
  const handleMealLogged = useCallback(async () => {
    console.log("Meal logged, refreshing data...");
    await fetchTodaysMeals();
    setLastRefresh(Date.now());

    // If on chat tab, switch to meals tab to show the new meal
    setActiveTab("stats");
  }, [fetchTodaysMeals]);

  // Handle manual refresh
  const handleRefresh = useCallback(() => {
    console.log("Manual refresh requested");
    fetchTodaysMeals();
    setLastRefresh(Date.now());
  }, [fetchTodaysMeals]);

  // Handle weight logged from chat
  const handleWeightLogged = useCallback(async () => {
    if (!session?.user?.id) return;

    try {
      // Refresh user profile to get updated weight
      const profileData = await getUserProfileById(session.user.id);
      if (profileData) {
        setUserProfile(profileData);
      }
    } catch (error) {
      console.error("Error refreshing user profile:", error);

      toast.error("Failed to update your weight information.");
    }
  }, [session?.user?.id]);

  const handleSignOut = async () => {
    try {
      await signOut({ callbackUrl: "/" });
    } catch (error) {
      console.error("Error signing out:", error);
      // Force redirect to homepage on error
      window.location.href = "/";
    }
  };

  // Handle hydration properly - don't render until mounted
  if (!mounted) {
    return null;
  }

  if (status === "loading" || isLoading) {
    return (
      <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-900 p-4">
        <header className="py-4 border-b dark:border-gray-800 flex justify-between items-center">
          <div className="w-6"></div>
          <div className="text-2xl font-bold">
            niblet<span className="text-blue-400">.ai</span>
          </div>
          <div className="w-6"></div>
        </header>

        <div className="p-4">
          <Skeleton className="h-24 w-full mb-6" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="p-4 border-b dark:border-gray-800 flex justify-between items-center">
        <div></div>
        <div className="text-2xl font-bold">
          niblet<span className="text-blue-400">.ai</span>
        </div>
        <div className="flex gap-2">
          <Button
            size="icon"
            variant="ghost"
            onClick={() => router.push("/profile")}
          >
            <User className="h-5 w-5" />
          </Button>
          <Button size="icon" variant="ghost" onClick={handleSignOut}>
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </header>

      {/* Error message if loading failed */}
      {loadingError && (
        <div className="bg-red-100 dark:bg-red-900 p-4 m-4 rounded-lg text-red-800 dark:text-red-200">
          <div className="font-medium">Error loading data</div>
          <div>{loadingError}</div>
          <Button
            variant="outline"
            size="sm"
            className="mt-2"
            onClick={fetchUserData}
          >
            Retry
          </Button>
        </div>
      )}

      {/* Calories Card */}
      <Card className="mx-4 my-4">
        <CardContent className="p-0 flex">
          <div className="w-1/2 p-4 bg-green-200 dark:bg-green-900 rounded-l-xl">
            <div className="text-3xl font-bold text-center">
              {caloriesConsumed}
            </div>
            <div className="text-sm text-center">calories today</div>
          </div>
          <div className="w-1/2 p-4 rounded-r-xl">
            <div className="text-3xl font-bold text-center">
              {caloriesRemaining}
            </div>
            <div className="text-sm text-center">calories remaining</div>
          </div>
        </CardContent>
      </Card>

      {/* Tab Navigation */}
      <div className="mx-4 mb-2">
        <Tabs
          defaultValue="chat"
          value={activeTab}
          onValueChange={(value) => setActiveTab(value as "chat" | "stats")}
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="chat">Chat</TabsTrigger>
            <TabsTrigger value="stats">
              Today's Meals
              {activeTab === "stats" && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="ml-2 h-6 w-6"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRefresh();
                  }}
                  disabled={isRefreshing}
                >
                  <RefreshCw
                    className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
                  />
                </Button>
              )}
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-hidden mx-4">
        {activeTab === "chat" ? (
          <div className="h-full flex flex-col">
            <ChatContainer
              aiPersonality={aiPersonality}
              threadId={userProfile?.threadId}
              assistantId={userProfile?.assistantId}
              onMealLogged={handleMealLogged}
              onWeightLogged={handleWeightLogged}
            />
          </div>
        ) : (
          <div className="h-full overflow-y-auto">
            <TodaysMeals
              meals={todaysMeals}
              isLoading={isRefreshing}
              onMealDeleted={handleMealLogged}
              key={`meals-${lastRefresh}`} // Force re-render on refresh
            />

            {userProfile?.currentWeight && userProfile?.targetWeight && (
              <div className="mt-6 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
                <h3 className="font-bold mb-2">Weight Progress</h3>
                <div className="flex justify-between items-center">
                  <div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      Current
                    </div>
                    <div className="text-lg font-medium">
                      {userProfile.currentWeight} lbs
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      Remaining
                    </div>
                    <div className="text-lg font-medium">
                      {Math.abs(
                        userProfile.currentWeight - userProfile.targetWeight
                      ).toFixed(1)}{" "}
                      lbs
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      Target
                    </div>
                    <div className="text-lg font-medium">
                      {userProfile.targetWeight} lbs
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="py-6 text-center">
              <Button variant="outline" onClick={() => setActiveTab("chat")}>
                Track a new meal
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;

"use client";

import { Card, CardContent } from "@/components/ui/card";
import { PersonalityKey } from "@/lib/assistantService";
import { getUserProfileById } from "@/lib/auth/authService";
import type { Meal } from "@/lib/firebase/models/meal";
import { getCaloriesSummary } from "@/lib/firebase/models/meal";
import { LogOut, User } from "lucide-react";
import { signOut, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
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

  const { data: session, status } = useSession();
  const router = useRouter();

  // Set mounted state to prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    // Only run client-side code after mounting
    if (!mounted) return;

    // Redirect to sign in if not authenticated
    if (status === "unauthenticated") {
      router.push("/auth/signin");
    } else if (status === "authenticated" && session?.user?.id) {
      fetchUserData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, router, session, mounted]);

  // Fetch user data and today's meals
  const fetchUserData = async () => {
    if (!session?.user?.id) return;

    setIsLoading(true);
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

      // Fetch today's calories summary
      const today = new Date();
      const caloriesSummary = await getCaloriesSummary(session.user.id, today);

      setCaloriesConsumed(caloriesSummary.consumed);
      setCaloriesRemaining(
        (profileData?.targetCalories || 2000) - caloriesSummary.consumed
      );

      // Fetch today's meals
      await fetchTodaysMeals();
    } catch (error) {
      console.error("Error fetching user data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Separate function to fetch today's meals
  const fetchTodaysMeals = async () => {
    if (!session?.user?.id) return;

    setIsRefreshing(true);
    try {
      const response = await fetch(
        `/api/meals?date=${new Date().toISOString().split("T")[0]}`
      );

      if (response.ok) {
        const mealsData = await response.json();
        setTodaysMeals(mealsData);
      }
    } catch (error) {
      console.error("Error fetching meals:", error);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Handle meal logged from chat
  const handleMealLogged = async () => {
    await fetchTodaysMeals();

    // Also update calories
    if (session?.user?.id) {
      const caloriesSummary = await getCaloriesSummary(
        session.user.id,
        new Date()
      );

      setCaloriesConsumed(caloriesSummary.consumed);
      setCaloriesRemaining(targetCalories - caloriesSummary.consumed);
    }
  };

  // Handle weight logged from chat
  const handleWeightLogged = async () => {
    if (!session?.user?.id) return;

    try {
      // Refresh user profile to get updated weight
      const profileData = await getUserProfileById(session.user.id);
      if (profileData) {
        setUserProfile(profileData);
      }
    } catch (error) {
      console.error("Error refreshing user profile:", error);
    }
  };

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
            <TabsTrigger value="stats">Today's Meals</TabsTrigger>
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

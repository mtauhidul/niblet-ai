// components/Dashboard.tsx
"use client";

import { PersonalityKey } from "@/lib/assistantService";
import { getUserProfileById } from "@/lib/auth/authService";
import { db } from "@/lib/firebase/clientApp";
import type { Meal } from "@/lib/firebase/models/meal";
import type { UserProfile } from "@/lib/firebase/models/user";
import {
  collection,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  Timestamp,
  where,
} from "firebase/firestore";
import { ChevronDown, ChevronUp, Settings } from "lucide-react";
import { signOut, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import CaloriesStatusBar from "./CaloriesStatusBar";
import ChatContainer from "./ChatContainer";
import CombinedWeightCalorieChart from "./CombinedWeightCalorieChart";
import HamburgerMenu from "./HamburgerMenu";
import TodaysMeals from "./TodaysMeals";
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
import { Tabs, TabsList, TabsTrigger } from "./ui/tabs";

interface CollapsibleSectionProps {
  title: string;
  children: React.ReactNode;
  initiallyExpanded?: boolean;
}

const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({
  title,
  children,
  initiallyExpanded = false,
}) => {
  const [isExpanded, setIsExpanded] = useState(initiallyExpanded);

  return (
    <div className="border rounded-lg mb-4 overflow-hidden bg-white dark:bg-gray-800 shadow-sm">
      <button
        className="w-full flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 text-left font-medium"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {title}
        {isExpanded ? (
          <ChevronUp className="h-4 w-4" />
        ) : (
          <ChevronDown className="h-4 w-4" />
        )}
      </button>

      {isExpanded && (
        <div className="p-4 animate-in slide-in-from-top-4 duration-300">
          {children}
        </div>
      )}
    </div>
  );
};

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
  const [dateRange, setDateRange] = useState<
    "week" | "month" | "3months" | "year"
  >("month");
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [loadingError, setLoadingError] = useState<string | null>(null);
  const [isCalling, setIsCalling] = useState(false);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);

  // Toast state tracking to prevent duplicates
  const [toastShown, setToastShown] = useState(false);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Keep track of the current unsubscribe function
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const chartRef = useRef<HTMLDivElement>(null);

  const { data: session, status } = useSession();
  const router = useRouter();

  // Set mounted state to prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  // Helper function to get today's date bounds
  const getTodayDateBounds = useMemo(() => {
    const today = new Date();
    const startOfDay = new Date(new Date().setHours(0, 0, 0, 0));
    const endOfDay = new Date(new Date().setHours(23, 59, 59, 999));
    return { startOfDay, endOfDay };
  }, []);

  // Function to set up Firestore listener
  const setupFirestoreListener = useCallback(() => {
    if (!session?.user?.id) return null;

    const { startOfDay, endOfDay } = getTodayDateBounds;

    try {
      // Clear any existing listener first
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }

      // Create a real-time listener for meals
      const mealsQuery = query(
        collection(db, "meals"),
        where("userId", "==", session.user.id),
        where("date", ">=", startOfDay),
        where("date", "<=", endOfDay),
        orderBy("date", "desc")
      );

      const unsubscribe = onSnapshot(
        mealsQuery,
        (snapshot) => {
          const meals: Meal[] = [];
          snapshot.forEach((doc) => {
            const data = doc.data();
            meals.push({
              id: doc.id,
              ...data,
              date:
                data.date instanceof Timestamp
                  ? data.date.toDate()
                  : new Date(data.date),
            } as Meal);
          });

          setTodaysMeals(meals);

          // Calculate calories
          const totalCalories = meals.reduce(
            (sum, meal) => sum + (Number(meal.calories) || 0),
            0
          );

          setCaloriesConsumed(totalCalories);
          setCaloriesRemaining(targetCalories - totalCalories);
          setIsLoading(false);
          setIsRefreshing(false);
        },
        (error) => {
          console.error("Error in meals listener:", error);
          setLoadingError("Error getting real-time updates. Please refresh.");
          setIsLoading(false);
          setIsRefreshing(false);

          // Fallback to API call if listener fails
          fetchTodaysMeals();
        }
      );

      // Store the unsubscribe function
      unsubscribeRef.current = unsubscribe;
      return unsubscribe;
    } catch (error) {
      console.error("Error setting up Firestore listener:", error);
      setLoadingError("Error setting up data connection. Please refresh.");
      setIsLoading(false);
      setIsRefreshing(false);
      return null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.id, targetCalories, getTodayDateBounds]);

  // Setup Firestore real-time listener for meals
  useEffect(() => {
    if (!mounted || !session?.user?.id) return;

    setIsLoading(true);
    const unsubscribe = setupFirestoreListener();

    // Cleanup function
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [session?.user?.id, mounted, setupFirestoreListener]);

  // Fetch today's meals with dedicated error handling
  const fetchTodaysMeals = useCallback(async () => {
    if (!session?.user?.id) return;

    setIsRefreshing(true);
    try {
      console.log("Fetching meals at:", new Date().toISOString());
      const { startOfDay, endOfDay } = getTodayDateBounds;

      // Use direct Firestore query instead of API call for better reliability
      const mealsQuery = query(
        collection(db, "meals"),
        where("userId", "==", session.user.id),
        where("date", ">=", startOfDay),
        where("date", "<=", endOfDay),
        orderBy("date", "desc")
      );

      const querySnapshot = await getDocs(mealsQuery);

      const meals: Meal[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        meals.push({
          id: doc.id,
          ...data,
          date:
            data.date instanceof Timestamp
              ? data.date.toDate()
              : new Date(data.date),
        } as Meal);
      });

      setTodaysMeals(meals);

      // Calculate calories
      const totalCalories = meals.reduce(
        (sum, meal) => sum + (Number(meal.calories) || 0),
        0
      );

      setCaloriesConsumed(totalCalories);
      setCaloriesRemaining(targetCalories - totalCalories);

      // Don't show toast here to avoid duplicates - will be handled in handleRefresh

      // Set up listener again after manual refresh
      setupFirestoreListener();
      return meals;
    } catch (error) {
      console.error("Error in fetchTodaysMeals:", error);
      if (!toastShown) {
        toast.error("Something went wrong while refreshing your meal data");
        setToastShown(true);
        setTimeout(() => setToastShown(false), 3000);
      }
      setLoadingError("Failed to refresh data. Please try again.");
      throw error;
    } finally {
      setIsRefreshing(false);
    }
  }, [
    session?.user?.id,
    targetCalories,
    getTodayDateBounds,
    setupFirestoreListener,
    toastShown,
  ]);

  // Fetch user data including profile
  const fetchUserProfile = useCallback(async () => {
    if (!session?.user?.id) return;

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
    } catch (error) {
      console.error("Error fetching user profile:", error);
      // Silent fail for profile, we'll use defaults
    }
  }, [session?.user?.id]);

  // Initial data loading
  useEffect(() => {
    // Only run client-side code after mounting
    if (!mounted) return;

    // Redirect to sign in if not authenticated
    if (status === "unauthenticated") {
      router.push("/auth/signin");
    } else if (status === "authenticated" && session?.user?.id) {
      fetchUserProfile();
      // Note: We don't need to call fetchTodaysMeals here as the Firestore listener will handle it
    }
  }, [status, router, session, mounted, fetchUserProfile]);

  // Cleanup for toast timeouts
  useEffect(() => {
    return () => {
      // Clean up timeout on component unmount
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
      }
    };
  }, []);

  // Handle meal logged from chat or any source
  const handleMealLogged = useCallback(() => {
    console.log("Meal logged, refreshing data...");
    // No need to manually refresh as Firestore listener will update automatically

    // Show toast notification only if another one isn't already showing
    if (!toastShown) {
      toast.success("Meal logged successfully!");
      setToastShown(true);

      // Reset toast state after delay
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
      }

      toastTimeoutRef.current = setTimeout(() => {
        setToastShown(false);
      }, 3000);
    }
  }, [toastShown]);

  // Handle manual refresh with debounce for toasts
  const handleRefresh = useCallback(() => {
    if (isRefreshing) return;

    setIsRefreshing(true);

    // Fetch data
    fetchTodaysMeals()
      .then(() => {
        // Only show success if not recently shown
        if (!toastShown) {
          toast.success("Meal data refreshed successfully");
          setToastShown(true);

          // Reset toastShown after 3 seconds
          if (toastTimeoutRef.current) {
            clearTimeout(toastTimeoutRef.current);
          }

          toastTimeoutRef.current = setTimeout(() => {
            setToastShown(false);
          }, 3000);
        }
        setIsRefreshing(false);
      })
      .catch((error) => {
        console.error("Error refreshing data:", error);
        toast.error("Failed to refresh data");
        setIsRefreshing(false);
        setToastShown(false);
      });
  }, [fetchTodaysMeals, isRefreshing, toastShown]);

  // Handle weight logged from chat
  const handleWeightLogged = useCallback(async () => {
    if (!session?.user?.id) return;

    try {
      // Refresh user profile to get updated weight
      const profileData = await getUserProfileById(session.user.id);
      if (profileData) {
        setUserProfile(profileData);

        if (!toastShown) {
          toast.success("Weight updated successfully!");
          setToastShown(true);

          if (toastTimeoutRef.current) {
            clearTimeout(toastTimeoutRef.current);
          }

          toastTimeoutRef.current = setTimeout(() => {
            setToastShown(false);
          }, 3000);
        }
      }
    } catch (error) {
      console.error("Error refreshing user profile:", error);
      toast.error("Failed to update weight information.");
    }
  }, [session?.user?.id, toastShown]);

  // Handle phone call assistant
  const handlePhoneCall = () => {
    setIsCalling(true);
    toast.info("Connecting to assistant...");

    // Simulate call connection delay
    setTimeout(() => {
      toast.success("Connected to Niblet voice assistant");
      // In a real implementation, this would connect to a voice service
      // For now we'll just simulate with a timeout and then set back to normal

      setTimeout(() => {
        setIsCalling(false);
        toast.info("Call ended");
      }, 10000);
    }, 2000);
  };

  // Handle logout
  const handleLogout = async () => {
    try {
      await signOut({ callbackUrl: "/" });
    } catch (error) {
      console.error("Error during logout:", error);
      // Force redirect on error
      window.location.href = "/";
    }
  };

  // Handle personality change from hamburger menu
  const handlePersonalityChange = (newPersonality: PersonalityKey) => {
    setAiPersonality(newPersonality);
  };

  // Handle hydration properly - don't render until mounted
  if (!mounted) {
    return null;
  }

  if (status === "loading" || isLoading) {
    return (
      <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-900 p-4">
        <header className="py-3 border-b dark:border-gray-800 flex justify-between items-center">
          <div className="w-6"></div>
          <div className="text-2xl font-bold">
            niblet<span className="text-blue-400">.ai</span>
          </div>
          <div className="w-6"></div>
        </header>

        <div className="p-4">
          <Skeleton className="h-16 w-full mb-6" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header - Keep the HamburgerMenu */}
      <header className="py-3 px-4 border-b dark:border-gray-800 flex justify-between items-center">
        <HamburgerMenu
          currentPersonality={aiPersonality}
          onPersonalityChange={handlePersonalityChange}
        />
        <div className="text-2xl font-bold">
          niblet<span className="text-blue-400">.ai</span>
        </div>
        <Button
          size="icon"
          variant="ghost"
          onClick={() => setShowLogoutDialog(true)}
        >
          <Settings className="h-5 w-5" />
        </Button>
      </header>

      {/* Calories Status Bar */}
      <CaloriesStatusBar
        caloriesConsumed={caloriesConsumed}
        targetCalories={targetCalories}
        className="mx-4 my-3"
      />

      {/* Error message if loading failed */}
      {loadingError && (
        <div className="bg-red-100 dark:bg-red-900 p-4 m-4 rounded-lg text-red-800 dark:text-red-200">
          <div className="font-medium">Error loading data</div>
          <div>{loadingError}</div>
          <Button
            variant="outline"
            size="sm"
            className="mt-2"
            onClick={() => {
              setLoadingError(null);
              setupFirestoreListener();
            }}
          >
            Retry
          </Button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4">
        {/* Chat section - always expanded */}
        <div className="mb-4 border rounded-lg shadow-sm overflow-hidden">
          <ChatContainer
            aiPersonality={aiPersonality}
            threadId={userProfile?.threadId}
            assistantId={userProfile?.assistantId}
            onMealLogged={handleMealLogged}
            onWeightLogged={handleWeightLogged}
            isCalling={isCalling}
            onCall={handlePhoneCall}
          />
        </div>

        {/* Today's Meals - collapsible */}
        <CollapsibleSection title="Today's Meals">
          <TodaysMeals
            meals={todaysMeals}
            isLoading={isRefreshing}
            onMealDeleted={handleMealLogged}
          />
        </CollapsibleSection>

        {/* Progress Chart - collapsible */}
        <CollapsibleSection title="Progress Chart">
          <div ref={chartRef} className="relative">
            <CombinedWeightCalorieChart dateRange={dateRange} />

            {/* Simple date range selector */}
            <div className="mt-2 flex justify-center">
              <Tabs
                value={dateRange}
                onValueChange={(value) => setDateRange(value as any)}
              >
                <TabsList>
                  <TabsTrigger value="week">Week</TabsTrigger>
                  <TabsTrigger value="month">Month</TabsTrigger>
                  <TabsTrigger value="3months">3 Months</TabsTrigger>
                  <TabsTrigger value="year">Year</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </div>
        </CollapsibleSection>
      </div>

      {/* Logout confirmation dialog */}
      <AlertDialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Log out?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to log out of your account?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleLogout}>
              Log out
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Dashboard;

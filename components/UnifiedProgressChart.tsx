// components/UnifiedProgressChart.tsx
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { db } from "@/lib/firebase/clientApp";
import {
  collection,
  getDocs,
  query,
  Timestamp,
  where,
} from "firebase/firestore";
import { Expand, Minimize2, RefreshCw } from "lucide-react";
import { useSession } from "next-auth/react";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { ComposedChart, ResponsiveContainer } from "recharts";
import { Button } from "./ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Skeleton } from "./ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "./ui/tabs";

interface UnifiedProgressChartProps {
  initialDateRange?: string;
  initialMacroType?: string;
  onFullScreenChange?: (isFullScreen: boolean) => void;
}

interface WeightData {
  id?: string;
  userId: string;
  weight: number;
  date: Date | Timestamp;
  note?: string;
}

interface MealData {
  id?: string;
  userId: string;
  name: string;
  calories: number;
  protein?: number | null;
  carbs?: number | null;
  fat?: number | null;
  mealType?: string | null;
  date: Date | Timestamp;
}

interface ChartData {
  date: string;
  calories?: number;
  calorieTarget?: number;
  weight?: number;
  weightTarget?: number;
  protein?: number;
  proteinTarget?: number;
  carbs?: number;
  carbsTarget?: number;
  fat?: number;
  fatTarget?: number;
}

const UnifiedProgressChart: React.FC<UnifiedProgressChartProps> = ({
  initialDateRange = "week",
  initialMacroType = "calories",
  onFullScreenChange,
}) => {
  const { data: session } = useSession();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<string>(initialDateRange);
  const [macroType, setMacroType] = useState<string>(initialMacroType);
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [weightData, setWeightData] = useState<WeightData[]>([]);
  const [mealData, setMealData] = useState<MealData[]>([]);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [targetWeight, setTargetWeight] = useState<number | null>(null);
  const [targetCalories, setTargetCalories] = useState<number>(2000);
  const [targetProtein, setTargetProtein] = useState<number>(120);
  const [targetCarbs, setTargetCarbs] = useState<number>(200);
  const [targetFat, setTargetFat] = useState<number>(60);

  const chartRef = useRef<HTMLDivElement>(null);

  // Load user data and targets
  useEffect(() => {
    const loadUserProfile = async () => {
      if (!session?.user?.id) return;

      try {
        const response = await fetch("/api/user/profile");
        if (response.ok) {
          const profile = await response.json();

          if (profile.targetWeight) setTargetWeight(profile.targetWeight);
          if (profile.targetCalories) setTargetCalories(profile.targetCalories);
          if (profile.targetProtein) setTargetProtein(profile.targetProtein);
          if (profile.targetCarbs) setTargetCarbs(profile.targetCarbs);
          if (profile.targetFat) setTargetFat(profile.targetFat);
        }
      } catch (error) {
        console.error("Error loading user profile:", error);
      }
    };

    loadUserProfile();
  }, [session?.user?.id]);

  // Watch for device orientation changes for fullscreen mode
  useEffect(() => {
    const handleOrientationChange = () => {
      // Check if device is in landscape mode
      if (window.matchMedia("(orientation: landscape)").matches) {
        setIsFullScreen(true);
        if (onFullScreenChange) onFullScreenChange(true);
      } else {
        setIsFullScreen(false);
        if (onFullScreenChange) onFullScreenChange(false);
      }
    };

    window.addEventListener("orientationchange", handleOrientationChange);

    // Also check on resize for desktop
    window.addEventListener("resize", () => {
      if (window.innerWidth > window.innerHeight && window.innerWidth < 1024) {
        setIsFullScreen(true);
        if (onFullScreenChange) onFullScreenChange(true);
      } else if (isFullScreen && window.innerWidth >= 1024) {
        setIsFullScreen(false);
        if (onFullScreenChange) onFullScreenChange(false);
      }
    });

    return () => {
      window.removeEventListener("orientationchange", handleOrientationChange);
      window.removeEventListener("resize", () => {});
    };
  }, [isFullScreen, onFullScreenChange]);

  // Function to toggle fullscreen mode
  const toggleFullScreen = () => {
    setIsFullScreen(!isFullScreen);
    if (onFullScreenChange) onFullScreenChange(!isFullScreen);

    // If entering fullscreen, scroll chart into view
    if (!isFullScreen && chartRef.current) {
      chartRef.current.scrollIntoView({ behavior: "smooth" });
    }
  };

  // Calculate date range based on selection
  const getDateRange = useCallback(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    let startDate: Date;

    switch (dateRange) {
      case "week":
        startDate = new Date(today);
        startDate.setDate(today.getDate() - 7);
        break;
      case "month":
        startDate = new Date(today);
        startDate.setMonth(today.getMonth() - 1);
        break;
      case "3months":
        startDate = new Date(today);
        startDate.setMonth(today.getMonth() - 3);
        break;
      case "year":
        startDate = new Date(today);
        startDate.setFullYear(today.getFullYear() - 1);
        break;
      default:
        startDate = new Date(today);
        startDate.setDate(today.getDate() - 7);
    }

    return { startDate, endDate: today };
  }, [dateRange]);

  // Load weight data
  const loadWeightData = useCallback(async () => {
    if (!session?.user?.id) {
      console.log("No user ID available for loadWeightData");
      return [];
    }

    try {
      const { startDate, endDate } = getDateRange();
      console.log(
        `Date range: ${startDate.toISOString()} to ${endDate.toISOString()}`
      );

      // Use a simple query that doesn't require an index
      const weightLogsRef = collection(db, "weightLogs");
      const simpleQuery = query(
        weightLogsRef,
        where("userId", "==", session.user.id)
      );

      console.log("Executing weight logs query...");
      const querySnapshot = await getDocs(simpleQuery);
      console.log(`Got ${querySnapshot.size} weight logs`);

      const weightLogs: WeightData[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        // Convert to Date object
        const logDate =
          data.date instanceof Timestamp
            ? data.date.toDate()
            : new Date(data.date);

        // Filter by date in memory
        if (logDate >= startDate && logDate <= endDate) {
          weightLogs.push({
            id: doc.id,
            ...data,
            date: logDate,
          } as WeightData);
        }
      });

      // Sort by date
      const sortedLogs = weightLogs.sort((a, b) => {
        const dateA =
          a.date instanceof Date
            ? a.date.getTime()
            : (a.date as Timestamp).toDate().getTime();
        const dateB =
          b.date instanceof Date
            ? b.date.getTime()
            : (b.date as Timestamp).toDate().getTime();
        return dateA - dateB;
      });

      console.log(`Returning ${sortedLogs.length} filtered weight logs`);
      return sortedLogs;
    } catch (error) {
      console.error("Error loading weight data:", error);
      // Don't throw the error, just return empty array and log the error
      return [];
    }
  }, [session?.user?.id, getDateRange]);

  // Load meal data
  // This is the part of UnifiedProgressChart.tsx that needs to be fixed (around line 271)
  // The key fix is to change the Firestore query to avoid requiring a complex index

  // loadMealData function in UnifiedProgressChart.tsx
  // This is a more comprehensive fix for the UnifiedProgressChart component
  // We'll create a complete replacement for the loadMealData function

  // Updated loadMealData function
  // Just focus on the specific lines in UnifiedProgressChart.tsx that are causing the error
  // Around line 271 where the error is occurring:

  // Look for where the meals data is being loaded:
  const loadMealData = useCallback(async () => {
    if (!session?.user?.id) {
      console.log("No user ID available for loadMealData");
      return [];
    }

    try {
      const { startDate, endDate } = getDateRange();

      // Use a simple query that doesn't require an index
      const mealsRef = collection(db, "meals");
      const simpleQuery = query(
        mealsRef,
        where("userId", "==", session.user.id)
      );

      console.log("Executing meals query...");
      const querySnapshot = await getDocs(simpleQuery);
      console.log(`Got ${querySnapshot.size} meals`);

      const meals: MealData[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        // Convert to Date object
        const mealDate =
          data.date instanceof Timestamp
            ? data.date.toDate()
            : new Date(data.date);

        // Filter by date in memory
        if (mealDate >= startDate && mealDate <= endDate) {
          meals.push({
            id: doc.id,
            ...data,
            date: mealDate,
          } as MealData);
        }
      });

      // Sort by date
      const sortedMeals = meals.sort((a, b) => {
        const dateA =
          a.date instanceof Date
            ? a.date.getTime()
            : (a.date as Timestamp).toDate().getTime();
        const dateB =
          b.date instanceof Date
            ? b.date.getTime()
            : (b.date as Timestamp).toDate().getTime();
        return dateA - dateB;
      });

      console.log(`Returning ${sortedMeals.length} filtered meals`);
      return sortedMeals;
    } catch (error) {
      console.error("Error loading meal data:", error);
      // Don't throw the error, just return empty array and log the error
      return [];
    }
  }, [session?.user?.id, getDateRange]);

  // And make sure other parts of the component handle empty data gracefully
  // Add this to the generateChartData function:

  // Aggregate data for chart display
  const generateChartData = useCallback(
    (weights: WeightData[] = [], meals: MealData[] = []) => {
      console.log(
        `Generating chart data from ${weights.length} weights and ${meals.length} meals`
      );

      // Even if we have no data, we should create dummy chart data for the date range
      const { startDate, endDate } = getDateRange();

      // Create a map for all dates in range
      const dateMap = new Map<string, ChartData>();

      // Generate all dates in the range
      const currentDate = new Date(startDate);
      while (currentDate <= endDate) {
        const dateKey = currentDate.toISOString().split("T")[0];
        dateMap.set(dateKey, {
          date: dateKey,
          calorieTarget: targetCalories,
          weightTarget: targetWeight || undefined,
          proteinTarget: targetProtein,
          carbsTarget: targetCarbs,
          fatTarget: targetFat,
        });
        currentDate.setDate(currentDate.getDate() + 1);
      }

      // Add weight data
      weights.forEach((entry) => {
        const dateKey =
          entry.date instanceof Date
            ? entry.date.toISOString().split("T")[0]
            : new Date((entry.date as Timestamp).toDate())
                .toISOString()
                .split("T")[0];

        const existingData = dateMap.get(dateKey) || { date: dateKey };
        dateMap.set(dateKey, {
          ...existingData,
          weight: entry.weight,
          weightTarget: targetWeight || undefined,
        });
      });

      // Aggregate meal data by date
      const mealsByDate = new Map<
        string,
        {
          calories: number;
          protein: number;
          carbs: number;
          fat: number;
          count: number;
        }
      >();

      meals.forEach((meal) => {
        const dateKey =
          meal.date instanceof Date
            ? meal.date.toISOString().split("T")[0]
            : new Date((meal.date as Timestamp).toDate())
                .toISOString()
                .split("T")[0];

        const existing = mealsByDate.get(dateKey) || {
          calories: 0,
          protein: 0,
          carbs: 0,
          fat: 0,
          count: 0,
        };

        mealsByDate.set(dateKey, {
          calories: existing.calories + (meal.calories || 0),
          protein: existing.protein + (meal.protein || 0),
          carbs: existing.carbs + (meal.carbs || 0),
          fat: existing.fat + (meal.fat || 0),
          count: existing.count + 1,
        });
      });

      // Merge meal data into the chart data
      mealsByDate.forEach((mealData, dateKey) => {
        const existingData = dateMap.get(dateKey) || { date: dateKey };
        dateMap.set(dateKey, {
          ...existingData,
          calories: mealData.calories,
          calorieTarget: targetCalories,
          protein: mealData.protein,
          proteinTarget: targetProtein,
          carbs: mealData.carbs,
          carbsTarget: targetCarbs,
          fat: mealData.fat,
          fatTarget: targetFat,
        });
      });

      // Convert map to array and sort by date
      const result = Array.from(dateMap.values()).sort((a, b) =>
        a.date.localeCompare(b.date)
      );

      console.log(`Generated ${result.length} chart data points`);
      return result;
    },
    [
      getDateRange,
      targetCalories,
      targetWeight,
      targetProtein,
      targetCarbs,
      targetFat,
    ]
  );

  // Load all data when parameters change
  useEffect(() => {
    const loadData = async () => {
      console.log("Loading chart data...");
      setIsLoading(true);
      setError(null);

      try {
        // Add timeout to ensure loading state is visible for debugging
        await new Promise((resolve) => setTimeout(resolve, 500));

        console.log("Fetching weight data...");
        const weights = await loadWeightData();
        console.log("Weight data received:", weights);

        console.log("Fetching meal data...");
        const meals = await loadMealData();
        console.log("Meal data received:", meals);

        console.log("Generating chart data...");
        const data = generateChartData(weights, meals);
        console.log("Chart data generated:", data);

        setChartData(data);
      } catch (error) {
        console.error("Error loading chart data:", error);
        setError("Failed to load chart data. Please try again.");
      } finally {
        console.log("Setting isLoading to false");
        setIsLoading(false);
      }
    };

    if (session?.user?.id) {
      loadData();
    }
  }, [
    session?.user?.id,
    dateRange,
    generateChartData,
    loadWeightData,
    loadMealData,
  ]);

  // Format dates for display
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
    }).format(date);
  };

  // Calculate chart data based on macro type
  const getChartProps = () => {
    switch (macroType) {
      case "calories":
        return {
          bars: [{ dataKey: "calories", name: "Calories", fill: "#3b82f6" }],
          lines: [
            {
              dataKey: "calorieTarget",
              name: "Target",
              stroke: "#9333ea",
              strokeWidth: 2,
            },
          ],
          leftLabel: "Calories",
        };
      case "weight":
        return {
          lines: [
            {
              dataKey: "weight",
              name: "Weight",
              stroke: "#10b981",
              strokeWidth: 2,
            },
            {
              dataKey: "weightTarget",
              name: "Target",
              stroke: "#f97316",
              strokeWidth: 2,
              strokeDasharray: "5 5",
            },
          ],
          leftLabel: "Weight (lbs)",
        };
      case "protein":
        return {
          bars: [{ dataKey: "protein", name: "Protein", fill: "#f59e0b" }],
          lines: [
            {
              dataKey: "proteinTarget",
              name: "Target",
              stroke: "#9333ea",
              strokeWidth: 2,
            },
          ],
          leftLabel: "Protein (g)",
        };
      case "carbs":
        return {
          bars: [{ dataKey: "carbs", name: "Carbs", fill: "#10b981" }],
          lines: [
            {
              dataKey: "carbsTarget",
              name: "Target",
              stroke: "#9333ea",
              strokeWidth: 2,
            },
          ],
          leftLabel: "Carbs (g)",
        };
      case "fat":
        return {
          bars: [{ dataKey: "fat", name: "Fat", fill: "#ef4444" }],
          lines: [
            {
              dataKey: "fatTarget",
              name: "Target",
              stroke: "#9333ea",
              strokeWidth: 2,
            },
          ],
          leftLabel: "Fat (g)",
        };
      default:
        return {
          bars: [{ dataKey: "calories", name: "Calories", fill: "#3b82f6" }],
          lines: [
            {
              dataKey: "calorieTarget",
              name: "Target",
              stroke: "#9333ea",
              strokeWidth: 2,
            },
          ],
          leftLabel: "Calories",
        };
    }
  };

  const chartProps = getChartProps();

  // Render loading state
  if (isLoading) {
    return (
      <Card
        className={isFullScreen ? "fixed inset-0 z-50 m-0 rounded-none" : ""}
      >
        <CardHeader>
          <CardTitle className="flex justify-between">
            <span>Progress Chart</span>
            <Skeleton className="h-6 w-28" />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    // Add this to the UnifiedProgressChart component
    // This ensures the chart displays properly even when data is missing

    // Update the render part of the component to handle errors gracefully

    <Card
      className={`${isFullScreen ? "fixed inset-0 z-50 m-0 rounded-none" : ""}`}
      ref={chartRef}
    >
      <CardHeader className="pb-2">
        <CardTitle className="flex justify-between items-center">
          <span>Progress Chart</span>
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleFullScreen}
            className="ml-auto"
            title={isFullScreen ? "Exit Full Screen" : "Full Screen"}
          >
            {isFullScreen ? (
              <Minimize2 className="h-5 w-5" />
            ) : (
              <Expand className="h-5 w-5" />
            )}
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Error Display */}
        {error && (
          <div className="bg-red-100 dark:bg-red-900/30 p-3 rounded-md text-red-800 dark:text-red-200 mb-4">
            {error}
            <Button
              variant="outline"
              size="sm"
              className="ml-2"
              onClick={() => {
                setError(null);
                loadWeightData();
                loadMealData();
              }}
            >
              Retry
            </Button>
          </div>
        )}

        {/* Controls */}
        <div className="flex flex-wrap gap-2 mb-4">
          <div>
            <Tabs
              value={dateRange}
              onValueChange={setDateRange}
              className="mb-1"
            >
              <TabsList>
                <TabsTrigger value="week">Week</TabsTrigger>
                <TabsTrigger value="month">Month</TabsTrigger>
                <TabsTrigger value="3months">3 Months</TabsTrigger>
                <TabsTrigger value="year">Year</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <div className="ml-auto">
            <Select value={macroType} onValueChange={setMacroType}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Data Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="calories">Calories</SelectItem>
                <SelectItem value="weight">Weight</SelectItem>
                <SelectItem value="protein">Protein</SelectItem>
                <SelectItem value="carbs">Carbs</SelectItem>
                <SelectItem value="fat">Fat</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Chart display with fallback for no data */}
        {chartData.length === 0 ? (
          <div className="h-64 flex items-center justify-center bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="text-center p-6">
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                No data available for the selected time period
              </p>
              <Button
                variant="outline"
                onClick={() => {
                  setIsLoading(true);
                  loadWeightData()
                    .then(() => loadMealData())
                    .finally(() => setIsLoading(false));
                }}
                className="mx-auto"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh Data
              </Button>
            </div>
          </div>
        ) : (
          <div className={`h-64 ${isFullScreen ? "md:h-96" : ""}`}>
            <ResponsiveContainer width="100%" height="100%">
              {/* Chart component here */}
              <ComposedChart
                data={chartData}
                margin={{ top: 5, right: 30, left: 20, bottom: 15 }}
              >
                {/* Chart components... */}
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default UnifiedProgressChart;

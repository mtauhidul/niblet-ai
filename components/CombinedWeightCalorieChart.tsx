import { Expand, Minimize2 } from "lucide-react";
import { useSession } from "next-auth/react";
import React, { useEffect, useState } from "react";
import {
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";

interface ChartDataPoint {
  date: string;
  weight?: number;
  weightGoal?: number;
  calories?: number;
  caloriesTarget?: number;
  protein?: number;
  proteinTarget?: number;
  carbs?: number;
  carbsTarget?: number;
  fat?: number;
  fatTarget?: number;
}

interface TargetValues {
  weight?: number | null;
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
}

interface EnhancedCombinedChartProps {
  dateRange?: "week" | "month" | "3months" | "year";
  className?: string;
  showWeightOnly?: boolean;
  showCaloriesOnly?: boolean;
  height?: number | string;
}

const EnhancedCombinedWeightCalorieChart: React.FC<
  EnhancedCombinedChartProps
> = ({
  dateRange = "month",
  className = "",
  showWeightOnly = false,
  showCaloriesOnly = false,
  height = 400,
}) => {
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [targets, setTargets] = useState<TargetValues>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const { data: session } = useSession();

  // Detect device orientation change
  useEffect(() => {
    const handleOrientationChange = () => {
      // Check if device is in landscape mode
      if (window.matchMedia) {
        const isLandscape = window.matchMedia(
          "(orientation: landscape)"
        ).matches;
        setIsFullScreen(isLandscape);
      }
    };

    // Initial check
    handleOrientationChange();

    // Add event listeners
    window.addEventListener("orientationchange", handleOrientationChange);
    if (window.matchMedia) {
      window
        .matchMedia("(orientation: landscape)")
        .addEventListener("change", handleOrientationChange);
    }

    return () => {
      window.removeEventListener("orientationchange", handleOrientationChange);
      if (window.matchMedia) {
        window
          .matchMedia("(orientation: landscape)")
          .removeEventListener("change", handleOrientationChange);
      }
    };
  }, []);

  // When entering fullscreen, set body overflow to hidden
  useEffect(() => {
    if (isFullScreen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
    };
  }, [isFullScreen]);

  // Toggle fullscreen mode manually
  const toggleFullScreen = () => {
    setIsFullScreen(!isFullScreen);
  };

  // Format date for display
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
    }).format(date);
  };

  // Load chart data
  useEffect(() => {
    const fetchChartData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        console.log(`Fetching chart data for range: ${dateRange}`);
        const response = await fetch(`/api/chart-data?range=${dateRange}`);

        if (!response.ok) {
          throw new Error(`Failed to fetch chart data: ${response.statusText}`);
        }

        const data = await response.json();
        console.log(`Received ${data.chartData?.length || 0} data points`);

        if (data.chartData && Array.isArray(data.chartData)) {
          setChartData(data.chartData);
          setTargets(data.targets || {});
        } else {
          // If no data, use fallback to show at least something
          setChartData(generateFallbackData());
        }
      } catch (err) {
        console.error("Error loading chart data:", err);
        setError(
          err instanceof Error ? err.message : "Failed to load chart data"
        );
        // Use fallback data on error
        setChartData(generateFallbackData());
      } finally {
        setIsLoading(false);
      }
    };

    // Only fetch if authenticated
    if (session?.user?.id) {
      fetchChartData();
    } else {
      // Show demo data if not authenticated
      setChartData(generateFallbackData());
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateRange, session?.user?.id]);

  // Generate fallback data to display a chart even when no real data exists
  const generateFallbackData = (): ChartDataPoint[] => {
    const data: ChartDataPoint[] = [];
    const today = new Date();
    const startDate = new Date();

    // Set the start date based on the selected range
    if (dateRange === "week") {
      startDate.setDate(today.getDate() - 7);
    } else if (dateRange === "month") {
      startDate.setDate(today.getDate() - 30);
    } else if (dateRange === "3months") {
      startDate.setMonth(today.getMonth() - 3);
    } else {
      startDate.setFullYear(today.getFullYear() - 1);
    }

    // Initial weight and target (example values)
    const startWeight = 212;
    const targetWeight = 190;
    const caloriesTarget = 2000;

    // Calculate daily weight change to reach target
    const daysDiff = Math.floor(
      (today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    const dailyWeightChange = (startWeight - targetWeight) / daysDiff;

    // Generate data for each day
    for (let i = 0; i <= daysDiff; i++) {
      const currentDate = new Date(startDate);
      currentDate.setDate(startDate.getDate() + i);

      // Add some random fluctuation for more realistic data
      const weightNoise = Math.random() * 1.5 - 0.75; // -0.75 to 0.75
      const caloriesNoise = Math.floor(Math.random() * 600) - 300; // -300 to 300

      // Calculate the ideal weight for this day based on the goal
      const idealWeight = startWeight - dailyWeightChange * i;

      // Actual weight with some random fluctuation
      const actualWeight =
        startWeight - dailyWeightChange * i * 0.9 + weightNoise;

      // Calories for the day (randomly over or under target)
      const calories = caloriesTarget + caloriesNoise;

      data.push({
        date: currentDate.toISOString().split("T")[0],
        weight: Number(actualWeight.toFixed(1)),
        weightGoal: Number(idealWeight.toFixed(1)),
        calories: calories > 0 ? calories : 0,
        caloriesTarget,
        protein: Math.round((calories * 0.3) / 4), // 30% of calories from protein
        proteinTarget: Math.round((caloriesTarget * 0.3) / 4),
        carbs: Math.round((calories * 0.5) / 4), // 50% of calories from carbs
        carbsTarget: Math.round((caloriesTarget * 0.5) / 4),
        fat: Math.round((calories * 0.2) / 9), // 20% of calories from fat
        fatTarget: Math.round((caloriesTarget * 0.2) / 9),
      });
    }

    return data;
  };

  // Customize tooltip for the chart
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg">
          <p className="font-medium mb-1">{formatDate(label)}</p>

          {payload.some(
            (entry: any) =>
              entry.dataKey === "weight" || entry.dataKey === "weightGoal"
          ) &&
            !showCaloriesOnly && (
              <div className="border-b dark:border-gray-700 mb-2 pb-2">
                <p className="text-sm font-medium">Weight</p>
                {payload.map((entry: any, index: number) => {
                  if (entry.dataKey === "weight") {
                    return (
                      <p
                        key={index}
                        className="text-sm"
                        style={{ color: entry.color }}
                      >
                        Current: {entry.value} lbs
                      </p>
                    );
                  } else if (entry.dataKey === "weightGoal") {
                    return (
                      <p
                        key={index}
                        className="text-sm"
                        style={{ color: entry.color }}
                      >
                        Goal: {entry.value} lbs
                      </p>
                    );
                  }
                  return null;
                })}
              </div>
            )}

          {payload.some(
            (entry: any) =>
              entry.dataKey === "calories" || entry.dataKey === "caloriesTarget"
          ) &&
            !showWeightOnly && (
              <div>
                <p className="text-sm font-medium">Calories</p>
                {payload.map((entry: any, index: number) => {
                  if (entry.dataKey === "calories") {
                    return (
                      <p
                        key={index}
                        className="text-sm"
                        style={{ color: entry.color }}
                      >
                        Consumed: {entry.value}
                      </p>
                    );
                  } else if (entry.dataKey === "caloriesTarget") {
                    return (
                      <p
                        key={index}
                        className="text-sm"
                        style={{ color: entry.color }}
                      >
                        Target: {entry.value}
                      </p>
                    );
                  }
                  return null;
                })}
              </div>
            )}
        </div>
      );
    }
    return null;
  };

  // Get bar color based on calorie target
  const getCalorieBarColor = (entry: ChartDataPoint) => {
    if (!entry.calories || !entry.caloriesTarget) return "#10b981"; // Default green
    return entry.calories > entry.caloriesTarget ? "#ef4444" : "#10b981"; // Red if over target, green if under
  };

  // Handle loading state
  if (isLoading) {
    return (
      <div
        className={`h-64 w-full bg-gray-100 dark:bg-gray-800 animate-pulse rounded-lg ${className}`}
      ></div>
    );
  }

  // If there's an error, show it
  if (error) {
    return (
      <div
        className={`h-64 w-full flex items-center justify-center ${className}`}
      >
        <div className="text-center p-6">
          <p className="text-red-500 mb-2">Error loading chart data</p>
          <p className="text-sm text-gray-500">{error}</p>
        </div>
      </div>
    );
  }

  // If there's no data, show a message
  if (!chartData || chartData.length === 0) {
    return (
      <div
        className={`h-64 w-full flex items-center justify-center bg-gray-50 dark:bg-gray-800 rounded-lg ${className}`}
      >
        <div className="text-center p-6">
          <p className="text-gray-500 dark:text-gray-400 mb-2">
            No data available for this time period
          </p>
          <p className="text-sm text-gray-400 dark:text-gray-500">
            Start logging meals and weight to see your progress
          </p>
        </div>
      </div>
    );
  }

  // Get target values from data
  const weightTarget = targets.weight || undefined;
  const calorieTarget = chartData[0]?.caloriesTarget || 2000;

  // Wrapper for the chart content
  const ChartWrapper = isFullScreen
    ? ({ children }: { children: React.ReactNode }) => (
        <div className="fixed inset-0 z-50 bg-white dark:bg-gray-900 p-4 flex flex-col">
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-bold">Weight and Calories Progress</h3>
            <Button
              variant="outline"
              size="sm"
              onClick={toggleFullScreen}
              className="self-end"
            >
              <Minimize2 className="h-4 w-4 mr-2" />
              Exit Fullscreen
            </Button>
          </div>
          <div className="flex-1">{children}</div>
        </div>
      )
    : ({ children }: { children: React.ReactNode }) => (
        <Card className={className}>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-base">Progress Chart</CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={toggleFullScreen}
              className="h-8 px-2 text-xs"
            >
              <Expand className="h-3.5 w-3.5 mr-1" />
              Fullscreen
            </Button>
          </CardHeader>
          <CardContent
            className="h-full" // Use a static class
            style={{
              height: typeof height === "number" ? `${height}px` : height,
            }}
          >
            {children}
          </CardContent>
        </Card>
      );

  return (
    <ChartWrapper>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
          data={chartData}
          margin={{ top: 10, right: 30, left: 5, bottom: 20 }}
        >
          <CartesianGrid strokeDasharray="3 3" opacity={0.4} />
          <XAxis dataKey="date" tickFormatter={formatDate} minTickGap={30} />

          {/* Weight Y-Axis - only show if not in calories-only mode */}
          {!showCaloriesOnly && (
            <YAxis
              yAxisId="weight"
              orientation="left"
              domain={["auto", "auto"]}
              label={{
                value: "Weight (lbs)",
                angle: -90,
                position: "insideLeft",
                style: { textAnchor: "middle" },
                fill: "#1d4ed8",
                fontSize: 12,
              }}
              tick={{ fill: "#1d4ed8" }}
            />
          )}

          {/* Calories Y-Axis - only show if not in weight-only mode */}
          {!showWeightOnly && (
            <YAxis
              yAxisId="calories"
              orientation="right"
              domain={[0, "dataMax + 500"]}
              label={{
                value: "Calories",
                angle: 90,
                position: "insideRight",
                style: { textAnchor: "middle" },
                fill: "#10b981",
                fontSize: 12,
              }}
              tick={{ fill: "#10b981" }}
            />
          )}

          {/* Add tooltip and legend */}
          <Tooltip content={<CustomTooltip />} />
          <Legend />

          {/* Weight Data - only if not in calories-only mode */}
          {!showCaloriesOnly &&
            chartData.some((d) => d.weight !== undefined) && (
              <Line
                type="monotone"
                dataKey="weight"
                name="Current Weight"
                yAxisId="weight"
                stroke="#3b82f6"
                strokeWidth={3}
                dot={{ r: 3, fill: "#2563eb" }}
                activeDot={{ r: 5 }}
                connectNulls={true}
              />
            )}

          {/* Weight Goal - only if not in calories-only mode */}
          {!showCaloriesOnly &&
            chartData.some((d) => d.weightGoal !== undefined) && (
              <Line
                type="monotone"
                dataKey="weightGoal"
                name="Target Weight"
                yAxisId="weight"
                stroke="#93c5fd"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={false}
                connectNulls={true}
              />
            )}

          {/* Calorie Bars - only if not in weight-only mode */}
          {!showWeightOnly && (
            <Bar
              dataKey="calories"
              name="Daily Calories"
              yAxisId="calories"
              barSize={8}
              radius={[2, 2, 0, 0]}
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={getCalorieBarColor(entry)} />
              ))}
            </Bar>
          )}

          {/* Calorie Target Reference Line - only if not in weight-only mode */}
          {!showWeightOnly && (
            <ReferenceLine
              y={calorieTarget}
              yAxisId="calories"
              stroke="#ef4444"
              strokeDasharray="5 5"
              label={{
                value: "Calorie Target",
                position: "right",
                fill: "#ef4444",
                fontSize: 10,
              }}
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </ChartWrapper>
  );
};

export default EnhancedCombinedWeightCalorieChart;

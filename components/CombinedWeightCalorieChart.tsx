// components/CombinedWeightCalorieChart.tsx
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
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

const CombinedWeightCalorieChart = ({ dateRange = "month" }) => {
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [targets, setTargets] = useState<TargetValues>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { data: session } = useSession();

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

      // Add some random fluctuation
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
      });
    }

    return data;
  };

  // Format date for display
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
    }).format(date);
  };

  // Customize tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="p-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded shadow-lg">
          <p className="font-medium">{formatDate(label)}</p>
          {payload.map((entry: any, index: number) => {
            if (entry.name === "Weight") {
              return (
                <p key={index} style={{ color: entry.color }}>
                  Weight: {entry.value} lbs
                </p>
              );
            } else if (entry.name === "Weight Goal") {
              return (
                <p key={index} style={{ color: entry.color }}>
                  Goal: {entry.value} lbs
                </p>
              );
            } else if (entry.name === "Daily Calories") {
              return (
                <p key={index} style={{ color: entry.color }}>
                  Calories: {entry.value}
                </p>
              );
            } else if (entry.name === "Calorie Target") {
              return (
                <p key={index} style={{ color: entry.color }}>
                  Target: {entry.value} cal
                </p>
              );
            }
            return null;
          })}
        </div>
      );
    }
    return null;
  };

  // Determine color for calorie bars
  const getBarColor = (entry: ChartDataPoint) => {
    if (!entry.calories || !entry.caloriesTarget) return "#10b981"; // Default green
    return entry.calories > entry.caloriesTarget ? "#ef4444" : "#10b981"; // Red if over target, green if under
  };

  if (isLoading) {
    return (
      <div className="h-64 w-full bg-gray-100 dark:bg-gray-800 animate-pulse rounded-lg"></div>
    );
  }

  // If there's an error, show it
  if (error) {
    return (
      <div className="h-64 w-full flex items-center justify-center">
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
      <div className="h-64 w-full flex items-center justify-center bg-gray-50 dark:bg-gray-800 rounded-lg">
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
  const calorieTarget = chartData[0]?.caloriesTarget || 2000;

  return (
    <div className="h-64 md:h-96 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
          data={chartData}
          margin={{ top: 5, right: 30, left: 20, bottom: 15 }}
        >
          <CartesianGrid strokeDasharray="3 3" opacity={0.4} />
          <XAxis dataKey="date" tickFormatter={formatDate} minTickGap={30} />
          <YAxis
            yAxisId="left"
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
          <YAxis
            yAxisId="right"
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
          <Tooltip content={<CustomTooltip />} />
          <Legend />

          {/* Calorie bars */}
          <Bar
            dataKey="calories"
            name="Daily Calories"
            yAxisId="right"
            fill="#10b981"
            strokeWidth={0}
            opacity={0.7}
            barSize={8}
            radius={[2, 2, 0, 0]}
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={getBarColor(entry)} />
            ))}
          </Bar>

          {/* Calorie target reference line */}
          <ReferenceLine
            y={calorieTarget}
            yAxisId="right"
            stroke="#ef4444"
            strokeDasharray="5 5"
            label={{
              value: "Target",
              position: "right",
              fill: "#ef4444",
              fontSize: 10,
            }}
          />

          {/* Weight line */}
          {chartData.some((d) => d.weight !== undefined) && (
            <Line
              type="monotone"
              dataKey="weight"
              name="Weight"
              yAxisId="left"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={{ r: 2, fill: "#2563eb" }}
              activeDot={{ r: 4 }}
              connectNulls={true}
            />
          )}

          {/* Weight goal line */}
          {chartData.some((d) => d.weightGoal !== undefined) && (
            <Line
              type="monotone"
              dataKey="weightGoal"
              name="Weight Goal"
              yAxisId="left"
              stroke="#93c5fd"
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={false}
              connectNulls={true}
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};

export default CombinedWeightCalorieChart;

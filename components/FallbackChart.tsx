"use client";

import { useEffect, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const FallbackChart = () => {
  const [demoData, setDemoData] = useState<
    { date: string; calories: number; calorieTarget: number }[]
  >([]);

  useEffect(() => {
    // Generate some demo data if no real data is available
    const generateDemoData = () => {
      const today = new Date();
      const data = [];

      // Create 7 days of data
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(today.getDate() - i);

        data.push({
          date: date.toISOString().split("T")[0],
          calories: Math.floor(Math.random() * 500) + 1500,
          calorieTarget: 2000,
        });
      }

      setDemoData(data);
    };

    generateDemoData();
  }, []);

  // Format date for display
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  if (demoData.length === 0) {
    return (
      <div className="h-64 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center">
        Loading chart...
      </div>
    );
  }

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={demoData}
          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" tickFormatter={formatDate} />
          <YAxis />
          <Tooltip
            formatter={(value) => [`${value} cal`, "Calories"]}
            labelFormatter={(label) => formatDate(label)}
          />
          <Line
            type="monotone"
            dataKey="calories"
            stroke="#3b82f6"
            strokeWidth={2}
            activeDot={{ r: 8 }}
          />
          <Line
            type="monotone"
            dataKey="calorieTarget"
            stroke="#9333ea"
            strokeWidth={2}
            strokeDasharray="5 5"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default FallbackChart;

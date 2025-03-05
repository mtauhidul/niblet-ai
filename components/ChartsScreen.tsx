"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const ChartsScreen = () => {
  const [activeFilter, setActiveFilter] = useState("all");

  // Mock data - in a real implementation this would come from an API
  const weightData = [
    { date: "Jan 1", weight: 185 },
    { date: "Jan 8", weight: 183 },
    { date: "Jan 15", weight: 181 },
    { date: "Jan 22", weight: 180 },
    { date: "Jan 29", weight: 178 },
    { date: "Feb 5", weight: 177 },
    { date: "Feb 12", weight: 176 },
  ];

  const calorieData = [
    {
      date: "Mon",
      calories: 1800,
      target: 1800,
      protein: 120,
      carbs: 180,
      fats: 60,
    },
    {
      date: "Tue",
      calories: 1600,
      target: 1800,
      protein: 130,
      carbs: 150,
      fats: 55,
    },
    {
      date: "Wed",
      calories: 2000,
      target: 1800,
      protein: 110,
      carbs: 200,
      fats: 70,
    },
    {
      date: "Thu",
      calories: 1750,
      target: 1800,
      protein: 125,
      carbs: 170,
      fats: 65,
    },
    {
      date: "Fri",
      calories: 1900,
      target: 1800,
      protein: 135,
      carbs: 175,
      fats: 68,
    },
    {
      date: "Sat",
      calories: 2100,
      target: 1800,
      protein: 115,
      carbs: 210,
      fats: 75,
    },
    {
      date: "Sun",
      calories: 1700,
      target: 1800,
      protein: 128,
      carbs: 165,
      fats: 58,
    },
  ];

  // Calculate data based on active filter
  const getFilteredData = () => {
    if (activeFilter === "all") {
      return calorieData.map((day) => ({
        date: day.date,
        calories: day.calories,
        target: day.target,
      }));
    } else if (activeFilter === "protein") {
      return calorieData.map((day) => ({
        date: day.date,
        protein: day.protein,
        target: day.protein * 1.1, // Target is 10% higher than actual for demo
      }));
    } else if (activeFilter === "carbs") {
      return calorieData.map((day) => ({
        date: day.date,
        carbs: day.carbs,
        target: day.carbs * 0.9, // Target is 10% lower than actual for demo
      }));
    } else if (activeFilter === "fats") {
      return calorieData.map((day) => ({
        date: day.date,
        fats: day.fats,
        target: day.fats * 0.95, // Target is 5% lower than actual for demo
      }));
    }
  };

  // Color utility function - green if under target, red if over (for calories)
  const getCalorieColor = (value: number, target: number) => {
    return value <= target ? "#10b981" : "#ef4444";
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="p-4 border-b dark:border-gray-800 flex justify-between items-center">
        <button className="p-2">
          <div className="w-6 h-0.5 bg-gray-800 dark:bg-gray-200 mb-1"></div>
          <div className="w-6 h-0.5 bg-gray-800 dark:bg-gray-200 mb-1"></div>
          <div className="w-6 h-0.5 bg-gray-800 dark:bg-gray-200"></div>
        </button>
        <div className="text-2xl font-bold">
          niblet<span className="text-blue-400">.ai</span>
        </div>
        <div className="w-6"></div> {/* Placeholder for right side of header */}
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Weight Progress Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Weight Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={weightData}
                  margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis domain={["auto", "auto"]} />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="weight"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Calorie Intake Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Daily Nutrition</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="all" className="mb-4">
              <TabsList className="grid grid-cols-4">
                <TabsTrigger value="all" onClick={() => setActiveFilter("all")}>
                  All
                </TabsTrigger>
                <TabsTrigger
                  value="protein"
                  onClick={() => setActiveFilter("protein")}
                >
                  Protein
                </TabsTrigger>
                <TabsTrigger
                  value="carbs"
                  onClick={() => setActiveFilter("carbs")}
                >
                  Carbs
                </TabsTrigger>
                <TabsTrigger
                  value="fats"
                  onClick={() => setActiveFilter("fats")}
                >
                  Fats
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={getFilteredData()}
                  margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  {activeFilter === "all" && (
                    <>
                      <Bar
                        dataKey="calories"
                        name="Calories"
                        fill={getCalorieColor(
                          calorieData[0].calories,
                          calorieData[0].target
                        )}
                      />
                      <Line
                        type="monotone"
                        dataKey="target"
                        name="Target"
                        stroke="#9333ea"
                        strokeWidth={2}
                        dot={false}
                      />
                    </>
                  )}
                  {activeFilter === "protein" && (
                    <>
                      <Bar
                        dataKey="protein"
                        name="Protein (g)"
                        fill="#3b82f6"
                      />
                      <Line
                        type="monotone"
                        dataKey="target"
                        name="Target"
                        stroke="#9333ea"
                        strokeWidth={2}
                        dot={false}
                      />
                    </>
                  )}
                  {activeFilter === "carbs" && (
                    <>
                      <Bar dataKey="carbs" name="Carbs (g)" fill="#10b981" />
                      <Line
                        type="monotone"
                        dataKey="target"
                        name="Target"
                        stroke="#9333ea"
                        strokeWidth={2}
                        dot={false}
                      />
                    </>
                  )}
                  {activeFilter === "fats" && (
                    <>
                      <Bar dataKey="fats" name="Fats (g)" fill="#f59e0b" />
                      <Line
                        type="monotone"
                        dataKey="target"
                        name="Target"
                        stroke="#9333ea"
                        strokeWidth={2}
                        dot={false}
                      />
                    </>
                  )}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Additional stats card */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Weekly Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="border rounded-lg p-3 text-center">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Avg. Daily Calories
                </p>
                <p className="text-2xl font-bold">1,836</p>
              </div>
              <div className="border rounded-lg p-3 text-center">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Weight Change
                </p>
                <p className="text-2xl font-bold text-green-500">-1.2 lbs</p>
              </div>
              <div className="border rounded-lg p-3 text-center">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Protein Goal
                </p>
                <p className="text-2xl font-bold text-blue-500">92%</p>
              </div>
              <div className="border rounded-lg p-3 text-center">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Water Intake
                </p>
                <p className="text-2xl font-bold text-blue-400">76%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Footer with indicator that user can swipe left to return to Dashboard */}
      <div className="p-4 border-t dark:border-gray-800 text-center text-sm text-gray-500">
        Swipe right to return to Dashboard
      </div>
    </div>
  );
};

export default ChartsScreen;

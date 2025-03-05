"use client";

import { Card, CardContent } from "@/components/ui/card";
import { useState } from "react";
import ChatContainer from "./ChatContainer";

const Dashboard = ({ aiPersonality = "best-friend" }) => {
  // Sample meal data - would come from API in real implementation
  const [caloriesConsumed, setCaloriesConsumed] = useState(386);
  const [caloriesRemaining, setCaloriesRemaining] = useState(1414);
  const [todaysMeals, setTodaysMeals] = useState([
    {
      type: "Breakfast",
      items: 2,
      calories: 460,
    },
  ]);

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

      {/* Calories Card */}
      <Card className="mx-4 mt-4">
        <CardContent className="p-0 flex">
          <div className="w-1/2 p-4 bg-green-200 dark:bg-green-900">
            <div className="text-3xl font-bold text-center">
              {caloriesConsumed}
            </div>
            <div className="text-sm text-center">calories today</div>
          </div>
          <div className="w-1/2 p-4">
            <div className="text-3xl font-bold text-center">
              {caloriesRemaining}
            </div>
            <div className="text-sm text-center">calories remaining</div>
          </div>
        </CardContent>
      </Card>

      {/* Chat Area - Using the ChatContainer component */}
      <div className="flex-1 overflow-hidden">
        <ChatContainer aiPersonality={aiPersonality} />
      </div>

      {/* Today's Meals */}
      <div className="p-4 border-t dark:border-gray-800">
        <h3 className="font-bold mb-2">Today's Meals</h3>
        {todaysMeals.map((meal, index) => (
          <div key={index} className="mb-2">
            <div className="font-medium">{meal.type}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {meal.items} items - {meal.calories} calories
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Dashboard;

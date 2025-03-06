// components/CaloriesStatusBar.tsx
"use client";

import { Card, CardContent } from "@/components/ui/card";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";

interface CaloriesStatusBarProps {
  caloriesConsumed: number;
  targetCalories: number;
  className?: string;
}

const CaloriesStatusBar: React.FC<CaloriesStatusBarProps> = ({
  caloriesConsumed,
  targetCalories,
  className = "",
}) => {
  const [prevCalories, setPrevCalories] = useState(caloriesConsumed);
  const [isIncreasing, setIsIncreasing] = useState(false);
  const caloriesRemaining = Math.max(0, targetCalories - caloriesConsumed);

  // Calculate percentage for progress bar width
  const percentage = Math.min(100, (caloriesConsumed / targetCalories) * 100);

  // Determine background color based on percentage
  const getBackgroundColor = () => {
    if (percentage < 75) return "bg-green-200 dark:bg-green-900"; // Under 75% - green
    if (percentage < 100) return "bg-yellow-200 dark:bg-yellow-900"; // Between 75-100% - yellow
    return "bg-red-200 dark:bg-red-900"; // Over 100% - red
  };

  // Handle animations when calories change
  useEffect(() => {
    if (caloriesConsumed !== prevCalories) {
      setIsIncreasing(caloriesConsumed > prevCalories);
      setPrevCalories(caloriesConsumed);
    }
  }, [caloriesConsumed, prevCalories]);

  return (
    <Card className={`overflow-hidden ${className} `}>
      <div className="relative p-2">
        {" "}
        {/* Added padding */}
        {/* Background progress bar with rounded corners */}
        <motion.div
          className={`absolute rounded-xl ${getBackgroundColor()}`}
          style={{
            left: "7px",
            right: "7px", // Consistent spacing
            top: "0", // Removes extra top space
            bottom: "0", // Removes extra bottom space
            width: `calc(${percentage}% - 16px)`, // Keeps width proper
          }}
          initial={{
            width: `calc(${(prevCalories / targetCalories) * 100}% - 16px)`,
          }}
          animate={{
            width: `calc(${percentage}% - 16px)`,
          }}
          transition={{ type: "spring", stiffness: 120, damping: 20 }}
        />
        {/* Content */}
        <CardContent className="p-0 flex relative z-10 ">
          <div className="w-1/2 p-4">
            <AnimatePresence mode="wait">
              <motion.div
                key={caloriesConsumed}
                initial={{ y: isIncreasing ? 20 : -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: isIncreasing ? -20 : 20, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="flex flex-col items-center"
              >
                <div className="text-3xl font-bold text-center">
                  {caloriesConsumed}
                </div>
                <div className="text-sm text-center">calories today</div>
              </motion.div>
            </AnimatePresence>
          </div>
          <div className="w-1/2 p-4">
            <AnimatePresence mode="wait">
              <motion.div
                key={caloriesRemaining}
                initial={{ y: !isIncreasing ? 20 : -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: !isIncreasing ? -20 : 20, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="flex flex-col items-center"
              >
                <div className="text-3xl font-bold text-center">
                  {caloriesRemaining}
                </div>
                <div className="text-sm text-center">calories remaining</div>
              </motion.div>
            </AnimatePresence>
          </div>
        </CardContent>
      </div>
    </Card>
  );
};

export default CaloriesStatusBar;

// components/CaloriesStatusBar.tsx - Ultra-thin version with reduced surrounding padding
"use client";

import { Card } from "@/components/ui/card";
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
    <Card
      className={`overflow-hidden ${className} h-12 p-0 m-0 mb-2 shadow-sm`}
    >
      <div className="relative h-full">
        {/* Background progress bar with rounded corners */}
        <motion.div
          className={`absolute rounded-sm ${getBackgroundColor()}`}
          style={{
            left: "0px",
            right: "0px",
            top: "0",
            bottom: "0",
            width: `calc(${percentage}% - 4px)`, // Minimal spacing
          }}
          initial={{
            width: `calc(${(prevCalories / targetCalories) * 100}% - 4px)`,
          }}
          animate={{
            width: `calc(${percentage}% - 4px)`,
          }}
          transition={{ type: "spring", stiffness: 120, damping: 20 }}
        />
        {/* Content */}
        <div className="flex h-full relative z-10">
          <div className="w-1/2 flex items-center justify-center">
            <AnimatePresence mode="wait">
              <motion.div
                key={caloriesConsumed}
                initial={{ y: isIncreasing ? 8 : -8, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: isIncreasing ? -8 : 8, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="flex items-center"
              >
                <div className="text-base font-bold mr-1">
                  {caloriesConsumed}
                </div>
                <div className="text-xs">calories today</div>
              </motion.div>
            </AnimatePresence>
          </div>
          <div className="w-1/2 flex items-center justify-center">
            <AnimatePresence mode="wait">
              <motion.div
                key={caloriesRemaining}
                initial={{ y: !isIncreasing ? 8 : -8, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: !isIncreasing ? -8 : 8, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="flex items-center"
              >
                <div className="text-base font-bold mr-1">
                  {caloriesRemaining}
                </div>
                <div className="text-xs">calories remaining</div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default CaloriesStatusBar;

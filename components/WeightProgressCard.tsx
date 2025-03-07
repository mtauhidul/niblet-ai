// components/WeightProgressCard.tsx
import { Progress } from "@/components/ui/progress";
import { ArrowDownIcon, CalendarIcon, TrendingDownIcon } from "lucide-react";
import { useEffect, useState } from "react";

interface WeightProgressCardProps {
  currentWeight: number;
  targetWeight: number;
  startWeight?: number;
  weightLogs?: { weight: number; date: string }[];
}

const WeightProgressCard: React.FC<WeightProgressCardProps> = ({
  currentWeight,
  targetWeight,
  startWeight,
  weightLogs = [],
}) => {
  const [progress, setProgress] = useState(0);
  const [projectedDate, setProjectedDate] = useState<Date | null>(null);
  const [weightLossRate, setWeightLossRate] = useState<number | null>(null);
  const [totalLost, setTotalLost] = useState(0);
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    // Calculate the weight loss progress
    const calculateProgress = () => {
      // If startWeight is not provided, try to get it from weight logs
      const actualStartWeight =
        startWeight ||
        (weightLogs.length > 0
          ? Math.max(...weightLogs.map((log) => log.weight))
          : currentWeight);

      if (currentWeight === targetWeight) return 100;
      if (actualStartWeight === targetWeight) return 0;

      const totalToLose = actualStartWeight - targetWeight;
      const amountLost = actualStartWeight - currentWeight;

      setTotalLost(amountLost);
      setRemaining(currentWeight - targetWeight);

      // Calculate percentage of goal achieved
      return Math.min(Math.round((amountLost / totalToLose) * 100), 100);
    };

    // Calculate projected completion date
    const calculateProjection = () => {
      if (weightLogs.length < 2) return;

      // Sort logs by date
      const sortedLogs = [...weightLogs].sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
      );

      // Need at least two points to calculate a trend
      if (sortedLogs.length < 2) return;

      // Get the oldest and most recent log entries
      const oldestLog = sortedLogs[0];
      const latestLog = sortedLogs[sortedLogs.length - 1];

      // Calculate days between logs
      const daysBetween =
        (new Date(latestLog.date).getTime() -
          new Date(oldestLog.date).getTime()) /
        (1000 * 60 * 60 * 24);
      if (daysBetween < 7) return; // Need at least a week of data

      // Calculate average weight loss per day
      const weightChange = oldestLog.weight - latestLog.weight;
      const lossPerDay = weightChange / daysBetween;

      setWeightLossRate(lossPerDay * 7); // Weekly rate

      // Only calculate projection if actually losing weight
      if (lossPerDay <= 0) return;

      const remainingWeight = latestLog.weight - targetWeight;
      const daysRemaining = remainingWeight / lossPerDay;

      // Calculate projected completion date
      const projDate = new Date();
      projDate.setDate(projDate.getDate() + daysRemaining);
      setProjectedDate(projDate);
    };

    const calculatedProgress = calculateProgress();
    setProgress(calculatedProgress);
    calculateProjection();
  }, [currentWeight, targetWeight, startWeight, weightLogs]);

  // Format date as Month Day, Year
  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // Get progress bar color based on percentage
  const getProgressColor = () => {
    if (progress < 25) return "bg-red-500";
    if (progress < 50) return "bg-orange-500";
    if (progress < 75) return "bg-yellow-500";
    return "bg-green-500";
  };

  return (
    <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4">
      <h3 className="font-bold mb-3 flex items-center">
        <TrendingDownIcon className="w-4 h-4 mr-2" />
        Weight Progress
      </h3>

      {/* Progress bar */}
      <div className="mb-4">
        <div className="flex justify-between text-sm text-gray-500 dark:text-gray-400 mb-1">
          <span>Progress: {progress}%</span>
          <span>
            {currentWeight} → {targetWeight} lbs
          </span>
        </div>
        <Progress
          value={progress}
          className="h-2 bg-gray-300 dark:bg-gray-700"
          color={getProgressColor()}
        />
      </div>

      {/* Weight stats */}
      <div className="grid grid-cols-3 gap-2 mb-2">
        <div className="bg-white dark:bg-gray-750 p-2 rounded">
          <div className="text-xs text-gray-500 dark:text-gray-400">
            Current
          </div>
          <div className="text-lg font-medium">
            {currentWeight} <span className="text-xs">lbs</span>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-750 p-2 rounded">
          <div className="text-xs text-gray-500 dark:text-gray-400">
            Remaining
          </div>
          <div className="text-lg font-medium flex items-center">
            {remaining.toFixed(1)} <span className="text-xs ml-1">lbs</span>
            <ArrowDownIcon className="h-3 w-3 ml-1 text-green-500" />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-750 p-2 rounded">
          <div className="text-xs text-gray-500 dark:text-gray-400">Target</div>
          <div className="text-lg font-medium">
            {targetWeight} <span className="text-xs">lbs</span>
          </div>
        </div>
      </div>

      {/* Additional stats */}
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-white dark:bg-gray-750 p-2 rounded">
          <div className="text-xs text-gray-500 dark:text-gray-400">
            Lost so far
          </div>
          <div className="font-medium text-green-600 dark:text-green-400">
            {totalLost.toFixed(1)} lbs
          </div>
        </div>

        {weightLossRate !== null && weightLossRate > 0 && (
          <div className="bg-white dark:bg-gray-750 p-2 rounded">
            <div className="text-xs text-gray-500 dark:text-gray-400">
              Weekly rate
            </div>
            <div className="font-medium text-blue-600 dark:text-blue-400">
              {weightLossRate.toFixed(1)} lbs/week
            </div>
          </div>
        )}

        {projectedDate && (
          <div className="bg-white dark:bg-gray-750 p-2 rounded col-span-2">
            <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center">
              <CalendarIcon className="h-3 w-3 mr-1" />
              Projected completion
            </div>
            <div className="font-medium">{formatDate(projectedDate)}</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default WeightProgressCard;

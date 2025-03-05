// DailyTotalsUI.jsx

interface DailyTotalsUIProps {
  totalCalories?: number;
  totalProtein?: number;
  totalCarbs?: number;
  totalFat?: number;
  targetCalories?: number;
  targetProtein?: number;
  targetCarbs?: number;
  targetFat?: number;
}

const DailyTotalsUI = ({
  totalCalories = 0,
  totalProtein = 0,
  totalCarbs = 0,
  totalFat = 0,
  targetCalories = 2000,
  targetProtein = 110,
  targetCarbs = 275,
  targetFat = 73,
}: DailyTotalsUIProps) => {
  // Calculate percentage and prevent NaN
  const calculatePercentage = (value: number, target: number) => {
    if (!value || !target) return 0;
    return Math.min(Math.round((value / target) * 100), 100);
  };

  // Generate smooth gradient-based color dynamically
  const getProgressColor = (percentage: number) => {
    if (percentage < 50) return "bg-gradient-to-r from-red-400 to-red-600";
    if (percentage < 80)
      return "bg-gradient-to-r from-yellow-400 to-yellow-500";
    return "bg-gradient-to-r from-green-400 to-green-600";
  };

  return (
    <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-6 w-full shadow-lg">
      <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">
        Daily Nutrition Summary
      </h2>

      <div className="grid grid-cols-2 gap-6">
        {[
          {
            label: "Calories",
            value: totalCalories,
            target: targetCalories,
            unit: "kcal",
            color: "text-orange-500",
          },
          {
            label: "Protein",
            value: totalProtein,
            target: targetProtein,
            unit: "g",
            color: "text-red-500",
          },
          {
            label: "Carbs",
            value: totalCarbs,
            target: targetCarbs,
            unit: "g",
            color: "text-yellow-500",
          },
          {
            label: "Fat",
            value: totalFat,
            target: targetFat,
            unit: "g",
            color: "text-blue-500",
          },
        ].map(({ label, value, target, unit, color }, index) => {
          const percentage = calculatePercentage(value, target);
          return (
            <div
              key={index}
              className="bg-white dark:bg-gray-700 rounded-lg p-6 shadow-md transition-all"
            >
              <div className="flex justify-between items-center mb-3">
                <div className="flex items-center">
                  <span className={`w-5 h-5 mr-2 ${color}`}>&#x1F4A1;</span>
                  <span className="text-lg font-semibold">{label}</span>
                </div>
                <span className="text-2xl font-bold text-gray-900 dark:text-white">
                  {value} {unit}
                </span>
              </div>

              {/* Progress Bar (Dynamic & Wider) */}
              <div className="w-full bg-gray-300 dark:bg-gray-600 rounded-full h-5">
                <div
                  className={`h-5 rounded-full ${getProgressColor(
                    percentage
                  )} transition-all duration-300`}
                  style={{ width: `${percentage}%` }}
                ></div>
              </div>

              <div className="text-sm text-right mt-2 text-gray-600 dark:text-gray-400">
                {percentage}% of {target} {unit}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default DailyTotalsUI;

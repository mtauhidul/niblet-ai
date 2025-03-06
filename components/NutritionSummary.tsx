import { useCallback, useEffect, useRef, useState } from "react";

interface NutritionSummaryProps {
  initialData: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  fetchNutritionData?: () => Promise<any>; // Make it optional and clearly define it's a function
}

const NutritionSummary = ({
  initialData = {
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
  },
  fetchNutritionData,
}: NutritionSummaryProps) => {
  const [nutritionData, setNutritionData] = useState(initialData);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dataRef = useRef(initialData);

  // Store current data in ref to use as fallback
  useEffect(() => {
    dataRef.current = nutritionData;
  }, [nutritionData]);

  // Calculate macronutrient percentages of total calories
  const calculatePercentages = () => {
    if (nutritionData.calories === 0) return { protein: 0, carbs: 0, fat: 0 };

    // Standard calorie content per gram
    const proteinCals = nutritionData.protein * 4;
    const carbsCals = nutritionData.carbs * 4;
    const fatCals = nutritionData.fat * 9;

    return {
      protein: Math.round((proteinCals / nutritionData.calories) * 100) || 0,
      carbs: Math.round((carbsCals / nutritionData.calories) * 100) || 0,
      fat: Math.round((fatCals / nutritionData.calories) * 100) || 0,
    };
  };

  const percentages = calculatePercentages();

  // Safely fetch nutrition data with error handling
  const fetchData = useCallback(async () => {
    if (!fetchNutritionData) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetchNutritionData();

      // Validate the response data
      if (!response || typeof response !== "object") {
        throw new Error("Invalid data received from API");
      }

      // Validate required fields with defaults for safety
      const validatedData = {
        calories: Number(response.calories) || dataRef.current.calories || 0,
        protein: Number(response.protein) || dataRef.current.protein || 0,
        carbs: Number(response.carbs) || dataRef.current.carbs || 0,
        fat: Number(response.fat) || dataRef.current.fat || 0,
      };

      setNutritionData(validatedData);
    } catch (err) {
      console.error("Error fetching nutrition data:", err);
      setError("Unable to update nutrition data");
      // Don't update state on error to maintain UI stability
    } finally {
      setIsLoading(false);
    }
  }, [fetchNutritionData]);

  // Fetch data on initial load
  useEffect(() => {
    let mounted = true;

    const initFetch = async () => {
      if (fetchNutritionData && mounted) {
        await fetchData();
      }
    };

    initFetch();

    return () => {
      mounted = false;
    };
  }, [fetchData]);

  // Get color for macronutrient bar
  const getMacroColor = (type: string) => {
    switch (type) {
      case "protein":
        return "bg-blue-500";
      case "carbs":
        return "bg-yellow-500";
      case "fat":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  // Safe percentage calculation with min/max bounds
  const getSafePercentage = (value: number) => {
    return Math.min(100, Math.max(0, value || 0));
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 w-full">
      {/* Calories header */}
      <div className="flex justify-between items-center mb-6 border-b pb-4">
        <h2 className="text-gray-500 dark:text-gray-400 text-lg">Calories</h2>
        <span className="text-3xl font-bold">
          {isLoading ? (
            <div className="h-8 w-20 bg-gray-200 dark:bg-gray-700 animate-pulse rounded"></div>
          ) : (
            nutritionData.calories.toLocaleString()
          )}
        </span>
      </div>

      {/* Error message if fetch failed */}
      {error && (
        <div className="mb-4 p-2 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded text-red-600 dark:text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Macronutrients */}
      <div className="space-y-6">
        {/* Protein */}
        <div>
          <div className="flex justify-between mb-1">
            <span className="font-medium">Protein</span>
            <span className="text-gray-500">
              {nutritionData.protein}g ({percentages.protein}%)
            </span>
          </div>
          <div className="h-2 w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className={`h-full ${getMacroColor("protein")}`}
              style={{ width: `${getSafePercentage(percentages.protein)}%` }}
            />
          </div>
        </div>

        {/* Carbs */}
        <div>
          <div className="flex justify-between mb-1">
            <span className="font-medium">Carbs</span>
            <span className="text-gray-500">
              {nutritionData.carbs}g ({percentages.carbs}%)
            </span>
          </div>
          <div className="h-2 w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className={`h-full ${getMacroColor("carbs")}`}
              style={{ width: `${getSafePercentage(percentages.carbs)}%` }}
            />
          </div>
        </div>

        {/* Fat */}
        <div>
          <div className="flex justify-between mb-1">
            <span className="font-medium">Fat</span>
            <span className="text-gray-500">
              {nutritionData.fat}g ({percentages.fat}%)
            </span>
          </div>
          <div className="h-2 w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className={`h-full ${getMacroColor("fat")}`}
              style={{ width: `${getSafePercentage(percentages.fat)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Macronutrient distribution chart */}
      <div className="mt-6">
        <div className="h-6 w-full flex rounded-md overflow-hidden">
          <div
            className={`${getMacroColor("protein")}`}
            style={{ width: `${getSafePercentage(percentages.protein)}%` }}
            title={`Protein: ${percentages.protein}%`}
          />
          <div
            className={`${getMacroColor("carbs")}`}
            style={{ width: `${getSafePercentage(percentages.carbs)}%` }}
            title={`Carbs: ${percentages.carbs}%`}
          />
          <div
            className={`${getMacroColor("fat")}`}
            style={{ width: `${getSafePercentage(percentages.fat)}%` }}
            title={`Fat: ${percentages.fat}%`}
          />
        </div>

        <div className="flex justify-between mt-2 text-xs text-gray-500">
          <div className="flex items-center">
            <div className="w-3 h-3 bg-blue-500 rounded-full mr-1"></div>
            <span>Protein</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-yellow-500 rounded-full mr-1"></div>
            <span>Carbs</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-red-500 rounded-full mr-1"></div>
            <span>Fat</span>
          </div>
        </div>
      </div>

      {/* Loading indicator */}
      {isLoading && (
        <div className="text-center mt-4 text-xs text-gray-500">
          Updating data...
        </div>
      )}
    </div>
  );
};

export default NutritionSummary;

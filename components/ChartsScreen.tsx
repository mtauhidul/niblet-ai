// components/ChartsScreen.tsx
"use client";

import HamburgerMenu from "@/components/HamburgerMenu";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Expand, Minimize2, RefreshCw } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import CombinedWeightCalorieChart from "./CombinedWeightCalorieChart";

const ChartsScreen = () => {
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [dateRange, setDateRange] = useState<
    "week" | "month" | "3months" | "year"
  >("month");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const chartRef = useRef<HTMLDivElement>(null);

  // Handle body styling when in fullscreen
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

  // Toggle fullscreen mode
  const toggleFullScreen = () => {
    setIsFullScreen(!isFullScreen);

    // If entering fullscreen, scroll chart into view
    if (!isFullScreen && chartRef.current) {
      chartRef.current.scrollIntoView({ behavior: "smooth" });
    }
  };

  // Handle refresh button click
  const handleRefresh = async () => {
    setIsRefreshing(true);

    // Wait to simulate refresh and avoid UI flicker
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Force a chart refresh by changing and immediately reverting dateRange
    const currentRange = dateRange;
    const tempRange = currentRange === "week" ? "month" : "week";
    setDateRange(tempRange);

    setTimeout(() => {
      setDateRange(currentRange);
      setIsRefreshing(false);
    }, 100);
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header - Hide in fullscreen mode */}
      {!isFullScreen && (
        <header className="py-3 px-4 border-b dark:border-gray-800 flex justify-between items-center">
          <HamburgerMenu />
          <div className="text-2xl font-bold">
            niblet<span className="text-blue-400">.ai</span>
          </div>
          <div className="w-6"></div>
        </header>
      )}

      <div
        className={`${
          isFullScreen ? "flex-1" : "flex-1 overflow-y-auto p-4 space-y-4"
        }`}
      >
        <Card
          className={`${
            isFullScreen ? "fixed inset-0 z-50 m-0 rounded-none" : ""
          }`}
          ref={chartRef}
        >
          <CardHeader className="pb-2">
            <CardTitle className="flex justify-between items-center">
              <span>
                Weight and Calories Over Time
                {isFullScreen ? " with Goal Trajectory" : ""}
              </span>
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleFullScreen}
                className="ml-auto"
                title={isFullScreen ? "Exit Full Screen" : "Full Screen"}
              >
                {isFullScreen ? (
                  <Minimize2 className="h-5 w-5" />
                ) : (
                  <Expand className="h-5 w-5" />
                )}
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Controls */}
            <div className="flex flex-wrap gap-2 mb-4">
              <div>
                <Tabs
                  value={dateRange}
                  onValueChange={(value: string) =>
                    setDateRange(value as "week" | "month" | "3months" | "year")
                  }
                  className="mb-1"
                >
                  <TabsList>
                    <TabsTrigger value="week">Week</TabsTrigger>
                    <TabsTrigger value="month">Month</TabsTrigger>
                    <TabsTrigger value="3months">3 Months</TabsTrigger>
                    <TabsTrigger value="year">Year</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>

              <div className="ml-auto">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                >
                  <RefreshCw
                    className={`h-4 w-4 mr-2 ${
                      isRefreshing ? "animate-spin" : ""
                    }`}
                  />
                  {isRefreshing ? "Refreshing..." : "Refresh"}
                </Button>
              </div>
            </div>

            {/* Chart */}
            <CombinedWeightCalorieChart dateRange={dateRange} />
          </CardContent>
        </Card>
      </div>

      {/* Footer - Hide in fullscreen mode */}
      {!isFullScreen && (
        <div className="p-4 border-t dark:border-gray-800 text-center text-sm text-gray-500">
          Swipe right to return to dashboard
        </div>
      )}
    </div>
  );
};

export default ChartsScreen;

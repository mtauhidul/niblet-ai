// components/ChartsScreen.tsx - Fixed to properly implement the HamburgerMenu
"use client";

import HamburgerMenu from "@/components/HamburgerMenu";
import UnifiedProgressChart from "@/components/UnifiedProgressChart";
import { useEffect, useState } from "react";

const ChartsScreen = () => {
  const [isFullScreen, setIsFullScreen] = useState(false);

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

  return (
    <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header - Hide in fullscreen mode */}
      {!isFullScreen && (
        <header className="py-3 px-4 border-b dark:border-gray-800 flex justify-between items-center">
          {/* Use HamburgerMenu component correctly */}
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
        {/* Unified Progress Chart */}
        <UnifiedProgressChart onFullScreenChange={setIsFullScreen} />
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

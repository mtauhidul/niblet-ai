"use client";

import { useEffect, useState } from "react";

const AnimatedTagline = () => {
  const words = ["text", "picture", "quick call", "voice note"];
  const [currentWord, setCurrentWord] = useState(words[0]);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    let wordIndex = 0;
    let animationTimer: NodeJS.Timeout;

    const animateNextWord = () => {
      setIsAnimating(true); // Start fade out

      setTimeout(() => {
        wordIndex = (wordIndex + 1) % words.length;
        setCurrentWord(words[wordIndex]);

        setTimeout(() => {
          setIsAnimating(false); // Start fade in

          // Schedule next animation
          animationTimer = setTimeout(animateNextWord, 2000);
        }, 100);
      }, 400);
    };

    const initialTimer = setTimeout(animateNextWord, 1000);

    return () => {
      clearTimeout(initialTimer);
      clearTimeout(animationTimer);
    };
  }, []);

  return (
    <h1 className="text-xl sm:text-2xl md:text-4xl lg:text-5xl font-bold mb-6 px-4">
      {/* Mobile layout (stacked) */}
      <div className="md:hidden flex flex-col items-center text-center">
        <div>meal & calorie tracking as simple as a</div>
        <div className="relative inline-block mt-1">
          <span
            className={`inline-block transition-all duration-500 absolute left-0 right-0 text-center text-[#165DFB] ${
              isAnimating
                ? "opacity-0 transform -translate-y-4"
                : "opacity-100 transform translate-y-0"
            }`}
          >
            {currentWord}
          </span>
          <span className="invisible inline-block">voice note</span>
        </div>
      </div>

      {/* Desktop layout (inline) */}
      <div className="hidden md:flex flex-wrap items-baseline justify-center">
        <span>meal & calorie tracking as simple as a </span>
        <div className="relative inline-block ml-2">
          <span
            className={`inline-block transition-all duration-500 absolute left-0 text-left text-[#165DFB] ${
              isAnimating
                ? "opacity-0 transform -translate-y-4"
                : "opacity-100 transform translate-y-0"
            }`}
            style={{ minWidth: "100%" }}
          >
            {currentWord}
          </span>
          <span className="invisible inline-block">voice note</span>
        </div>
      </div>
    </h1>
  );
};

export default AnimatedTagline;

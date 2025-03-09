// components/HeightSelector.tsx
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useState } from "react";

interface HeightSelectorProps {
  initialHeight?: number;
  onChange: (heightInInches: number) => void;
}

export default function HeightSelector({
  initialHeight,
  onChange,
}: HeightSelectorProps) {
  const [selectedHeight, setSelectedHeight] = useState<number | undefined>(
    initialHeight
  );

  // Generate heights from 4'0" to 7'0"
  const heights = [];
  for (let feet = 4; feet <= 7; feet++) {
    for (let inches = 0; inches < 12; inches++) {
      // Skip inches for 7 feet (just show 7'0")
      if (feet === 7 && inches > 0) continue;

      const totalInches = feet * 12 + inches;
      heights.push({
        label: `${feet}'${inches}"`,
        value: totalInches,
      });
    }
  }

  const handleHeightSelect = (heightInInches: number) => {
    setSelectedHeight(heightInInches);
    onChange(heightInInches);
  };

  return (
    <div>
      <Label className="block mb-2">Select Your Height</Label>
      <div className="grid grid-cols-4 gap-2">
        {heights.map((height) => (
          <Button
            key={height.value}
            type="button"
            variant={height.value === selectedHeight ? "default" : "outline"}
            onClick={() => handleHeightSelect(height.value)}
            className="w-full"
          >
            {height.label}
          </Button>
        ))}
      </div>
    </div>
  );
}

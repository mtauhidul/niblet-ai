// components/HeightSelector.tsx
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useEffect, useState } from "react";

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

  // Update the component if initialHeight prop changes
  useEffect(() => {
    if (initialHeight !== undefined) {
      setSelectedHeight(initialHeight);
    }
  }, [initialHeight]);

  const handleHeightSelect = (heightValue: string) => {
    const heightInInches = parseInt(heightValue);
    setSelectedHeight(heightInInches);
    onChange(heightInInches);
  };

  // Generate height options from 4'0" to 7'0"
  const generateHeightOptions = () => {
    const options = [];

    for (let feet = 4; feet <= 7; feet++) {
      const maxInches = feet === 7 ? 1 : 12; // Only show 7'0"

      for (let inches = 0; inches < maxInches; inches++) {
        const totalInches = feet * 12 + inches;
        options.push({
          label: `${feet}'${inches}"`,
          value: totalInches.toString(),
        });
      }
    }

    return options;
  };

  const heightOptions = generateHeightOptions();

  return (
    <div className="space-y-2">
      <Label htmlFor="height-select">Height</Label>
      <Select
        value={selectedHeight?.toString()}
        onValueChange={handleHeightSelect}
      >
        <SelectTrigger id="height-select" className="w-full">
          <SelectValue placeholder="Select your height" />
        </SelectTrigger>
        <SelectContent>
          {heightOptions.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

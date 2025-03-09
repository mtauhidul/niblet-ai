// components/ActivityZoneSelector.tsx
import { Label } from "@/components/ui/label";
import { useState } from "react";

interface ActivityZoneSelectorProps {
  initialZone?: number;
  onChange: (zone: number, label: string) => void;
}

export default function ActivityZoneSelector({
  initialZone = 1,
  onChange,
}: ActivityZoneSelectorProps) {
  const [selectedZone, setSelectedZone] = useState(initialZone);

  const activityZones = [
    { zone: 1, label: "Sedentary", description: "Little to no exercise" },
    {
      zone: 2,
      label: "Lightly Active",
      description: "Light exercise 1-3 days/week",
    },
    {
      zone: 3,
      label: "Moderately Active",
      description: "Moderate exercise 3-5 days/week",
    },
    {
      zone: 4,
      label: "Very Active",
      description: "Hard exercise 6-7 days/week",
    },
    {
      zone: 5,
      label: "Extremely Active",
      description: "Very hard daily exercise or physical job",
    },
  ];

  const handleZoneSelect = (zone: number, label: string) => {
    setSelectedZone(zone);
    onChange(zone, label);
  };

  return (
    <div>
      <Label className="block mb-2">Activity Level</Label>
      <div className="space-y-2">
        {activityZones.map((activity) => (
          <div
            key={activity.zone}
            className={`p-3 border rounded-lg cursor-pointer transition-colors ${
              activity.zone === selectedZone
                ? "bg-blue-100 border-blue-300 dark:bg-blue-900 dark:border-blue-700"
                : "hover:bg-gray-100 dark:hover:bg-gray-800"
            }`}
            onClick={() => handleZoneSelect(activity.zone, activity.label)}
          >
            <div className="font-medium">{activity.label}</div>
            <div className="text-sm text-gray-500">{activity.description}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

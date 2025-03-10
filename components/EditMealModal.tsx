// components/EditMealModal.tsx
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import eventEmitter from "@/lib/events";
import type { Meal } from "@/lib/firebase/models/meal";
import { format, subDays } from "date-fns";
import { useEffect, useState } from "react";

interface EditMealModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onMealUpdated: () => void;
  meal: Meal | null;
}

const EditMealModal: React.FC<EditMealModalProps> = ({
  open,
  onOpenChange,
  onMealUpdated,
  meal,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [mealData, setMealData] = useState({
    name: "",
    mealType: "Other",
    calories: "",
    protein: "",
    carbs: "",
    fat: "",
    items: "", // Comma-separated items
    date: format(new Date(), "yyyy-MM-dd"),
  });

  // When meal prop changes, update the form data
  useEffect(() => {
    if (meal) {
      const mealDate =
        meal.date instanceof Date ? meal.date : (meal.date as any).toDate();

      setMealData({
        name: meal.name || "",
        mealType: meal.mealType || "Other",
        calories: meal.calories?.toString() || "",
        protein: meal.protein?.toString() || "",
        carbs: meal.carbs?.toString() || "",
        fat: meal.fat?.toString() || "",
        items: meal.items ? meal.items.join(", ") : "",
        date: format(mealDate, "yyyy-MM-dd"),
      });
    }
  }, [meal]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setMealData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setMealData((prev) => ({ ...prev, [name]: value }));
  };

  const resetForm = () => {
    if (meal) {
      const mealDate =
        meal.date instanceof Date ? meal.date : (meal.date as any).toDate();

      setMealData({
        name: meal.name || "",
        mealType: meal.mealType || "Other",
        calories: meal.calories?.toString() || "",
        protein: meal.protein?.toString() || "",
        carbs: meal.carbs?.toString() || "",
        fat: meal.fat?.toString() || "",
        items: meal.items ? meal.items.join(", ") : "",
        date: format(mealDate, "yyyy-MM-dd"),
      });
    }
    setError(null);
  };

  const validateForm = () => {
    if (!mealData.name.trim()) {
      setError("Meal name is required");
      return false;
    }

    if (!mealData.calories.trim() || isNaN(parseFloat(mealData.calories))) {
      setError("Valid calories value is required");
      return false;
    }

    // Optional fields can be empty, but if provided must be valid numbers
    if (mealData.protein.trim() && isNaN(parseFloat(mealData.protein))) {
      setError("Protein must be a valid number");
      return false;
    }

    if (mealData.carbs.trim() && isNaN(parseFloat(mealData.carbs))) {
      setError("Carbs must be a valid number");
      return false;
    }

    if (mealData.fat.trim() && isNaN(parseFloat(mealData.fat))) {
      setError("Fat must be a valid number");
      return false;
    }

    if (!mealData.date) {
      setError("Date is required");
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!meal?.id) {
      setError("Meal ID is missing");
      return;
    }

    setError(null);

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      // Parse items string into array
      const items = mealData.items
        ? mealData.items
            .split(",")
            .map((item) => item.trim())
            .filter((item) => item.length > 0)
        : [];

      // Create meal payload
      const payload = {
        name: mealData.name,
        mealType: mealData.mealType,
        calories: parseFloat(mealData.calories),
        protein: mealData.protein ? parseFloat(mealData.protein) : null,
        carbs: mealData.carbs ? parseFloat(mealData.carbs) : null,
        fat: mealData.fat ? parseFloat(mealData.fat) : null,
        items: items,
        date: new Date(mealData.date).toISOString(), // Use the date from the form
      };

      console.log("Updating meal data:", payload);

      // Submit to API
      const response = await fetch(`/api/meals/${meal.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(responseData.message || "Failed to update meal");
      }

      console.log("Meal updated successfully:", responseData);
      eventEmitter.emit("meal-updated");

      // Close modal and trigger refresh
      onOpenChange(false);
      onMealUpdated();
    } catch (error) {
      console.error("Error updating meal:", error);
      setError(
        error instanceof Error ? error.message : "Failed to update meal"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Generate date options for the last 7 days
  const getDateOptions = () => {
    const options = [];
    const today = new Date();

    for (let i = 0; i < 7; i++) {
      const date = subDays(today, i);
      const dateStr = format(date, "yyyy-MM-dd");
      const displayDate = format(date, "EEE, MMM d");
      options.push({
        value: dateStr,
        label: i === 0 ? `Today (${displayDate})` : displayDate,
      });
    }

    return options;
  };

  // Handle modal close
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      resetForm();
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Meal</DialogTitle>
          <DialogDescription>
            Update the details of your meal.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="bg-red-100 dark:bg-red-900 p-3 rounded-md text-red-800 dark:text-red-200 text-sm mb-4">
            {error}
          </div>
        )}

        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">
              Meal Name<span className="text-red-500">*</span>
            </Label>
            <Input
              id="name"
              name="name"
              value={mealData.name}
              onChange={handleInputChange}
              placeholder="e.g., Chicken Salad"
              className="col-span-3"
              required
            />
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="mealType" className="text-right">
              Meal Type
            </Label>
            <Select
              value={mealData.mealType}
              onValueChange={(value) => handleSelectChange("mealType", value)}
            >
              <SelectTrigger id="mealType" className="col-span-3">
                <SelectValue placeholder="Select meal type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Breakfast">Breakfast</SelectItem>
                <SelectItem value="Morning Snack">Morning Snack</SelectItem>
                <SelectItem value="Lunch">Lunch</SelectItem>
                <SelectItem value="Afternoon Snack">Afternoon Snack</SelectItem>
                <SelectItem value="Dinner">Dinner</SelectItem>
                <SelectItem value="Evening Snack">Evening Snack</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="date" className="text-right">
              Date<span className="text-red-500">*</span>
            </Label>
            <Select
              value={mealData.date}
              onValueChange={(value) => handleSelectChange("date", value)}
            >
              <SelectTrigger id="date" className="col-span-3">
                <SelectValue placeholder="Select date" />
              </SelectTrigger>
              <SelectContent>
                {getDateOptions().map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="calories" className="text-right">
              Calories<span className="text-red-500">*</span>
            </Label>
            <Input
              id="calories"
              name="calories"
              type="number"
              value={mealData.calories}
              onChange={handleInputChange}
              placeholder="e.g., 350"
              className="col-span-3"
              required
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label htmlFor="protein" className="block mb-2">
                Protein (g)
              </Label>
              <Input
                id="protein"
                name="protein"
                type="number"
                value={mealData.protein}
                onChange={handleInputChange}
                placeholder="e.g., 25"
              />
            </div>

            <div>
              <Label htmlFor="carbs" className="block mb-2">
                Carbs (g)
              </Label>
              <Input
                id="carbs"
                name="carbs"
                type="number"
                value={mealData.carbs}
                onChange={handleInputChange}
                placeholder="e.g., 40"
              />
            </div>

            <div>
              <Label htmlFor="fat" className="block mb-2">
                Fat (g)
              </Label>
              <Input
                id="fat"
                name="fat"
                type="number"
                value={mealData.fat}
                onChange={handleInputChange}
                placeholder="e.g., 12"
              />
            </div>
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="items" className="text-right">
              Food Items
            </Label>
            <Input
              id="items"
              name="items"
              value={mealData.items}
              onChange={handleInputChange}
              placeholder="e.g., chicken, lettuce, tomato, dressing"
              className="col-span-3"
            />
            <div className="col-span-4 text-xs text-gray-500 ml-auto w-3/4">
              Separate multiple items with commas
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? "Updating..." : "Update Meal"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EditMealModal;

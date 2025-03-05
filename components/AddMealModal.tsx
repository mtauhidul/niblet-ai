// components/AddMealModal.tsx
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
import { useState } from "react";

interface AddMealModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onMealAdded: () => void;
}

const AddMealModal: React.FC<AddMealModalProps> = ({
  open,
  onOpenChange,
  onMealAdded,
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
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setMealData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setMealData((prev) => ({ ...prev, [name]: value }));
  };

  const resetForm = () => {
    setMealData({
      name: "",
      mealType: "Other",
      calories: "",
      protein: "",
      carbs: "",
      fat: "",
      items: "",
    });
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

    return true;
  };

  const handleSubmit = async () => {
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
        date: new Date().toISOString(),
      };

      console.log("Sending meal data:", payload);

      // Submit to API
      const response = await fetch("/api/meals", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(responseData.message || "Failed to add meal");
      }

      console.log("Meal added successfully:", responseData);

      // Reset form
      resetForm();

      // Close modal and trigger refresh
      onOpenChange(false);
      onMealAdded();
    } catch (error) {
      console.error("Error adding meal:", error);
      setError(error instanceof Error ? error.message : "Failed to add meal");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Reset form when modal is closed
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
          <DialogTitle>Add New Meal</DialogTitle>
          <DialogDescription>
            Enter the details of your meal to log it.
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
            {isSubmitting ? "Adding..." : "Add Meal"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AddMealModal;

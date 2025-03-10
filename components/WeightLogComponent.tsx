"use client";

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
import { Textarea } from "@/components/ui/textarea";
import { format, subDays } from "date-fns";
import { Edit, PlusCircle, Scale, Trash } from "lucide-react";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./ui/alert-dialog";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Progress } from "./ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";

export interface WeightLog {
  id?: string;
  userId: string;
  weight: number;
  date: Date | string;
  note?: string;
  createdAt?: any;
}

interface WeightLogComponentProps {
  onWeightLogged?: () => void;
  showTitle?: boolean;
  startWeight?: number;
  targetWeight?: number;
}

const WeightLogComponent = ({
  onWeightLogged,
  showTitle = true,
  startWeight,
  targetWeight,
}: WeightLogComponentProps) => {
  const { data: session } = useSession();
  const [isLoading, setIsLoading] = useState(false);
  const [weightLogs, setWeightLogs] = useState<WeightLog[]>([]);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [currentLog, setCurrentLog] = useState<WeightLog | null>(null);
  const [deletingLogId, setDeletingLogId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Form state
  const [newWeight, setNewWeight] = useState("");
  const [newDate, setNewDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [newNote, setNewNote] = useState("");

  // When editing
  const [editWeight, setEditWeight] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editNote, setEditNote] = useState("");

  // Calculate progress
  const currentWeightValue =
    weightLogs.length > 0 ? weightLogs[0].weight : startWeight || 0;
  const progressPercentage =
    targetWeight && startWeight && currentWeightValue
      ? Math.min(
          100,
          Math.max(
            0,
            ((startWeight - currentWeightValue) /
              (startWeight - targetWeight)) *
              100
          )
        )
      : 0;

  // Format progress based on goal (loss or gain)
  const isWeightLoss =
    targetWeight && startWeight ? targetWeight < startWeight : true;
  const weightChange =
    startWeight && currentWeightValue ? startWeight - currentWeightValue : 0;
  const formattedChange = isWeightLoss ? weightChange : -weightChange;

  // Load weight logs
  useEffect(() => {
    if (!session?.user?.id) return;

    const fetchWeightLogs = async () => {
      setIsLoading(true);
      try {
        const response = await fetch("/api/weight?limit=10");
        if (response.ok) {
          const data = await response.json();
          // Convert date strings to Date objects
          const formattedLogs = data.map((log: any) => ({
            ...log,
            date: new Date(log.date),
          }));
          setWeightLogs(formattedLogs);
        } else {
          toast.error("Failed to load weight logs");
        }
      } catch (error) {
        console.error("Error fetching weight logs:", error);
        toast.error("Error loading weight data");
      } finally {
        setIsLoading(false);
      }
    };

    fetchWeightLogs();
  }, [session?.user?.id]);

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

  // Handle adding a new weight log
  const handleAddWeightLog = async () => {
    if (!session?.user?.id) {
      toast.error("You must be logged in to log weight");
      return;
    }

    if (!newWeight || isNaN(parseFloat(newWeight))) {
      toast.error("Please enter a valid weight");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/weight", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          weight: parseFloat(newWeight),
          date: new Date(newDate),
          note: newNote || undefined,
        }),
      });

      if (response.ok) {
        const newLog = await response.json();
        setWeightLogs([
          {
            ...newLog,
            date: new Date(newLog.date),
          },
          ...weightLogs,
        ]);

        setShowAddDialog(false);
        setNewWeight("");
        setNewDate(format(new Date(), "yyyy-MM-dd"));
        setNewNote("");

        toast.success("Weight logged successfully");
        if (onWeightLogged) onWeightLogged();
      } else {
        const error = await response.json();
        toast.error(error.message || "Failed to log weight");
      }
    } catch (error) {
      console.error("Error logging weight:", error);
      toast.error("Error saving weight data");
    } finally {
      setIsLoading(false);
    }
  };

  // Handle updating a weight log
  const handleUpdateWeightLog = async () => {
    if (!currentLog?.id || !session?.user?.id) return;

    if (!editWeight || isNaN(parseFloat(editWeight))) {
      toast.error("Please enter a valid weight");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`/api/weight/${currentLog.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          weight: parseFloat(editWeight),
          date: new Date(editDate),
          note: editNote || undefined,
        }),
      });

      if (response.ok) {
        // Update local state with the edited log
        const updatedLogs = weightLogs.map((log) =>
          log.id === currentLog.id
            ? {
                ...log,
                weight: parseFloat(editWeight),
                date: new Date(editDate),
                note: editNote || undefined,
              }
            : log
        );

        setWeightLogs(updatedLogs);
        setShowEditDialog(false);
        setCurrentLog(null);

        toast.success("Weight updated successfully");
        if (onWeightLogged) onWeightLogged();
      } else {
        const error = await response.json();
        toast.error(error.message || "Failed to update weight");
      }
    } catch (error) {
      console.error("Error updating weight:", error);
      toast.error("Error updating weight data");
    } finally {
      setIsLoading(false);
    }
  };

  // Handle weight deletion
  const handleDeleteWeightLog = async () => {
    if (!deletingLogId || !session?.user?.id) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/weight/${deletingLogId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        // Remove the deleted log from state
        setWeightLogs(weightLogs.filter((log) => log.id !== deletingLogId));
        toast.success("Weight log deleted successfully");
        if (onWeightLogged) onWeightLogged();
      } else {
        const error = await response.json();
        toast.error(error.message || "Failed to delete weight log");
      }
    } catch (error) {
      console.error("Error deleting weight log:", error);
      toast.error("Error deleting weight data");
    } finally {
      setIsDeleting(false);
      setDeletingLogId(null);
    }
  };

  // Open the edit dialog for a log
  const openEditDialog = (log: WeightLog) => {
    setCurrentLog(log);
    setEditWeight(log.weight.toString());
    setEditDate(format(new Date(log.date), "yyyy-MM-dd"));
    setEditNote(log.note || "");
    setShowEditDialog(true);
  };

  // Format date for display
  const formatDateForDisplay = (date: Date | string) => {
    const dateObj = date instanceof Date ? date : new Date(date);
    return format(dateObj, "MMM d, yyyy");
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-base font-medium">
            Weight Tracking
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            className="text-xs"
            onClick={() => setShowAddDialog(true)}
          >
            <PlusCircle className="h-4 w-4 mr-1" />
            Log Weight
          </Button>
        </CardHeader>
        <CardContent>
          {targetWeight && startWeight && (
            <div className="mb-4">
              <div className="flex justify-between text-sm text-gray-500 mb-1">
                <span>Progress toward goal</span>
                <span>{Math.round(progressPercentage)}%</span>
              </div>
              <Progress value={progressPercentage} className="h-2" />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>Start: {startWeight} lbs</span>
                <span>Goal: {targetWeight} lbs</span>
              </div>
              {weightChange !== 0 && (
                <div className="text-sm mt-2 text-center">
                  <span
                    className={
                      formattedChange > 0 ? "text-green-600" : "text-red-600"
                    }
                  >
                    {formattedChange > 0 ? "▼" : "▲"}{" "}
                    {Math.abs(formattedChange).toFixed(1)} lbs
                  </span>{" "}
                  since starting weight
                </div>
              )}
            </div>
          )}

          <div className="space-y-4">
            {isLoading && weightLogs.length === 0 ? (
              <div className="py-4 text-center text-gray-500">
                Loading weight history...
              </div>
            ) : weightLogs.length === 0 ? (
              <div className="py-4 text-center text-gray-500">
                No weight logs yet. Add your first weight entry using the "Log
                Weight" button.
              </div>
            ) : (
              <div className="space-y-2">
                {weightLogs.map((log) => (
                  <div
                    key={log.id}
                    className="flex items-center justify-between p-2 rounded-md border hover:bg-gray-50 dark:hover:bg-gray-800"
                  >
                    <div className="flex items-center">
                      <Scale className="h-4 w-4 mr-2 text-blue-500" />
                      <div>
                        <span className="font-medium">{log.weight} lbs</span>
                        <span className="text-xs text-gray-500 ml-2">
                          {formatDateForDisplay(log.date)}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => openEditDialog(log)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                        onClick={() => setDeletingLogId(log.id || null)}
                      >
                        <Trash className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Add Weight Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Log Weight</DialogTitle>
            <DialogDescription>
              Record your weight to track your progress over time.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="weight" className="text-right">
                Weight (lbs)
              </Label>
              <Input
                id="weight"
                type="number"
                step="0.1"
                placeholder="e.g., 150.5"
                value={newWeight}
                onChange={(e) => setNewWeight(e.target.value)}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="date" className="text-right">
                Date
              </Label>
              <Select value={newDate} onValueChange={setNewDate}>
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
              <Label htmlFor="note" className="text-right">
                Note
              </Label>
              <Textarea
                id="note"
                placeholder="Optional note about your weight"
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                className="col-span-3"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddWeightLog} disabled={isLoading}>
              {isLoading ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Weight Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Weight Log</DialogTitle>
            <DialogDescription>Update this weight record.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-weight" className="text-right">
                Weight (lbs)
              </Label>
              <Input
                id="edit-weight"
                type="number"
                step="0.1"
                placeholder="e.g., 150.5"
                value={editWeight}
                onChange={(e) => setEditWeight(e.target.value)}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-date" className="text-right">
                Date
              </Label>
              <Select value={editDate} onValueChange={setEditDate}>
                <SelectTrigger id="edit-date" className="col-span-3">
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
              <Label htmlFor="edit-note" className="text-right">
                Note
              </Label>
              <Textarea
                id="edit-note"
                placeholder="Optional note about your weight"
                value={editNote}
                onChange={(e) => setEditNote(e.target.value)}
                className="col-span-3"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateWeightLog} disabled={isLoading}>
              {isLoading ? "Updating..." : "Update"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={!!deletingLogId}
        onOpenChange={(open) => !open && setDeletingLogId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Weight Log</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this weight log? This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteWeightLog}
              disabled={isDeleting}
              className="bg-red-500 hover:bg-red-600 text-white"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default WeightLogComponent;

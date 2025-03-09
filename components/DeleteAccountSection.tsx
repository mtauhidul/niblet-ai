// components/DeleteAccountSection.tsx
"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { deleteUserAccount } from "@/lib/auth/authUtils";
import { useState } from "react";
import { toast } from "sonner";

const DeleteAccountSection = () => {
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleDeleteAccount = async () => {
    if (confirmText !== "delete my account") {
      toast.error("Please type 'delete my account' to confirm");
      return;
    }

    setIsDeleting(true);

    try {
      // Show loading toast
      toast.loading("Deleting your account...");

      // Use the enhanced deleteUserAccount function that handles both database and auth
      await deleteUserAccount();

      // Show success message
      toast.success("Your account has been deleted successfully");

      // The deleteUserAccount function will handle redirecting to the home page
    } catch (error) {
      console.error("Error deleting account:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to delete account"
      );
      setIsDeleting(false);
      setDialogOpen(false);
    }
  };

  return (
    <div className="border border-red-200 dark:border-red-900 rounded-lg p-6 bg-red-50 dark:bg-red-900/20">
      <h3 className="text-xl font-semibold text-red-600 dark:text-red-400 mb-4">
        Delete Account
      </h3>

      <p className="mb-4 text-gray-700 dark:text-gray-300">
        Deleting your account will permanently remove all your data, including:
      </p>

      <ul className="list-disc pl-5 mb-6 text-gray-700 dark:text-gray-300 space-y-1">
        <li>All your meal records and nutrition data</li>
        <li>Weight tracking history</li>
        <li>Personal profile information</li>
        <li>Goals and preferences</li>
        <li>Chat history with Niblet</li>
      </ul>

      <p className="mb-6 font-semibold text-red-600 dark:text-red-400">
        This action cannot be undone.
      </p>

      <AlertDialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <AlertDialogTrigger asChild>
          <Button variant="destructive" className="w-full sm:w-auto">
            Delete My Account
          </Button>
        </AlertDialogTrigger>

        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete your
              account and remove all your data from our servers.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="py-4">
            <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
              Please type{" "}
              <span className="font-mono bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">
                delete my account
              </span>{" "}
              to confirm:
            </p>
            <Input
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="delete my account"
              className="w-full"
            />
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setConfirmText("")}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleDeleteAccount();
              }}
              disabled={confirmText !== "delete my account" || isDeleting}
              className="bg-red-600 hover:bg-red-700 focus:bg-red-700"
            >
              {isDeleting ? "Deleting..." : "Delete Account"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default DeleteAccountSection;

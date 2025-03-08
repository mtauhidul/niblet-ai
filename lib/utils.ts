import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format chat text to fix common capitalization issues
 * @param text The text to format
 * @returns Formatted text with capitalization fixes
 */
export function formatChatText(text: string): string {
  // Ensure 'i' is capitalized when it's a standalone word
  const capitalizedText = text.replace(/\b(i)\b/g, "I");

  // Also ensure first letter of sentence is capitalized
  const firstLetterCapitalized = capitalizedText.replace(
    /(^\s*|[.!?]\s+)([a-z])/g,
    (match, p1, p2) => p1 + p2.toUpperCase()
  );

  return firstLetterCapitalized;
}

/**
 * Formats a height value in inches to a human-readable format
 * @param inches Height in inches
 * @returns Formatted height string (e.g., "5'10"")
 */
export function formatHeight(inches: number | undefined | null): string {
  if (!inches) return "Not specified";

  const feet = Math.floor(inches / 12);
  const remainingInches = Math.round(inches % 12);

  return `${feet}'${remainingInches}"`;
}

/**
 * Convert a date to a readable format
 * @param date The date to format
 * @returns Formatted date string
 */
export function formatDate(date: Date | string): string {
  if (!date) return "";

  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(d);
}

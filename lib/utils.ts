import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Rounds to 2 decimal places, avoiding binary float drift. */
export function round2(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

/** Formats a number as "PKR X,XXX" (or "PKR X,XXX.XX" when it carries cents). */
export function formatPKR(value: number) {
  const rounded = round2(value)
  const formatted = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: Number.isInteger(rounded) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(rounded)
  return `PKR ${formatted}`
}

/** Formats a date/time as "h:mm a", e.g. "2:30 PM". */
export function formatTime(value: Date | string) {
  const date = typeof value === "string" ? new Date(value) : value
  return new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit", hour12: true }).format(date)
}

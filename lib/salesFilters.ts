/** Resolves a sales-history period filter into a concrete [start, end] date range. */
export function resolveDateRange(
  period: string | null,
  startDateParam: string | null,
  endDateParam: string | null
) {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  switch (period) {
    case "week":
      return { start: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000), end: now };
    case "15days":
      return { start: new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000), end: now };
    case "month":
      return { start: new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0), end: endOfToday };
    case "custom": {
      if (startDateParam && endDateParam) {
        const start = new Date(startDateParam);
        start.setHours(0, 0, 0, 0);
        const end = new Date(endDateParam);
        end.setHours(23, 59, 59, 999);
        if (!Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime())) {
          return { start, end };
        }
      }
      return { start: startOfToday, end: endOfToday };
    }
    case "today":
    default:
      return { start: startOfToday, end: endOfToday };
  }
}

export type SortOption = "date_asc" | "date_desc" | "amount_asc" | "amount_desc";

export function resolveSort(sort: string | null): { field: "createdAt" | "netPayable"; ascending: boolean } {
  switch (sort) {
    case "date_asc":
      return { field: "createdAt", ascending: true };
    case "amount_asc":
      return { field: "netPayable", ascending: true };
    case "amount_desc":
      return { field: "netPayable", ascending: false };
    case "date_desc":
    default:
      return { field: "createdAt", ascending: false };
  }
}

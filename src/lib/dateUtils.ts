import {
  subDays,
  startOfMonth,
  endOfMonth,
  subMonths,
  format,
  isWithinInterval,
  parseISO,
} from "date-fns";

export type PeriodType = "month" | "7d" | "30d" | "90d" | "custom";

export interface DateRange {
  from: Date;
  to: Date;
}

export function getPeriodDateRange(period: PeriodType, customRange?: DateRange): { current: DateRange; previous: DateRange } {
  const today = new Date();

  if (period === "custom" && customRange?.from && customRange?.to) {
    const diff = customRange.to.getTime() - customRange.from.getTime();
    const prevTo = subDays(customRange.from, 1);
    const prevFrom = new Date(prevTo.getTime() - diff);
    return {
      current: { from: customRange.from, to: customRange.to },
      previous: { from: prevFrom, to: prevTo },
    };
  }

  if (period === "7d") {
    return {
      current: { from: subDays(today, 7), to: today },
      previous: { from: subDays(today, 14), to: subDays(today, 7) },
    };
  }

  if (period === "30d") {
    return {
      current: { from: subDays(today, 30), to: today },
      previous: { from: subDays(today, 60), to: subDays(today, 30) },
    };
  }

  if (period === "90d") {
    return {
      current: { from: subDays(today, 90), to: today },
      previous: { from: subDays(today, 180), to: subDays(today, 90) },
    };
  }

  // Default: month
  return {
    current: { from: startOfMonth(today), to: endOfMonth(today) },
    previous: { from: startOfMonth(subMonths(today, 1)), to: endOfMonth(subMonths(today, 1)) },
  };
}

export function isDateInRange(dateStr: string, range: DateRange) {
  try {
    const date = parseISO(dateStr);
    return isWithinInterval(date, { start: range.from, end: range.to });
  } catch (e) {
    return false;
  }
}

export function isMonthInRange(monthStr: string, range: DateRange) {
  // monthStr is YYYY-MM. We check if the start or end of this month overlaps with the range.
  try {
    const monthStart = parseISO(`${monthStr}-01`);
    const monthEnd = endOfMonth(monthStart);
    // overlap: range.from <= monthEnd && range.to >= monthStart
    return range.from <= monthEnd && range.to >= monthStart;
  } catch (e) {
    return false;
  }
}

export function calculateTrend(current: number, previous: number) {
  if (previous === 0) {
    if (current === 0) return { trend: "neutral" as const, value: "0%" };
    return { trend: "up" as const, value: "100%" };
  }
  
  const diff = ((current - previous) / previous) * 100;
  if (Math.abs(diff) < 0.1) return { trend: "neutral" as const, value: "0%" };
  
  const formatted = Math.abs(diff).toFixed(1).replace('.', ',') + "%";
  return {
    trend: diff > 0 ? ("up" as const) : ("down" as const),
    value: diff > 0 ? `+${formatted}` : `-${formatted}`
  };
}

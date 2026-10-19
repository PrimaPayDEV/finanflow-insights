import {
  subDays,
  startOfMonth,
  endOfMonth,
  subMonths,
  format,
  isWithinInterval,
  parseISO,
  isWeekend,
  addDays,
} from "date-fns";

export type PeriodType = "month" | "7d" | "30d" | "90d" | "custom";

/**
 * Calculates Easter Sunday for a given Gregorian year (Meeus/Jones/Butcher algorithm).
 */
export function getEasterSunday(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

export interface BrazilianHoliday {
  date: string; // YYYY-MM-DD
  name: string;
}

const padZero = (n: number) => n.toString().padStart(2, "0");
export const formatDateKey = (d: Date) => `${d.getFullYear()}-${padZero(d.getMonth() + 1)}-${padZero(d.getDate())}`;

/**
 * Returns Brazilian national holidays and FEBRABAN non-working banking days for a given year.
 */
export function getBrazilianHolidays(year: number): BrazilianHoliday[] {
  const easter = getEasterSunday(year);
  const carnavalMon = addDays(easter, -48);
  const carnavalTue = addDays(easter, -47);
  const sextaFeiraSanta = addDays(easter, -2);
  const corpusChristi = addDays(easter, 60);

  return [
    { date: `${year}-01-01`, name: "Confraternização Universal (Ano Novo)" },
    { date: formatDateKey(carnavalMon), name: "Carnaval (Segunda-feira)" },
    { date: formatDateKey(carnavalTue), name: "Carnaval (Terça-feira)" },
    { date: formatDateKey(sextaFeiraSanta), name: "Sexta-feira Santa / Paixão de Cristo" },
    { date: `${year}-04-21`, name: "Tiradentes" },
    { date: `${year}-05-01`, name: "Dia Mundial do Trabalho" },
    { date: formatDateKey(corpusChristi), name: "Corpus Christi" },
    { date: `${year}-09-07`, name: "Independência do Brasil" },
    { date: `${year}-10-12`, name: "Nossa Senhora Aparecida" },
    { date: `${year}-11-02`, name: "Finados" },
    { date: `${year}-11-15`, name: "Proclamação da República" },
    { date: `${year}-11-20`, name: "Dia Nacional de Zumbi e da Consciência Negra" },
    { date: `${year}-12-25`, name: "Natal" },
    { date: `${year}-12-31`, name: "Último dia bancário do ano" },
  ];
}

const holidaysCache = new Map<number, Map<string, string>>();

/**
 * Checks whether a given date is a national/banking holiday in Brazil.
 */
export function getHolidayInfo(date: Date): { isHoliday: boolean; name?: string } {
  const year = date.getFullYear();
  let yearMap = holidaysCache.get(year);
  if (!yearMap) {
    yearMap = new Map<string, string>();
    const list = getBrazilianHolidays(year);
    for (const h of list) {
      yearMap.set(h.date, h.name);
    }
    holidaysCache.set(year, yearMap);
  }

  const key = formatDateKey(date);
  const name = yearMap.get(key);
  return {
    isHoliday: !!name,
    name,
  };
}

export function isHoliday(date: Date): boolean {
  return getHolidayInfo(date).isHoliday;
}

/**
 * Returns true if the date is a business day (neither weekend nor national/banking holiday).
 */
export function isBusinessDay(date: Date): boolean {
  return !isWeekend(date) && !isHoliday(date);
}

/**
 * Returns the same date if it is a business day, or advances forward to the next business day.
 */
export function getNextBusinessDay(date: Date): Date {
  let current = new Date(date);
  while (!isBusinessDay(current)) {
    current = addDays(current, 1);
  }
  return current;
}

/**
 * Calculates the next business due date for a boleto.
 * If the calculated due date falls on a weekend or a national/banking holiday,
 * it automatically rolls forward to the next business day.
 */
export function getNextBusinessDueDate(createdAt: Date, dueDay: number): Date {
  const day = Math.min(Math.max(dueDay, 1), 31);
  
  let targetMonth = createdAt.getMonth();
  let targetYear = createdAt.getFullYear();
  let due = new Date(targetYear, targetMonth, day);
  
  if (due.getMonth() !== targetMonth) {
    due = new Date(targetYear, targetMonth + 1, 0); // last day of target month
  }

  if (due.getTime() - createdAt.getTime() < 2 * 24 * 60 * 60 * 1000) {
    targetMonth += 1;
    if (targetMonth > 11) {
      targetMonth = 0;
      targetYear += 1;
    }
    due = new Date(targetYear, targetMonth, day);
    if (due.getMonth() !== targetMonth) {
      due = new Date(targetYear, targetMonth + 1, 0);
    }
  }

  while (!isBusinessDay(due)) {
    due = addDays(due, 1);
  }
  return due;
}

/**
 * Returns the next business due date formatted as YYYY-MM-DD.
 */
export function formatNextBusinessDueDate(createdAt: Date, dueDay: number): string {
  return format(getNextBusinessDueDate(createdAt, dueDay), "yyyy-MM-dd");
}

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

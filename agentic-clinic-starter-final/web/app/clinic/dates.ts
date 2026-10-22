import type { ClinicConfig } from "./types";

const DAY_MS = 86400000;

export const today = (timeZone = "America/Toronto") => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const part = (type: string) => parts.find((item) => item.type === type)?.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
};

export const nextBookingDate = (config: ClinicConfig) => {
  const current = today(config.timezone);
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: config.timezone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date());
  const hour = parts.find((item) => item.type === "hour")?.value || "00";
  const minute = parts.find((item) => item.type === "minute")?.value || "00";
  let date = current;
  if (`${hour}:${minute}` >= config.open) {
    date = new Date(new Date(`${current}T00:00:00Z`).getTime() + DAY_MS)
      .toISOString()
      .slice(0, 10);
  }
  for (let index = 0; index < 7; index++) {
    const day = new Date(`${date}T00:00:00Z`).getUTCDay() || 7;
    if (config.workingDays.includes(day)) return date;
    date = new Date(new Date(`${date}T00:00:00Z`).getTime() + DAY_MS)
      .toISOString()
      .slice(0, 10);
  }
  return date;
};

// First day of the week (per the clinic's week-start setting) containing `value`.
export const startOfWeek = (value: string, weekStart: number) => {
  const d = new Date(`${value}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() - weekStart + 7) % 7));
  return d.toISOString().slice(0, 10);
};

// Last date of a default recurrence starting on `date`.
export const defaultEndDate = (date: string, recurrenceWeeks: number) =>
  new Date(
    new Date(`${date}T00:00:00Z`).getTime() + (recurrenceWeeks - 1) * 7 * DAY_MS,
  )
    .toISOString()
    .slice(0, 10);

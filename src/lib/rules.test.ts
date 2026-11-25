import { describe, expect, it } from "vitest";
import { loginSchema, namesMatch, normalizePhone } from "./validation";
import { isStatusExpired, untilFromTime } from "./status";
import { currentClass, timesOverlap } from "./timetable";

describe("login rules", () => {
  it("normalises Indian phone formats to the same 10 digits", () => {
    expect(normalizePhone("+91 90000 00001")).toBe("9000000001");
    expect(normalizePhone("09000000001")).toBe("9000000001");
  });
  it("matches lecturer names ignoring titles and case", () => {
    expect(namesMatch("Dr. Ananya Rao", "ananya rao")).toBe(true);
    expect(namesMatch("Dr. Ananya Rao", "Ananya Iyer")).toBe(false);
  });
  it("rejects phone numbers shorter than 10 digits", () => {
    expect(loginSchema.safeParse({ name: "Riya", phone: "12345" }).success).toBe(false);
    expect(loginSchema.safeParse({ name: "Riya", phone: "9876543210" }).success).toBe(true);
  });
});

describe("availability rules", () => {
  const now = new Date(2026, 10, 17, 11, 0);
  it("treats a 'busy until' time in the past as ended", () => {
    expect(isStatusExpired(new Date(2026, 10, 17, 10, 30).toISOString(), now)).toBe(true);
    expect(isStatusExpired(new Date(2026, 10, 17, 12, 30).toISOString(), now)).toBe(false);
  });
  it("only accepts an 'until' time later than now", () => {
    expect(untilFromTime("10:00", now)).toBeNull();
    expect(untilFromTime("12:30", now)).not.toBeNull();
  });
});

describe("timetable rules", () => {
  it("detects overlapping classes", () => {
    expect(timesOverlap("09:00", "10:00", "09:30", "10:30")).toBe(true);
    expect(timesOverlap("09:00", "10:00", "10:00", "11:00")).toBe(false);
  });
  it("finds the class running right now", () => {
    const entries = [
      { id: "a", lecturer_id: "l", day_of_week: 2, start_time: "10:00:00", end_time: "12:00:00", subject: "DS Lab", room: "Lab 2" },
    ];
    expect(currentClass(entries, new Date(2026, 10, 17, 11, 0))?.subject).toBe("DS Lab"); // Tue
    expect(currentClass(entries, new Date(2026, 10, 17, 12, 0))).toBeUndefined();
  });
});

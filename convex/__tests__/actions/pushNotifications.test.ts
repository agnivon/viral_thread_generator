/// <reference types="vite/client" />
"use node";
import { expect, test, describe } from "vitest";
import { isWithinQuietHours } from "../../actions/pushNotifications";

describe("isWithinQuietHours", () => {
  test("returns false for invalid inputs", () => {
    expect(isWithinQuietHours(undefined, undefined)).toBe(false);
    expect(isWithinQuietHours("invalid", "invalid")).toBe(false);
    expect(isWithinQuietHours("25:00", "08:00")).toBe(false);
  });

  test("correctly identifies daytime quiet hours", () => {
    // 13:00 to 15:00
    const inRange = new Date("2026-09-14T14:30:00");
    const beforeRange = new Date("2026-09-14T12:59:00");
    const afterRange = new Date("2026-09-14T15:01:00");

    expect(isWithinQuietHours("13:00", "15:00", inRange)).toBe(true);
    expect(isWithinQuietHours("13:00", "15:00", beforeRange)).toBe(false);
    expect(isWithinQuietHours("13:00", "15:00", afterRange)).toBe(false);
  });

  test("correctly identifies overnight quiet hours spanning midnight", () => {
    // 22:00 to 08:00
    const lateNight = new Date("2026-09-14T23:30:00");
    const earlyMorning = new Date("2026-09-14T05:15:00");
    const midDay = new Date("2026-09-14T14:00:00");

    expect(isWithinQuietHours("22:00", "08:00", lateNight)).toBe(true);
    expect(isWithinQuietHours("22:00", "08:00", earlyMorning)).toBe(true);
    expect(isWithinQuietHours("22:00", "08:00", midDay)).toBe(false);
  });
});

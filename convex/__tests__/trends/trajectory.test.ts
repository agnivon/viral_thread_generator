import { describe, expect, it } from "vitest";
import { computeTrajectory, VelocitySnapshot } from "../../lib/trends/trajectory";

describe("computeTrajectory", () => {
  const baseTime = 1710000000000; // Fixed timestamp for deterministic testing

  it("classifies high-velocity trend as surging on initial evaluation", () => {
    const result = computeTrajectory({
      currentTraffic: 50000,
      currentGrowthRate: 500,
      startedAtMs: baseTime - 30 * 60 * 1000,
      now: baseTime,
    });

    expect(result.trajectoryStatus).toBe("surging");
    expect(result.acceleration).toBe(0);
    expect(result.growthDelta).toBe(0);
    expect(result.peakGrowthRate).toBe(500);
    expect(result.isSuppressedDueToDecay).toBe(false);
    expect(result.isCatalystReSpike).toBe(false);
    expect(result.updatedHistory).toHaveLength(1);
    expect(result.updatedHistory[0]).toEqual({
      evaluatedAt: baseTime,
      traffic: 50000,
      growthRate: 500,
    });
  });

  it("classifies breakout (+1000%) trend as surging on initial evaluation", () => {
    const result = computeTrajectory({
      currentTraffic: 80000,
      currentGrowthRate: 1000,
      startedAtMs: baseTime - 15 * 60 * 1000,
      now: baseTime,
    });

    expect(result.trajectoryStatus).toBe("surging");
    expect(result.peakGrowthRate).toBe(1000);
    expect(result.isSuppressedDueToDecay).toBe(false);
  });

  it("classifies moderate trend as steady on initial evaluation", () => {
    const result = computeTrajectory({
      currentTraffic: 15000,
      currentGrowthRate: 120,
      startedAtMs: baseTime - 45 * 60 * 1000,
      now: baseTime,
    });

    expect(result.trajectoryStatus).toBe("steady");
    expect(result.acceleration).toBe(0);
    expect(result.isSuppressedDueToDecay).toBe(false);
  });

  it("calculates positive acceleration and surging status on rising velocity", () => {
    const t0 = baseTime;
    const t1 = baseTime + 15 * 60 * 1000; // 15 min later (0.25h)

    const initialHistory: VelocitySnapshot[] = [
      { evaluatedAt: t0, traffic: 20000, growthRate: 200 },
    ];

    const result = computeTrajectory({
      currentTraffic: 45000,
      currentGrowthRate: 500,
      startedAtMs: t0 - 15 * 60 * 1000,
      now: t1,
      existingHistory: initialHistory,
      existingPeakGrowthRate: 200,
    });

    // delta = 500 - 200 = 300
    // deltaHours = 0.25h
    // acceleration = 300 / 0.25 = 1200
    expect(result.growthDelta).toBe(300);
    expect(result.acceleration).toBe(1200);
    expect(result.trajectoryStatus).toBe("surging");
    expect(result.peakGrowthRate).toBe(500);
    expect(result.isSuppressedDueToDecay).toBe(false);
    expect(result.updatedHistory).toHaveLength(2);
  });

  it("caps rolling velocity history at MAX_HISTORY_SNAPSHOTS (6)", () => {
    const history: VelocitySnapshot[] = [];
    for (let i = 0; i < 7; i++) {
      history.push({
        evaluatedAt: baseTime + i * 15 * 60 * 1000,
        traffic: 10000 + i * 5000,
        growthRate: 200 + i * 20,
      });
    }

    const result = computeTrajectory({
      currentTraffic: 50000,
      currentGrowthRate: 350,
      startedAtMs: baseTime,
      now: baseTime + 8 * 15 * 60 * 1000,
      existingHistory: history,
      existingPeakGrowthRate: 320,
    });

    expect(result.updatedHistory).toHaveLength(6);
    // The oldest entries should have been dropped
    expect(result.updatedHistory[result.updatedHistory.length - 1].growthRate).toBe(350);
  });

  it("detects decaying trend when mature and decelerating with sharp drop from peak", () => {
    const startedAt = baseTime - 3 * 60 * 60 * 1000; // Started 3 hours ago
    const tPrev = baseTime - 15 * 60 * 1000;

    const history: VelocitySnapshot[] = [
      { evaluatedAt: startedAt + 30 * 60 * 1000, traffic: 40000, growthRate: 800 },
      { evaluatedAt: tPrev, traffic: 50000, growthRate: 300 },
    ];

    const result = computeTrajectory({
      currentTraffic: 48000,
      currentGrowthRate: 120, // Dropped below 50% of peak (800 -> 120), growthDelta = -180
      startedAtMs: startedAt,
      now: baseTime,
      existingHistory: history,
      existingPeakGrowthRate: 800,
    });

    expect(result.trajectoryStatus).toBe("decaying");
    expect(result.isSuppressedDueToDecay).toBe(true);
    expect(result.isCatalystReSpike).toBe(false);
    expect(result.growthDelta).toBe(-180);
    expect(result.acceleration).toBeLessThan(0);
    expect(result.peakGrowthRate).toBe(800);
  });

  it("detects 2nd-wave catalyst re-spike when previously dormant trend suddenly erupts", () => {
    const startedAt = baseTime - 2.5 * 60 * 60 * 1000; // 2.5 hours ago
    const tPrev = baseTime - 15 * 60 * 1000;

    // Trend peaked initially, then cooled off to 100%
    const history: VelocitySnapshot[] = [
      { evaluatedAt: startedAt + 30 * 60 * 1000, traffic: 30000, growthRate: 600 },
      { evaluatedAt: tPrev, traffic: 40000, growthRate: 100 },
    ];

    // Sudden breakout surge (+1000% or +400%)
    const result = computeTrajectory({
      currentTraffic: 90000,
      currentGrowthRate: 450, // Delta = 450 - 100 = 350 (>= 250)
      startedAtMs: startedAt,
      now: baseTime,
      existingHistory: history,
      existingPeakGrowthRate: 600,
    });

    expect(result.trajectoryStatus).toBe("re_spiking");
    expect(result.isCatalystReSpike).toBe(true);
    expect(result.isSuppressedDueToDecay).toBe(false);
    expect(result.growthDelta).toBe(350);
    expect(result.acceleration).toBeGreaterThan(0);
  });

  it("detects 2nd-wave catalyst re-spike when jumping directly to breakout 1000%", () => {
    const startedAt = baseTime - 2 * 60 * 60 * 1000;
    const tPrev = baseTime - 15 * 60 * 1000;

    const history: VelocitySnapshot[] = [
      { evaluatedAt: startedAt + 30 * 60 * 1000, traffic: 25000, growthRate: 300 },
      { evaluatedAt: tPrev, traffic: 30000, growthRate: 150 },
    ];

    const result = computeTrajectory({
      currentTraffic: 80000,
      currentGrowthRate: 1000,
      startedAtMs: startedAt,
      now: baseTime,
      existingHistory: history,
      existingPeakGrowthRate: 300,
    });

    expect(result.trajectoryStatus).toBe("re_spiking");
    expect(result.isCatalystReSpike).toBe(true);
    expect(result.peakGrowthRate).toBe(1000);
  });
});

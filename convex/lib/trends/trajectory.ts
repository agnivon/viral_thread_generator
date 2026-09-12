export type TrajectoryStatus = "surging" | "steady" | "decaying" | "re_spiking";

export interface VelocitySnapshot {
  evaluatedAt: number;
  traffic: number;
  growthRate: number;
}

export interface TrajectoryInput {
  currentTraffic: number;
  currentGrowthRate: number;
  startedAtMs: number;
  now?: number;
  existingHistory?: VelocitySnapshot[];
  existingPeakGrowthRate?: number;
}

export interface TrajectoryResult {
  updatedHistory: VelocitySnapshot[];
  acceleration: number; // percentage points per hour (dGrowth/dt)
  growthDelta: number; // currentGrowthRate - previousGrowthRate
  trajectoryStatus: TrajectoryStatus;
  peakGrowthRate: number;
  isSuppressedDueToDecay: boolean;
  isCatalystReSpike: boolean;
}

const MAX_HISTORY_SNAPSHOTS = 6;

/**
 * Computes time-series velocity acceleration, rolling evaluation history,
 * and classifies trend trajectory into surging, steady, decaying, or re_spiking.
 */
export function computeTrajectory(input: TrajectoryInput): TrajectoryResult {
  const now = input.now ?? Date.now();
  const currentSnapshot: VelocitySnapshot = {
    evaluatedAt: now,
    traffic: input.currentTraffic,
    growthRate: input.currentGrowthRate,
  };

  const existingHistory = input.existingHistory ?? [];
  const peakGrowthRate = Math.max(
    input.currentGrowthRate,
    input.existingPeakGrowthRate ?? input.currentGrowthRate
  );

  const updatedHistory = [...existingHistory, currentSnapshot].slice(
    -MAX_HISTORY_SNAPSHOTS
  );

  const ageHours = Math.max(0.05, (now - input.startedAtMs) / (1000 * 60 * 60));

  // 1. Initial Evaluation (First time tracker observes this trend)
  if (existingHistory.length === 0) {
    const isHighVelocityInitial =
      input.currentGrowthRate >= 200 || input.currentGrowthRate === 1000;
    const initialStatus: TrajectoryStatus = isHighVelocityInitial
      ? "surging"
      : "steady";

    return {
      updatedHistory,
      acceleration: 0,
      growthDelta: 0,
      trajectoryStatus: initialStatus,
      peakGrowthRate,
      isSuppressedDueToDecay: false,
      isCatalystReSpike: false,
    };
  }

  // 2. Trajectory Evaluation across Time-Series Snapshots
  const prevSnapshot = existingHistory[existingHistory.length - 1];
  const deltaHours = Math.max(
    0.05,
    (now - prevSnapshot.evaluatedAt) / (1000 * 60 * 60)
  );

  const growthDelta = input.currentGrowthRate - prevSnapshot.growthRate;
  const acceleration = Number((growthDelta / deltaHours).toFixed(1));

  // Trajectory Classification:

  // A. Catalyst 2nd-Wave Re-Spike:
  // Trend has been active for at least 45 minutes or has multiple evaluations.
  // Prior growth had leveled off or subsided, but current growth suddenly erupted again.
  const isReSpike =
    (ageHours >= 0.75 || existingHistory.length >= 2) &&
    prevSnapshot.growthRate < 400 &&
    (growthDelta >= 250 ||
      (input.currentGrowthRate >= 1000 && prevSnapshot.growthRate < 800) ||
      (input.currentTraffic >= prevSnapshot.traffic * 1.8 &&
        input.currentGrowthRate >= 250));

  if (isReSpike) {
    return {
      updatedHistory,
      acceleration,
      growthDelta,
      trajectoryStatus: "re_spiking",
      peakGrowthRate,
      isSuppressedDueToDecay: false,
      isCatalystReSpike: true,
    };
  }

  // B. Decaying Peak:
  // Trend is mature (age >= 2 hours) and showing sustained deceleration or drop from peak
  const isDropFromPeak =
    peakGrowthRate >= 300 &&
    input.currentGrowthRate <= peakGrowthRate * 0.5 &&
    growthDelta < 0;

  const isOldDecelerating =
    ageHours >= 2.5 &&
    (input.currentGrowthRate < 150 || (acceleration <= -100 && growthDelta < 0));

  const isDecaying = isDropFromPeak || isOldDecelerating;

  if (isDecaying) {
    return {
      updatedHistory,
      acceleration,
      growthDelta,
      trajectoryStatus: "decaying",
      peakGrowthRate,
      isSuppressedDueToDecay: true,
      isCatalystReSpike: false,
    };
  }

  // C. Surging Momentum:
  // Positive acceleration or high velocity in early/mid lifecycle
  const isSurging =
    growthDelta > 20 ||
    input.currentGrowthRate >= 500 ||
    (input.currentGrowthRate >= 150 && ageHours <= 2.0 && growthDelta >= 0);

  if (isSurging) {
    return {
      updatedHistory,
      acceleration,
      growthDelta,
      trajectoryStatus: "surging",
      peakGrowthRate,
      isSuppressedDueToDecay: false,
      isCatalystReSpike: false,
    };
  }

  // D. Steady Momentum
  return {
    updatedHistory,
    acceleration,
    growthDelta,
    trajectoryStatus: "steady",
    peakGrowthRate,
    isSuppressedDueToDecay: false,
    isCatalystReSpike: false,
  };
}

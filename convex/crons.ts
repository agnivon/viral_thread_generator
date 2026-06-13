import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Run the refreshAllThreadsTokens action every 12 hours to refresh near-expiry tokens
crons.interval(
  "refresh-all-threads-tokens-12-hourly",
  { hours: 12 },
  internal.actions.tokensActions.refreshAllThreadsTokens,
  {}
);

export default crons;


import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Run the refreshThreadsToken action every hour to check if the token needs refresh
crons.interval(
  "refresh-threads-token-hourly",
  { hours: 1 },
  internal.actions.tokensActions.refreshThreadsToken,
  {}
);

export default crons;

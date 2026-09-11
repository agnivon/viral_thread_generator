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

// Run the purgeDismissed internal mutation daily to permanently hard-delete dismissed notifications older than 7 days
crons.interval(
  "purge-dismissed-notifications-daily",
  { hours: 24 },
  internal.notifications.purgeDismissed,
  { retentionDays: 7 }
);

// Scan real-time Google Trends every 15 minutes to detect emerging trends and alert users
// Execution is gated inside detectAndNotifyEmergingTrendsCron to skip in development environments
crons.interval(
  "detect-emerging-real-time-trends-15-min",
  { minutes: 15 },
  internal.actions.trendAlertActions.detectAndNotifyEmergingTrendsCron,
  {}
);

// Crons configuration
export default crons;

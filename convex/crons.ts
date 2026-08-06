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

const isDev = process.env.SITE_URL?.includes("localhost") || process.env.NODE_ENV === "development";

if (!isDev) {
  crons.interval(
    "fetch-currents-latest-news-daily",
    { hours: 24 },
    internal.actions.currentsNewsActions.fetchAndStoreLatestNews,
    {}
  );

  crons.interval(
    "delete-old-news-articles-daily",
    { hours: 24 },
    internal.actions.currentsNewsActions.deleteOldNewsArticles,
    {}
  );

  crons.interval(
    "fetch-newsdata-latest-news-daily",
    { hours: 24 },
    internal.actions.newsdataActions.fetchAndStoreLatestNews,
    {}
  );

  crons.interval(
    "delete-old-newsdata-articles-daily",
    { hours: 24 },
    internal.actions.newsdataActions.deleteOldNewsArticles,
    {}
  );
}

export default crons;



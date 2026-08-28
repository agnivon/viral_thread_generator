import { internalMutation } from "./_generated/server";
import { TableNames } from "./_generated/dataModel";

export const clearAll = internalMutation({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.db.query("users").collect();
    for (const u of users) await ctx.db.delete("users", u._id);

    const tablesToClear: TableNames[] = [
      "authAccounts",
      "authSessions",
      "authVerificationCodes",
      "authRateLimits",
      "authRefreshTokens",
    ];

    let clearedCount = 0;
    for (const tableName of tablesToClear) {
      try {
        const docs = await ctx.db.query(tableName).collect();
        for (const doc of docs) {
          await ctx.db.delete(tableName, doc._id);
          clearedCount++;
        }
      } catch (_e) {
        // Table might not exist or be unused
      }
    }

    return `Cleared ${users.length} users and ${clearedCount} auth records.`;
  },
});


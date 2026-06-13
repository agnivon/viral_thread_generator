import { internalMutation } from "./_generated/server";

export const clearAll = internalMutation({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.db.query("users").collect();
    for (const u of users) await ctx.db.delete("users", u._id);

    const accounts = await ctx.db.query("authAccounts" as any).collect();
    for (const a of accounts) await ctx.db.delete("authAccounts" as any, a._id);

    const sessions = await ctx.db.query("authSessions" as any).collect();
    for (const s of sessions) await ctx.db.delete("authSessions" as any, s._id);

    const hashes = await ctx.db.query("authPasswordHashes" as any).collect();
    for (const h of hashes) await ctx.db.delete("authPasswordHashes" as any, h._id);
    
    // also check authRefreshTokens and authVerifications if they exist
    try {
      const refresh = await ctx.db.query("authRefreshTokens" as any).collect();
      for (const r of refresh) await ctx.db.delete("authRefreshTokens" as any, r._id);
    } catch (_e) {
      // ignore
    }
    
    try {
      const verif = await ctx.db.query("authVerifications" as any).collect();
      for (const vRef of verif) await ctx.db.delete("authVerifications" as any, vRef._id);
    } catch (_e) {
      // ignore
    }

    return `Cleared ${users.length} users, ${accounts.length} accounts, ${sessions.length} sessions, ${hashes.length} hashes.`;
  },
});

import { internalMutation } from "./_generated/server";

export const clearAll = internalMutation(async (ctx) => {
  const users = await ctx.db.query("users").collect();
  for (const u of users) await ctx.db.delete(u._id);

  const accounts = await ctx.db.query("authAccounts" as any).collect();
  for (const a of accounts) await ctx.db.delete(a._id);

  const sessions = await ctx.db.query("authSessions" as any).collect();
  for (const s of sessions) await ctx.db.delete(s._id);

  const hashes = await ctx.db.query("authPasswordHashes" as any).collect();
  for (const h of hashes) await ctx.db.delete(h._id);
  
  // also check authRefreshTokens and authVerifications if they exist
  try {
    const refresh = await ctx.db.query("authRefreshTokens" as any).collect();
    for (const r of refresh) await ctx.db.delete(r._id);
  } catch(e) {}
  
  try {
    const verif = await ctx.db.query("authVerifications" as any).collect();
    for (const v of verif) await ctx.db.delete(v._id);
  } catch(e) {}

  return `Cleared ${users.length} users, ${accounts.length} accounts, ${sessions.length} sessions, ${hashes.length} hashes.`;
});

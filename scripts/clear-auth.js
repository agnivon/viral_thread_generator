const { execSync } = require('child_process');

try {
  console.log("Clearing all orphaned authentication records from the Convex database...");
  const cmd = `npx convex run clearAuth:clearAll`;
  
  const result = execSync(cmd, { stdio: 'pipe' }).toString();
  
  console.log(result.trim());
  console.log("");
  console.log("✅ Successfully cleared auth records!");
} catch (e) {
  console.error("❌ Failed to clear auth records.");
  if (e.stdout) console.log(e.stdout.toString());
  if (e.stderr) console.error(e.stderr.toString());
  process.exit(1);
}

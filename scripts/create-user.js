const { execSync } = require('child_process');

const args = process.argv.slice(2);
const isProd = args.includes('--prod');
// Filter out the --prod flag from positional arguments
const positionalArgs = args.filter(arg => arg !== '--prod');

const email = positionalArgs[0];
const password = positionalArgs[1];

if (!email || !password) {
  console.error("Usage: pnpm run create-user <email> <password> [--prod]");
  process.exit(1);
}

try {
  console.log(`Creating user with email: ${email} on ${isProd ? 'production' : 'development'}...`);
  const prodFlag = isProd ? ' --prod' : '';
  const cmd = `npx convex run${prodFlag} auth:signIn '{"provider": "password", "params": {"email": "${email}", "password": "${password}", "flow": "signUp"}}'`;
  
  execSync(cmd, { stdio: 'inherit' });
  
  console.log("");
  console.log(`✅ User successfully created in Convex (${isProd ? 'production' : 'development'})!`);
} catch (e) {
  console.error("❌ Failed to create user.");
  process.exit(1);
}

const { execSync } = require('child_process');

const email = process.argv[2];
const password = process.argv[3];

if (!email || !password) {
  console.error("Usage: pnpm run create-user <email> <password>");
  process.exit(1);
}

try {
  console.log(`Creating user with email: ${email}...`);
  // Run the convex run command with the necessary arguments to execute the signup flow
  const cmd = `npx convex run auth:signIn '{"provider": "password", "params": {"email": "${email}", "password": "${password}", "flow": "signUp"}}'`;
  
  execSync(cmd, { stdio: 'inherit' });
  
  console.log("");
  console.log("✅ User successfully created in Convex!");
} catch (e) {
  console.error("❌ Failed to create user.");
  process.exit(1);
}

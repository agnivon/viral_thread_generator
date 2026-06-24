"use node";

import { internalAction } from "../_generated/server";
import { checkpointSaver } from "../lib/agents/graph.js";

export const setupCheckpointer = internalAction({
  args: {},
  handler: async () => {
    console.log("Running checkpointer setup to create Postgres tables...");
    await checkpointSaver.setup();
    console.log("Checkpointer setup completed.");
  },
});

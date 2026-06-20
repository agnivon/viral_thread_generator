"use node";

import { NewsThreadFactoryGraph } from "./graph.js";

async function main() {
  const url = process.argv[2] || "https://example.com";
  console.log(`Starting viral thread factory for: ${url}\n`);

  const initialState = {
    url,
    raw_markdown: "",
    core_hooks: [],
    selected_hook: "",
    thread_draft: [],
    critique: "",
    iterations: 0,
    is_approved: false,
  };

  try {
    const finalState = await NewsThreadFactoryGraph.invoke(initialState);
    console.log("======================================");
    console.log("FINAL STATE:");
    console.log("======================================");
    console.log(`Is Approved: ${finalState.is_approved}`);
    console.log(`Iterations: ${finalState.iterations}`);
    console.log(`Selected Hook: ${finalState.selected_hook}`);
    console.log("\nTHREAD DRAFT:");
    finalState.thread_draft.forEach((post: string, i: number) => {
      console.log(`\n[Post ${i + 1}] (${post.length} chars)\n${post}`);
    });
    console.log("\nCRITIQUE:");
    console.log(finalState.critique);
  } catch (error) {
    console.error("Error running Thread Factory:", error);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  void main();
}

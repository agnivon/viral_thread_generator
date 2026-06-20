import { Workpool } from "@convex-dev/workpool";
import { components } from "../../_generated/api";

export const generationPool = new Workpool(components.generationPool, {
  maxParallelism: 5,
});

export const publicationPool = new Workpool(components.publicationPool, {
  maxParallelism: 5,
});

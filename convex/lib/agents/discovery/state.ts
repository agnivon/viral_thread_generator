"use node";

import { StateSchema } from "@langchain/langgraph";
import { z } from "zod";

export const DiscoveryAngleSchema = z.object({
  vector: z.string().describe("Forensic vector name (e.g. BOM Paradox, Engineering Compromise, etc.)"),
  surface_narrative: z.string().describe("Official marketing claim or consensus PR talking point"),
  forensic_reality: z.string().describe("Component costs, physical constraints, or court orders"),
  core_tension: z.string().describe("Acute contradiction between narrative and forensic reality"),
  primary_proof_sources: z.array(z.string()).describe("Citations, teardown reports, filings, or benchmark sources"),
});

export type DiscoveryAngle = z.infer<typeof DiscoveryAngleSchema>;

export const DiscoverySearchVectorSchema = z.object({
  vector: z.enum([
    "bom_paradox",
    "production_stagecraft",
    "supply_chain_arbitrage",
    "engineering_tradeoffs",
    "regulatory_asymmetry",
  ]),
  vector_name: z.string(),
  queries: z.array(z.string()).min(1).max(3),
});

export type DiscoverySearchVector = z.infer<typeof DiscoverySearchVectorSchema>;

export const DiscoveryEvidenceItemSchema = z.object({
  vector: z.string(),
  query: z.string(),
  title: z.string().optional(),
  url: z.string().optional(),
  snippet: z.string(),
  full_text: z.string().optional(),
  source: z.string().optional(),
});

export type DiscoveryEvidenceItem = z.infer<typeof DiscoveryEvidenceItemSchema>;

export const ExtractedTensionSchema = z.object({
  vector: z.string(),
  surface_narrative: z.string(),
  forensic_reality: z.string(),
  core_tension: z.string(),
  primary_proof_sources: z.array(z.string()),
  contradiction_score: z.number().min(1).max(10),
});

export type ExtractedTension = z.infer<typeof ExtractedTensionSchema>;

export const DiscoveryAgentState = new StateSchema({
  topic: z.string(),
  seed_claims: z.string().optional(),
  description: z.string().optional(),
  guidance: z.string().optional(),
  raw_markdown: z.string().optional(),
  search_vectors: z.array(DiscoverySearchVectorSchema).default(() => []),
  retrieval_evidence: z.array(DiscoveryEvidenceItemSchema).default(() => []),
  extracted_tensions: z.array(ExtractedTensionSchema).default(() => []),
  discovery_angles: z.array(DiscoveryAngleSchema).default(() => []),
  core_delta: z.string().optional(),
  research_dossier: z.string().default(""),
  parse_success: z.boolean().default(true),
  retries: z
    .object({
      hypothesizer: z.number().default(0),
      retrieval: z.number().default(0),
      tension: z.number().default(0),
      formulator: z.number().default(0),
    })
    .default({ hypothesizer: 0, retrieval: 0, tension: 0, formulator: 0 }),
  iterations: z.number().default(0),
  max_iterations: z.number().default(2),
});

export type DiscoveryAgentStateType = typeof DiscoveryAgentState.State;

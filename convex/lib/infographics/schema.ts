import { z } from "zod";

export const InfographicKPISchema = z.object({
  value: z.string().describe("Big stat/number, e.g. '$7bn', '9,000', '30%'"),
  label: z.string().describe("Short metric label, e.g. 'Reported lease term'"),
  subtext: z.string().optional().describe("Optional secondary detail"),
});

export const InfographicFlowStepSchema = z.object({
  title: z.string().describe("Step or decision title"),
  description: z.string().optional().describe("Key context or question/answer"),
});

export const InfographicEntityItemSchema = z.object({
  title: z.string().describe("Sub-entity or component name"),
  description: z.string().describe("One sentence role or description"),
});

export const InfographicEntityColumnSchema = z.object({
  name: z.string().describe("Column entity name, e.g. 'CVS Health'"),
  badge: z.string().optional().describe("Status badge, e.g. 'Would retain' or 'Independent'"),
  items: z.array(InfographicEntityItemSchema).min(1).max(5),
});

export const InfographicBarItemSchema = z.object({
  label: z.string().describe("Category or year label, e.g. '2025' or 'Issuer-frozen'"),
  value: z.number().describe("Numeric value for bar proportion, e.g. 41.45 or 103.7"),
  displayValue: z.string().describe("Formatted string with unit, e.g. '$41.45m' or '103.7'"),
  color: z.string().optional().describe("Optional hex color for the bar, e.g. '#0284c7'"),
});

export const InfographicBarChartSchema = z.object({
  title: z.string().describe("Chart title, e.g. 'Investment bitcoin valuation gain'"),
  subtitle: z.string().optional().describe("e.g. 'Pretax · no investment bitcoin sold'"),
  bars: z.array(InfographicBarItemSchema).min(1).max(4),
});

export const InfographicStatCalloutSchema = z.object({
  primaryStat: z.string().describe("Massive hero number, e.g. '1 in 10 billion' or '3.2σ'"),
  statLabel: z.string().describe("Hero label explaining the metric"),
  secondaryStat: z.string().optional().describe("Secondary comparison figure, e.g. '5σ'"),
  secondaryLabel: z.string().optional().describe("Comparison baseline label"),
  comparisonNote: z.string().optional().describe("Additional scientific or quantitative note"),
});

export const InfographicTakeawayBoxSchema = z.object({
  title: z.string().optional().describe("Callout title, e.g. 'Why payment timing matters'"),
  text: z.string().describe("Core takeaway or narrative insight (1-2 sentences)"),
});

export const InfographicSpecSchema = z.object({
  archetype: z.enum([
    "kpi_flow",
    "entity_comparison",
    "comparison_bars",
    "stat_callout",
    "custom_layout"
  ]).describe("Visual archetype best suited for this story"),
  kicker: z.string().describe("Category/topic tag in uppercase, e.g. 'ORACLE / TENCENT' or 'CVS PROPOSED SEPARATION'"),
  headline: z.string().describe("Punchy takeaway headline, e.g. '~$7bn lease cancelled, FT reports'"),
  subheading: z.string().describe("Contextual subhead explaining the tension or key fact"),
  
  kpiCards: z.array(InfographicKPISchema).max(4).optional(),
  flowSteps: z.array(InfographicFlowStepSchema).max(4).optional(),
  
  entityColumns: z.array(InfographicEntityColumnSchema).max(2).optional(),
  milestoneBadge: z.object({
    label: z.string(),
    value: z.string()
  }).optional(),
  
  barCharts: z.array(InfographicBarChartSchema).max(2).optional(),
  statCallout: InfographicStatCalloutSchema.optional(),
  
  takeawayBox: InfographicTakeawayBoxSchema.optional(),
  
  sourceCitation: z.string().describe("Accurate source attribution, e.g. 'Source: FT via Reuters, SEC 10-Q'"),
  notes: z.string().optional().describe("Methodology caveat or rounding note"),
});

export type InfographicSpec = z.infer<typeof InfographicSpecSchema>;

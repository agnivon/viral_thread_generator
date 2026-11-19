# Automated Editorial Infographics Engine

**Viral Thread Generator** features a built-in, server-side **Automated Editorial Infographics Engine**. When enabled, the engine synthesizes structured data visualizations, comparative breakdowns, timeline flows, and high-impact metric callouts directly from thread drafts and underlying research dossiers—rendering them into publication-ready, Retina-quality PNG images attached to the final social draft.

---

## 🏛️ Rendering Architecture

```
┌─────────────────────────────────┐
│       Thread & Research Dossier │
└────────────────┬────────────────┘
                 │
                 ▼
┌─────────────────────────────────┐
│     InfographicGeneratorNode    │
│  (Synthesizes Structured Spec)  │
│      Gemini / DeepSeek LLM      │
└────────────────┬────────────────┘
                 │ InfographicSpec JSON
                 ▼
┌─────────────────────────────────┐
│     Satori Layout Engine        │
│  (Converts HTML/CSS to SVG)     │
│   Bundled TTF Font Subsetting   │
└────────────────┬────────────────┘
                 │ Scalable Vector Graphic (SVG)
                 ▼
┌─────────────────────────────────┐
│       Resvg Compiler            │
│  (@resvg/resvg-js Native Node)  │
│    Renders 2x Retina PNG        │
└────────────────┬────────────────┘
                 │ Binary PNG Buffer
                 ▼
┌─────────────────────────────────┐
│      Convex File Storage        │
│  (Persistent CDN URL Generation)│
│  Prepends to Thread Images      │
└─────────────────────────────────┘
```

The rendering pipeline executes entirely on the server using headless, open-source libraries with zero dependency on third-party image generation APIs:
1. **Spec Generation (`InfographicGeneratorNode`)**: Analyzes the thread narrative and research dossier, selecting the optimal visual archetype and compiling key quantitative data into an `InfographicSpec`.
2. **Satori Virtual DOM (`convex/lib/infographics/renderer.ts`)**: Generates an SVG representation of the graphic using Flexbox CSS, responsive typography, and glassmorphic card elements.
3. **Resvg Native Compiler (`@resvg/resvg-js`)**: Compiles the SVG markup into a crisp PNG at 2x resolution (`1200 x 630` or `1200 x 1400` aspect ratios).
4. **Convex File Storage**: Stores the rendered binary buffer in Convex file storage (`ctx.storage.store`) and attaches the resulting public URL directly to the thread draft's media list.

---

## 🎨 The 5 Visual Archetypes

The engine supports 5 tailored visual archetypes defined in `convex/lib/infographics/schema.ts`:

### 1. KPI Flow (`kpi_flow`)
Best for chronological stories, breaking developments, and supply chain timelines:
- **Hero Metrics**: Up to 4 high-contrast KPI cards displaying large figures (e.g., `"$7bn"`, `"9,000"`, `"30%"`), labels, and contextual subtext.
- **Sequential Flow Steps**: Up to 4 ordered process or decision cards linked by directional indicators.
- **Takeaway Box**: Distinct highlighted callout summarizing the core strategic implication.

### 2. Entity Comparison (`entity_comparison`)
Best for head-to-head showdowns, corporate spinoffs, competitor alternatives, or architectural tradeoffs:
- **Two-Column Grid**: Side-by-side cards comparing entities (e.g., CVS Health vs. Spun-off Pharmacy Services).
- **Status Badges**: Distinct badges indicating disposition (e.g. `"Would retain"` vs. `"Independent"`).
- **Structured Rows**: 1 to 5 categorized item rows per column outlining roles, market caps, or technical differences.

### 3. Comparison Bars (`comparison_bars`)
Best for financial earnings, market share shifts, and quantitative performance benchmarks:
- **Proportional Horizontal Bars**: Up to 4 horizontal data bars with proportional width rendering.
- **Custom Color Accents**: Supports category-specific hex coloring (`#0284c7`, `#7c3aed`, `#10b981`).
- **Display Strings**: Explicit unit formatting (e.g., `"$41.45m"`, `"103.7σ"`).

### 4. Stat Callout (`stat_callout`)
Best for counterintuitive scientific discoveries or single massive data points:
- **Massive Hero Statistic**: Scaled typography for extreme numbers (e.g. `"1 in 10 billion"`, `"3.2σ"`).
- **Comparative Baseline**: Secondary comparison figures and labels providing immediate perspective.
- **Scientific Caveat**: Footnote section contextualizing sample size, variance, or methodology.

### 5. Custom Layout (`custom_layout`)
Combines multiple components (KPI cards, bar charts, and narrative callouts) for complex investigative stories.

---

## 📋 The `InfographicSpec` Schema

Defined in `convex/lib/infographics/schema.ts` and validated with Zod:

```typescript
export const InfographicSpecSchema = z.object({
  archetype: z.enum([
    "kpi_flow",
    "entity_comparison",
    "comparison_bars",
    "stat_callout",
    "custom_layout"
  ]),
  kicker: z.string().describe("Category/topic tag in uppercase, e.g. 'ORACLE / TENCENT'"),
  headline: z.string().describe("Punchy takeaway headline, e.g. '~$7bn lease cancelled, FT reports'"),
  subheading: z.string().describe("Contextual subhead explaining the tension or key fact"),
  
  kpiCards: z.array(InfographicKPISchema).max(4).optional(),
  flowSteps: z.array(InfographicFlowStepSchema).max(4).optional(),
  entityColumns: z.array(InfographicEntityColumnSchema).max(2).optional(),
  barCharts: z.array(InfographicBarChartSchema).max(2).optional(),
  statCallout: InfographicStatCalloutSchema.optional(),
  takeawayBox: InfographicTakeawayBoxSchema.optional(),
  
  sourceCitation: z.string().describe("Accurate source attribution, e.g. 'Source: FT via Reuters, SEC 10-Q'"),
  notes: z.string().optional().describe("Methodology caveat or rounding note"),
});
```

---

## 🔤 Font Subsetting & Remote CDN Fallback

Typography rendering requires accessible TrueType font data (`.ttf`):

1. **Local Bundled TTF**:
   The engine packages `Inter-Regular.ttf` in `convex/lib/infographics/assets/fonts/Inter-Regular.ttf`. During local execution or full deployments, this font is read synchronously from disk.
2. **Serverless CDN Download Fallback**:
   In lightweight serverless environments where local file assets may not be bundled in the isolate runtime, `convex/lib/infographics/font.ts` automatically downloads the font over HTTPS from Google Fonts CDN with in-memory array buffer caching, ensuring zero rendering crashes.

---

## ⚡ Runtime Configuration & Node 24 Externalization

Native compilation packages like `@resvg/resvg-js` contain platform-specific C++ binaries that cannot be bundled by standard JavaScript bundlers.

The repository configures `convex.json` at the root:

```json
{
  "node": {
    "version": "24",
    "externalPackages": ["@resvg/resvg-js"]
  }
}
```

This instructs the Convex deployment runtime to run on **Node.js 24** and treat `@resvg/resvg-js` as an external npm module, loading native pre-built bindings directly in production.

---

## 🔄 Lifecycle Integration & Iteration Re-rendering

The Infographics Engine integrates across the entire thread creation and iteration lifecycle:

1. **Graph Routing (`createRouteAfterCritic`)**:
   After `ViralityCriticNode` concludes and approves the draft (or hits maximum iterations), `createRouteAfterCritic` routes execution to `InfographicGeneratorNode` if `infographic_generation` is enabled.
2. **Draft Completion Handler (`handleGraphCompletion`)**:
   Upon graph completion, `handleGraphCompletion` evaluates whether the generated `infographic_spec` has been rendered into a PNG URL:
   - If no URL exists or if `infographic_spec` was modified during manual user iteration, it calls `renderInfographicToPng()`, stores the binary in `ctx.storage`, and saves `infographic_url`.
   - Automatically prepends the infographic URL as the primary hero image in `threadDrafts.images`.
3. **On-Demand Client Rendering**:
   If a draft contains a valid `infographic_spec` but the image has not yet been rendered, `InfographicDialog.tsx` offers one-click on-demand rendering using `api.actions.threads.renderInfographicAction`, allowing creators to preview and regenerate visuals instantly.
4. **Authenticated vs. Internal Actions**:
   - `renderInfographicAction`: Authenticated public action enforcing user ownership via `requireAuthUserId(ctx)` before updating draft records.
   - `renderInfographicInternal`: Unauthenticated internal action invoked securely by backend background workpools and crons.

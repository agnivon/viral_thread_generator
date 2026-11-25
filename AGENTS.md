<!-- convex-ai-start -->

This project uses [Convex](https://convex.dev) as its backend.

When working on Convex code, **always read
`convex/_generated/ai/guidelines.md` first** for important guidelines on
how to correctly use Convex APIs and patterns. The file contains rules that
override what you may have learned about Convex from training data.

Convex agent skills for common tasks can be installed by running
`npx convex ai-files install`.

- **Strict Type Safety**: Use Convex's schema definition to enforce strict type checking across all tables. Always import and use `v` validators (`convex/values`) to validate incoming arguments for queries, mutations, and actions.
- **Architecture Separation & AI Workflows**: Write queries and mutations for fast, deterministic database reads and writes. Always execute external network requests, LangChain/LangGraph agent pipelines, and LLM calls within Convex `actions` (or background `@convex-dev/workpool` jobs), never in queries or mutations.
- **Node Runtime in Actions**: Always add `"use node";` at the top of action files using Node.js modules or LangChain dependencies. Never add `"use node";` to files exporting queries or mutations.
- **Safe Schema Evolution**: Do not introduce breaking schema modifications without a migration strategy. Use dry runs and proper backfills (`@convex-dev/migrations`) when modifying structure or data types.
- **Server-Side Identity**: Derive authenticated identity strictly server-side via `ctx.auth.getUserIdentity()`. Never accept client-provided user IDs for authorization.
- **Mandatory Endpoint & Action Authorization**: Never skip protection on Convex actions, queries, or mutations. Any endpoint performing outbound network requests, scraping, LLM invocations, or data reads/mutations must strictly enforce authenticated identity server-side (`await requireAuthUserId(ctx)` or `await getAuthUserId(ctx)`). If there is ANY doubt or ambiguity about whether an endpoint or route should be public or protected, **stop and question the user at every opportunity** instead of leaving it unprotected.

<!-- convex-ai-end -->

## 1. Package Management & Tooling

- **Always use `pnpm`**: Never run package-level commands using `npm`, `yarn`, or `bun`.
  - Install dependencies: `pnpm install` / `pnpm add <package>`
  - Run development server: `pnpm dev`
  - Run CLI tools: `pnpm dlx` (e.g., `pnpm dlx shadcn@latest add ...`)
- **Repository Verification Commands**:
  - Type checking: `pnpm type-check` (`tsc --noEmit && tsc -p convex --noEmit`)
  - Linting: `pnpm lint`
  - Automated tests: `pnpm test` (`vitest run`)

---

## 2. Development & Build Workflow

- **Do not run full builds for minor UI/styling changes**:
  - Rely on Hot Module Replacement (HMR) and Fast Refresh in dev mode (`pnpm dev`) for UI, Tailwind CSS, or component adjustments.
  - Run `pnpm type-check` for fast static verification across Next.js and Convex.
  - Only invoke `pnpm build` when verifying production bundles, static optimization limits, or deployment readiness.

---

## 3. Grounded Research & Integration Integrity

- **Mandatory Research When Lacking Skills / MCPs**:
  - When working with third-party APIs (Meta Threads API, Firecrawl, Tavily, Jina Reader, Currents, NewsData, Cloudflare Turnstile) or evolving framework features where no dedicated skill/MCP exists, **actively inspect installed package declarations (`d.ts`), documentation, or live types**.
  - Never guess parameter names, endpoints, or response shapes based on outdated pre-trained memory.
- **Preserve Codebase Ground Truth (Model IDs, Endpoints & Constants)**:
  - **Never revert, downgrade, or replace modern identifiers configured in code with legacy training defaults.**
  - Respect exact model IDs in `convex/lib/agents/models.ts` (e.g. `gemini-4-hydrogen`, `gemini-3.8-flash`, `gemini-3.6-flash`, `gemini-3.5-flash-lite`, `gpt-5.4`, `gpt-5.4-mini`, `deepseek-flash`, `gemma-4-26b-a4b-it`). Do NOT revert to `gpt-3.5-turbo`, `gemini-pro`, or `gpt-4o-mini`.
  - Treat `.env.example`, service modules, and configuration files as authoritative over external assumptions.
- **Inspect Installed Package Versions**:
  - Check `package.json` to confirm versions (Next.js 16, React 19, Tailwind CSS v4, Convex 1.36+, TypeScript 6, Vitest 4) and utilize modern idioms rather than deprecated patterns.
- **Next.js 16 Middleware Standard (`proxy.ts`)**:
  - In Next.js 16, the legacy `middleware.ts` file convention is deprecated in favor of `proxy.ts`.
  - **Always maintain `proxy.ts`** at the project root (never `middleware.ts`) for edge routing, Convex Auth action proxying (`/api/auth`), and session cookie lifecycle management. Never rename `proxy.ts` back to `middleware.ts` or introduce duplicate middleware files.

---

## 4. Code Quality & TypeScript Standards

- **Clean, Concise, & Readable**: Prefer self-documenting code and clear intent over cleverness. Use early returns and guard clauses to simplify control flow.
- **Modular & Reusable Design**:
  - Extract single-responsibility components and isolate complex state/agent logic into custom hooks or helper utilities.
  - Keep LangGraph agent nodes (`ScraperNode`, `HookStrategistNode`, `ThreadWriterNode`, `ViralityCriticNode`, `ContextResearcherNode`) encapsulated and modular.
- **Leverage Modern Platform Features**: Use React 19 hooks, Next.js 16 Server Components, Tailwind CSS v4 variables, and existing `shadcn/ui` components without unnecessary custom wrappers.
- **Strict & Comprehensive Type Safety**:
  - **Zero `any` Policy**: Never use `any`, `as any`, or implicit `any`. Use `unknown` with type guards, Zod, or Convex `v` validators for dynamic data.
  - **Advanced TypeScript Capabilities**: Model domain state with generics, discriminated unions, `satisfies`, and utility types (`Record`, `Omit`, `Pick`, `Extract`, `readonly`).
  - **Exhaustive Matching**: Explicitly annotate function parameters, return types, component props, and API payloads. Enforce `never` pattern checks on union branches.
  - **Safe Type Narrowing**: Prefer `instanceof`, `typeof`, and custom type predicates over manual `as` casts.

---

## 5. Testing & Quality Assurance

- **Audit & Update Existing Tests for Feature Changes**:
  - When refactoring or updating existing features, search for associated tests (`convex/__tests__/**/*.test.ts`, `hooks/__tests__/**/*.test.ts`, `*.test.ts`, `*.spec.tsx`).
  - Update assertions and mocks to match modified contracts without silencing or skipping tests.
- **Proactively Add Tests for New Features**:
  - Write automated tests covering happy paths, critical edge cases, and failure modes.
  - Use `convex-test` with Vitest and `@edge-runtime/vm` for Convex functions.
- **Automated Verification**:
  - Run `pnpm test` and `pnpm type-check` before concluding tasks to guarantee regression-free code.

---

## 6. Environment Variables, Secrets & Boundaries

- **Environment Variable Synchronization**:
  - Whenever introducing or consuming an environment variable (`process.env.*`), immediately update `.env.example` with descriptive placeholder tokens (`your_api_key_here`, `dev:...`) and explanatory comments.
  - Keep `.env.local` synchronized to avoid silent runtime failures.
- **Client vs. Server Boundary**:
  - Only browser-safe variables may use `NEXT_PUBLIC_` (e.g. `NEXT_PUBLIC_CONVEX_URL`, `NEXT_PUBLIC_CLOUDFLARE_TURNSTILE_SITE_KEY`).
  - Sensitive provider keys (LLM keys, Threads App Secret, scraping tokens) must NEVER use `NEXT_PUBLIC_` or be imported into client components.
- **Never Commit Secrets**:
  - Never commit real credentials. All commits are validated via `secretlint` pre-commit hooks.

---

## 7. Workspace Cleanliness & Temporary Files

- **Delete Temporary & Scratch Files**: Always clean up temporary test scripts, scratch logs, or local JSON/CSV data dumps upon task completion.
- **Maintain Pristine Repository State**: Ensure no untracked, dangling test artifacts remain in source directories.
- **Use Dedicated Scratch Folders**: For persistent multi-step investigations, store files in the designated scratch directory (`<appDataDir>/brain/<conversation-id>/scratch/`).
- **Preserve Production Configs**: Never delete `.gitignore`, `tsconfig.json`, `package.json`, `components.json`, `.agents/`, or `AGENTS.md` unless explicitly instructed.

---

## 8. TanStack Query (React Query v5) Standards

- **Convex vs. TanStack Query Boundary**:
  - **Live Database Reads**: Always use Convex `useQuery` / `usePaginatedQuery` (`convex/react`). Never wrap live Convex queries in TanStack Query.
  - **Convex Actions & External APIs**: Use TanStack Query (`useQuery`, `useInfiniteQuery`, `useMutation`) for Convex actions (`useAction`), third-party REST endpoints, and scraping/AI pipelines that benefit from client caching, debouncing, or retry handling.
- **Type-Safe Query Key Factories**:
  - Never use raw, unstructured string arrays for query keys. Define structured query key objects with explicit tuples (`as const`).
- **Strict Query Function Typing**:
  - Always explicitly type `queryFn` return types, parameters, and mutation payloads. Avoid `any` in callbacks (`onSuccess`, `onError`).
- **Query Cache Invalidation**:
  - Prefer invalidating queries (`queryClient.invalidateQueries({ queryKey: ... })`) over manual, deeply nested cache mutations (`queryClient.setQueryData`), unless performing structured optimistic updates.

---

## 9. React Hook Form & Validation Standards

- **Mandatory Usage for Complex Forms**:
  - **Always use `react-hook-form`** for complex forms—defined as any form containing multiple interdependent fields, dynamic lists/arrays (e.g. multi-post thread editors), multi-step wizard flows, schema-validated payloads, or integrations with dialogs and custom Radix/Shadcn UI controls.
  - Never manage complex or multi-field form state using fragmented `useState` hooks or manual change-handler sprawl.
  - Trivial single-field inputs (such as an isolated search bar or quick toggle) may use minimal local state, but all structured data-entry flows MUST use `react-hook-form`.
- **Schema-Driven Form Validation**:
  - Pair `react-hook-form` with `zod` and `@hookform/resolvers/zod` when managing structured multi-field form inputs.
- **Controlled Component Boundaries**:
  - Use native `register()` for standard HTML `<input>`, `<textarea>`, and `<select>`.
  - Always use `Controller` or Shadcn's `<FormField>` for custom/Radix UI components (Select, Checkbox, Switch, Combobox, Tabs).
- **Performance & Re-render Optimization**:
  - Avoid calling root-level `watch()` across large parent forms. Use `useWatch({ control, name })` inside isolated sub-components to limit re-render scope (e.g. character counters, live URL preview cards).
  - Use `useFieldArray` for dynamic lists (such as multi-post thread editors) instead of manual string index manipulation.
- **Clean Form Resetting & Default Values**:
  - Always provide complete `defaultValues` matching the form data shape.
  - When syncing server data (e.g. thread draft loading), call `reset(newData)` inside an effect with proper dependency tracking.

---

## 10. Hygienic File Structure & Architecture Standards

- **Convex Domain Cohesion at Root**:
  - Keep domain queries and mutations for a specific table together in unified domain modules at `convex/` root (e.g. `convex/threads.ts`, `convex/tokens.ts`, `convex/trendAlerts.ts`).
  - **Never create fragmented `queries/` and `mutations/` folders**: Splitting queries and mutations into role-based subdirectories introduces verbosity, naming stutter (`api.queries.threadsQueries`), and doubles the number of files needed to manage a single entity.
- **Convex Action Naming & Placement**:
  - Convex actions requiring the Node.js runtime (`"use node";`), LangChain agents, or external network calls must live in `convex/actions/`.
  - **No Redundant Suffixes**: Never append `*Actions.ts` to action files. Use clean, canonical domain names (`convex/actions/threads.ts`, `convex/actions/googleTrends.ts`, `convex/actions/tokens.ts`).
- **Consolidated External Service Clients**:
  - All third-party REST, scraping, or SDK clients must be placed directly under `convex/lib/clients/` (e.g. `threads.ts`, `brave.ts`, `jina.ts`).
  - **No Redundant Single-File Directories**: Never create isolated, single-file subdirectories for a service client (e.g. do not create `convex/lib/brave/api.ts` or `convex/lib/jina/api.ts`).
  - **No Unsafe Barrel Exports Bridging Runtimes**: Avoid barrel files in `convex/lib/clients/` that combine Node-only modules with V8 modules, as this triggers bundler conflicts in Convex's default runtime.
- **Strict Test File Isolation**:
  - **No Test Files in Production Source Folders**: Never place `.test.ts`, `.spec.ts`, or test mock files directly in `convex/` root, `convex/actions/`, `convex/lib/`, or `hooks/`.
  - **Private Underscore Folders for Convex Tests**: All Convex tests must reside inside `convex/__tests__/` (e.g. `convex/__tests__/actions/`, `convex/__tests__/agents/`, `convex/__tests__/lib/`, `convex/__tests__/`). Directories prefixed with an underscore are strictly private and ignored by Convex API route generation.
  - **Frontend Hook Tests**: Isolated custom hook tests must reside in `hooks/__tests__/`.
- **Zero Orphaned or Lingering Artifacts**:
  - When refactoring, moving, or consolidating code, immediately delete obsolete directories, old files, and dead re-exports. Never leave lingering or deprecated duplicates in the tree.

---

## 11. Mandatory Endpoint & Action Authorization Standards

- **Zero Unauthenticated Public Endpoints by Default**:
  - Never leave public Convex actions, queries, or mutations unprotected unless they are explicitly designed, documented, and verified to be public resources (e.g. initial login credentials verification).
  - Any endpoint performing external network requests, outbound scraping (e.g. URL metadata fetching), LLM invocations, database reads, or database mutations MUST enforce authenticated identity server-side via `requireAuthUserId(ctx)` or `getAuthUserId(ctx)`.
- **Proactive Questioning on Ambiguity**:
  - If there is EVER any ambiguity, uncertainty, or doubt regarding whether an endpoint, action, query, or route should be public or protected, **agents MUST NOT make assumptions or leave it open**.
  - **Stop and question the user at every opportunity** to clarify the security and authorization requirements before writing or leaving unprotected endpoints.
- **Idiomatic Reactive Client Protection**:
  - Protected Next.js pages under `app/(protected)/` must be Client Components (`"use client"`) wrapped by `<AuthGuard>` to avoid Server Component parallel SSR execution pitfalls without reintroducing brittle edge middleware 307 redirect loops.

---

## 12. LangChain Structured Output & Provider Strategy Standards

Always distinguish **`createAgent` / `buildAgents` multi-turn pipelines** (`providerStrategy` vs. `toolStrategy`) from **direct `withStructuredOutput` model chains** (`functionCalling` vs. `jsonMode` vs. `jsonSchema`). Never swap these across thinking and non-thinking model variants without verifying provider SDK behavior in `node_modules/`.

### A. `createAgent` / `buildAgents` (`ProviderResponseFormat`)
- **Gemini with Thinking (`thinkingLevel: "high"` / `"low"`) — `toolStrategy` is MANDATORY**:
  - Always partition thinking Gemini agents with `google: toolStrategy(schema)` in `buildAgents`.
  - *Why:* `@langchain/google` emits thought parts as `{ thought: true, type: "text", text: "..." }` at index `0` of `AIMessage.content`, and `langchain`'s `ProviderStrategy.parse` breaks on the first `type: "text"` block without skipping `thought: true`—causing `JSON.parse` to fail on reasoning text and throw `StructuredOutputParsingError`. `toolStrategy` extracts arguments cleanly from `tool_calls`.
- **Gemini without Thinking (`thinkingLevel: "off"`) — Use `providerStrategy`**:
  - Partition non-thinking Flash-Lite agents with `google: providerStrategy(schema)`, which binds native `responseSchema` (`generationConfig.responseMimeType = "application/json"` + `responseJsonSchema`). Use `toolStrategy` only if you specifically need multi-schema unions or `handleError` retry loops.
- **DeepSeek (`ChatDeepSeek`) with `createAgent` — `providerStrategy` + `json_object` kwargs is MANDATORY in this codebase**:
  - Always pair `deepseek: providerStrategy(schema)` with DeepSeek instances configured with `modelKwargs: { ..., response_format: { type: "json_object" } }` and explicit JSON schema instructions in the prompt.
  - *Why `json_object` is mandatory:* `AgentNode` emits `response_format: { type: "json_schema" }` for `providerStrategy`, which DeepSeek does not support (`@langchain/deepseek` does not support `json_schema`). Because `ChatOpenAICompletions.invocationParams` spreads `...this.modelKwargs` *after* `options.response_format`, `modelKwargs.response_format: { type: "json_object" }` overrides `json_schema` on the wire while DeepSeek isolates thinking tokens in `additional_kwargs.reasoning_content`.
  - *Why `toolStrategy` is avoided:* `toolStrategy` forces `tool_choice: "any"` (`"required"`) and loops assistant `tool_calls` turns back on schema validation errors, but `@langchain/openai`'s `convertMessagesToCompletionsMessageParams` drops `additional_kwargs.reasoning_content`, triggering DeepSeek HTTP 400 errors in thinking mode (`reasoning_content` missing) and `tool_choice` restrictions. (Even though non-thinking DeepSeek supports tool calling at the raw API level, all `createAgent` DeepSeek agents standardize on `providerStrategy` + `json_object`.)

### B. Direct `withStructuredOutput` Chains (Single-Turn, outside `createAgent`)
- **Gemini with Thinking (`thinkingLevel: "high"` / `"low"`) — `method: "functionCalling"` is MANDATORY**:
  - *Why:* `BaseChatGoogle.withStructuredOutput` falls `"jsonMode"` back to `"jsonSchema"`, and `"jsonSchema"` parses `AIMessage.text`. `BaseMessage.text` concatenates all `{ type: "text" }` blocks—including `{ thought: true }` blocks—corrupting JSON parsing. `method: "functionCalling"` reads `functionCall.args` directly from `tool_calls`. (Keep Gemini tool parameter limits in mind: `schemaToGeminiParameters` strips `additionalProperties` and rejects multi-branch union types.)
- **Gemini without Thinking (`thinkingLevel: "off"`)**:
  - Prefer `method: "jsonSchema"` for native `responseSchema` enforcement (or `method: "functionCalling"` in cross-provider chains). Do not rely on `method: "jsonMode"` on `ChatGoogle`, as it logs a warning and falls back to `"jsonSchema"`.
- **DeepSeek with Thinking (`thinking: { type: "enabled" }`) — `method: "jsonMode"` is MANDATORY**:
  - *Why:* DeepSeek does not support `method: "jsonSchema"`, and `method: "functionCalling"` forces a named client function via `tool_choice: { type: "function", function: { name } }`, which DeepSeek thinking mode rejects/disallows. `method: "jsonMode"` sends `response_format: { type: "json_object" }`, keeps reasoning in `additional_kwargs.reasoning_content`, and validates `content` client-side (prompts MUST explicitly instruct JSON output matching the schema).
- **DeepSeek without Thinking (`thinking: { type: "disabled" }`)**:
  - Either `method: "jsonMode"` (preferred) or `method: "functionCalling"` works when thinking is disabled. Never pass `strict` alongside `method: "jsonMode"`.

### C. Unstructured Text / Markdown & OpenAI Guardrails
- **Unstructured DeepSeek Scraper / Text Models**:
  - NEVER set `response_format: { type: "json_object" }` in `modelKwargs` on plain-text/Markdown models (e.g. `deepSeekFlashT01ReasoningNone`, `deepSeekFlashT01TextReasoningHigh`), regardless of thinking mode. Enforced by `convex/__tests__/agents/nodes.test.ts`.
- **OpenAI `modelKwargs` Hazard**:
  - Never put `response_format: { type: "json_object" }` inside `modelKwargs` on OpenAI models intended for `jsonSchema` or `providerStrategy`, as `...this.modelKwargs` silently overwrites `type: "json_schema"`.




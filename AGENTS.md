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
  - Respect exact model IDs in `convex/lib/agents/models.ts` (e.g. `gemini-3.8-flash`, `gemini-3.7-flash`, `gemini-3.5-flash-lite`, `gpt-5.4`, `gpt-5.4-mini`, `deepseek-v4-pro`, `gemma-4-26b-a4b-it`). Do NOT revert to `gpt-3.5-turbo`, `gemini-pro`, or `gpt-4o-mini`.
  - Treat `.env.example`, service modules, and configuration files as authoritative over external assumptions.
- **Inspect Installed Package Versions**:
  - Check `package.json` to confirm versions (Next.js 16, React 19, Tailwind CSS v4, Convex 1.36+, TypeScript 6, Vitest 4) and utilize modern idioms rather than deprecated patterns.

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
  - When refactoring or updating existing features, search for associated tests (`convex/**/*.test.ts`, `*.test.ts`, `*.spec.tsx`).
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


<!-- convex-ai-start -->

This project uses [Convex](https://convex.dev) as its backend.

When working on Convex code, **always read
`convex/_generated/ai/guidelines.md` first** for important guidelines on
how to correctly use Convex APIs and patterns. The file contains rules that
override what you may have learned about Convex from training data.

Convex agent skills for common tasks can be installed by running
`npx convex ai-files install`.

- **Strict Type Safety**: Use Convex's schema definition to enforce strict type checking across all tables. Always import and use `v` validators (`convex/values`) to validate incoming arguments for queries, mutations, and actions.
- **Architecture Separation**: Write queries and mutations for fast, deterministic database reads and writes. Use Convex actions for any side-effects, long-running processes, external network requests, or operations using non-deterministic inputs (like dates or random numbers).
- **Safe Schema Evolution**: Do not introduce breaking schema modifications without a migration strategy. Use dry runs and proper backfills when modifying structure or data types in production collections.

<!-- convex-ai-end -->

## Package Management
- **Always use `pnpm`**: Never run package-level commands using `npm`, `yarn`, or `bun`.
  - Use `pnpm install` to add/update dependencies.
  - Use `pnpm dev` for running the dev environment and `pnpm build` for building the app.
  - Run CLI commands via `pnpm dlx` (e.g. `pnpm dlx shadcn@latest add ...` instead of `npx shadcn@latest add ...`).
  - This ensures workspace consistency, avoids conflicts, and leverages `pnpm`'s efficient hard-linked store and lockfile features.

## Development & Build Workflow
- **Do not run builds to test minor UI changes**: 
  - Rely entirely on Hot Module Replacement (HMR) and Fast Refresh in the local dev server (`pnpm dev`) for styling adjustments, HTML structure edits, or minor UI logic changes.
  - Only invoke `pnpm build` (or similar build commands) when validating production bundles, verifying type check compilation, profiling performance, or preparing for actual deployment.

## Code Quality & Architecture
- **Clean, Concise, Elegant, & Readable Code**:
  - Prefer readability over cleverness. Write code that describes its intent.
  - Avoid deeply nested logic structures; use early returns and guard clauses to simplify control flow.
  - Omit redundant or dead code, and keep comment blocks focused on explaining the *why* rather than the *what*.
- **Modular & Reusable Design**:
  - Break monolithic files and UI components into small, cohesive, single-responsibility functions or components.
  - Extract complex local UI state logic or fetching logic into custom React hooks or utility helper modules to decouple UI presentation from business logic.
  - Design interfaces and props clearly, ensuring reusable components are highly composable and easily customizable.
- **Leverage Native Framework & Library Capabilities**:
  - Fully utilize modern platform features (e.g., React Server Components (RSC) where appropriate, React 19 hooks like `use()`, Tailwind CSS variables, etc.) rather than introducing custom, non-standard solutions.
  - Do not reinvent the wheel: reuse utilities, styles, and patterns already configured within the project.
- **Strict & Comprehensive Type Safety**:
  - **Zero `any` Policy**: Never use `any`, `as any`, or implicit `any`. If a type is unknown or dynamic, use `unknown` accompanied by type guards, runtime validators (`v` validators / `zod`), or narrow union types.
  - **Leverage Advanced TypeScript Capabilities**: Use generics, discriminated (tagged) unions, `satisfies` operators, utility types (`Record`, `Omit`, `Pick`, `Extract`), and `readonly` modifiers to model precise domain state and data contracts.
  - **Exhaustive Handling & Strict Signatures**: Explicitly annotate function parameters, return types, component props, and API payloads. Use `never` pattern checks for exhaustive matching across union variants.
  - **Avoid Unsafe Type Assertions**: Prefer type narrowing (e.g. `instanceof`, `typeof`, custom type predicates `isType`) over blanket `as` type casts.


## Workspace Cleanliness & Temporary Files
- **Delete Temporary and Scratch Files**: Always clean up any temporary scripts (e.g., test Python scripts, scratch Javascript/Typescript files, shell scripts), temporary log files, local JSON/CSV data dumps, or unused lockfiles created during the execution of a task.
- **Maintain Pristine Repository State**: Ensure no trailing uncommitted, unused, or test-related files remain in the workspace root or source directories prior to completing a task. Avoid polluting the repository workspace.
- **Use Dedicated Scratch Folders**: For any temporary testing/investigation files that must persist across steps but are not part of the project itself, use the designated artifacts scratch directory (`<appDataDir>/brain/<conversation-id>/scratch/`) rather than the workspace root.
- **Keep Production Configs**: Never delete workspace configuration files (like `.gitignore`, `tsconfig.json`, `package.json`, `.agents/`, `AGENTS.md`) unless explicitly requested.


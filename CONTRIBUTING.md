# Contributing to Viral Thread Generator

Thank you for your interest in contributing to **Viral Thread Generator**! We welcome contributions of all kinds: bug reports, documentation updates, feature requests, and code contributions.

Please take a moment to review this document to ensure a smooth and pleasant contribution experience.

---

## Code of Conduct

By participating in this project, you agree to abide by our [Code of Conduct](CODE_OF_CONDUCT.md). Please report any unacceptable behavior to [support@viralthreadgenerator.com](mailto:support@viralthreadgenerator.com).

---

## Getting Started

### 1. Prerequisites
Ensure you have the following installed locally:
- **Node.js**: `v20.0.0` or higher
- **pnpm**: `v10.0.0` or higher (`npm install -g pnpm`)
- **Git**
- *(Optional)* A free [Convex account](https://convex.dev) if you wish to run a live development cloud backend.

### 2. Fork and Clone
```bash
git clone https://github.com/agnivon/viral_thread_generator.git
cd viral_thread_generator
```

### 3. Install Dependencies
```bash
pnpm install
```

### 4. Configure Environment
Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```
Configure your credentials in `.env.local`. For running automated tests (`pnpm test`), no live API keys are required as all external services are mocked.

---

## Development Workflow

### Running Locally
To launch both the Next.js frontend and Convex backend in parallel:
```bash
pnpm dev
```
- Next.js will be running at `http://localhost:3000`
- Convex functions and database dashboard will be active in your terminal

### Quality Checks
Before submitting your changes, run our verification commands:

| Check | Command | Description |
| :--- | :--- | :--- |
| **Type Check** | `pnpm type-check` | Runs `tsc --noEmit` across Next.js and Convex |
| **Linter** | `pnpm lint` | Runs Convex type check and ESLint with strict 0-warnings tolerance |
| **Unit Tests** | `pnpm test` | Runs the full Vitest automated test suite |
| **Secret Lint** | `pnpm exec secretlint "**/*"` | Audits code for accidentally exposed secrets |

---

## Coding Standards

- **TypeScript Strictness**:
  - We enforce a **Zero `any` Policy**. Use `unknown` with type narrowing, Zod schemas, or Convex `v` validators for dynamic data.
  - Maintain complete type safety across component props, server actions, and Convex query/mutation payloads.
- **Convex Architecture**:
  - Keep deterministic database reads and writes in Convex queries and mutations.
  - Execute all external network calls, LLM invocations, and agent pipelines in Convex actions (`convex/actions/`) or background workpools.
  - Enforce server-side authentication (`requireAuthUserId(ctx)`) on all non-public endpoints.
- **Styling**:
  - Use Tailwind CSS v4 utility classes and Radix UI / Base UI primitives.
  - Respect the design system defined in [DESIGN.md](DESIGN.md).

---

## Submitting a Pull Request

1. **Create a branch**:
   ```bash
   git checkout -b feat/your-feature-name
   # or
   git checkout -b fix/your-bug-description
   ```
2. **Commit your changes**:
   We encourage [Conventional Commits](https://www.conventionalcommits.org/):
   - `feat(...)`: New features
   - `fix(...)`: Bug fixes
   - `refactor(...)`: Code refactoring without behavior changes
   - `docs(...)`: Documentation updates
   - `test(...)`: Adding or updating test cases
   - `chore(...)`: Tooling, dependency, or configuration updates
3. **Run all checks**:
   ```bash
   pnpm type-check && pnpm lint && pnpm test && pnpm exec secretlint "**/*"
   ```
4. **Push and open a PR**:
   Push your branch to your fork and submit a PR to the `main` branch. Fill out the PR template with a clear description of your changes.

---

## Reporting Issues & Feature Requests

- **Bugs**: Use our [Bug Report Template](https://github.com/agnivon/viral_thread_generator/issues/new?template=bug_report.yml). Please include reproducible steps, system details, and error logs.
- **Features**: Use our [Feature Request Template](https://github.com/agnivon/viral_thread_generator/issues/new?template=feature_request.yml). Explain the problem you are solving and the proposed solution.

---

## Questions?

Feel free to open a GitHub Discussion or submit an issue with questions regarding development or architecture!

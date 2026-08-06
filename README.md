# 🚀 Viral Thread Generator

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Next.js](https://img.shields.io/badge/Next.js-16-black)](https://nextjs.org/)
[![Convex](https://img.shields.io/badge/Convex-Backend-orange)](https://convex.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-Strict-blue)](https://www.typescriptlang.org/)
[![pnpm](https://img.shields.io/badge/pnpm-10.4.1-lightgrey)](https://pnpm.io/)

An AI-powered full-stack application built to generate, optimize, and automatically publish viral social media threads using multi-model AI workflows, real-time web research, and the Meta Threads API.

---

## ✨ Features

- 🧠 **Multi-Model LLM Workflows**: Powered by LangChain and LangGraph with seamless support for **OpenAI**, **DeepSeek**, **Google Gemini**, and **OpenRouter**.
- 🔍 **Real-Time Web Research & Scraping**: Automatically gathers context and trending news using **Firecrawl**, **Tavily AI**, **Jina Reader**, **Currents API**, and **NewsData API**.
- ⚡ **Real-Time Backend**: Built on **Convex** for low-latency reactive database queries, real-time subscriptions, schema enforcement, and cron jobs.
- 📱 **Meta Threads Integration**: Authenticate with Threads and schedule or publish generated threads directly to Meta Threads.
- 🔒 **Authentication & Bot Protection**: Secure login flows powered by Convex Auth and Cloudflare Turnstile anti-bot verification.
- 🛠️ **Developer Tooling**: Fully typed with TypeScript, ESLint 9, secret linting (`secretlint`), and automated testing via Vitest & Convex Test.

---

## 🏗️ Tech Stack

- **Frontend**: Next.js 16 (App Router), React 19, Tailwind CSS 4, Radix UI / base-ui
- **Backend & Database**: Convex (Queries, Mutations, Actions, Crons, Auth)
- **AI Agent Framework**: `@langchain/core`, `@langchain/langgraph`, `@langchain/openai`, `@langchain/google`, `@langchain/deepseek`
- **Package Manager**: `pnpm` (v10+)
- **Security & Quality**: Secretlint, ESLint 9, TypeScript (Strict Mode), Vitest

---

## 🚀 Getting Started

### Prerequisites

Ensure you have the following installed:
- **Node.js**: v20 or higher
- **pnpm**: v10 or higher (`npm install -g pnpm`)

---

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/viral_thread_generator.git
cd viral_thread_generator
```

### 2. Install Dependencies

```bash
pnpm install
```

### 3. Configure Environment Variables

Copy the `.env.example` template to `.env.local`:

```bash
cp .env.example .env.local
```

Open `.env.local` and configure your API keys:
- Set your Convex deployment variables (run `pnpm convex dev` to auto-create a development deployment).
- Add key(s) for your preferred AI provider(s) (OpenAI, DeepSeek, Google AI, or OpenRouter).
- Add scraping/search API keys (Firecrawl, Tavily).

---

### 4. Start Development Server

Run both the Next.js frontend and Convex backend concurrently:

```bash
pnpm dev
```

This starts:
- Next.js frontend at `http://localhost:3000`
- Convex dev backend & local dashboard

---

## 📜 Available Scripts

| Script | Description |
| :--- | :--- |
| `pnpm dev` | Run Next.js frontend and Convex backend in parallel |
| `pnpm build` | Build production Next.js application |
| `pnpm start` | Start production Next.js server |
| `pnpm lint` | Run ESLint, Convex TypeScript checks, and strict warnings audit |
| `pnpm test` | Run unit & integration tests via Vitest |
| `pnpm exec secretlint "**/*"` | Scan workspace for exposed secrets or API keys |

---

## 📁 Project Structure

```text
viral_thread_generator/
├── app/                  # Next.js 16 App Router (pages, layouts, actions, CSS)
├── components/           # Reusable UI components & shadcn UI blocks
├── convex/               # Convex backend (schema, queries, mutations, actions, crons)
│   ├── actions/          # Convex Actions (external network calls, LLM execution)
│   ├── mutations/        # Database mutations
│   ├── queries/          # Database queries
│   ├── schema.ts          # Strictly typed Convex database schema
│   └── *.test.ts         # Vitest suite for Convex backend logic
├── hooks/                # Custom React hooks
├── lib/                  # Shared utilities and helper functions
├── scripts/              # Setup & administrative node scripts
├── .env.example          # Environment variable template
├── LICENSE               # MIT Open Source License
└── package.json          # Dependencies and scripts configuration
```

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Run Linter & Tests (`pnpm lint && pnpm test`)
5. Push to the Branch (`git push origin feature/AmazingFeature`)
6. Open a Pull Request

---

## 📄 License

Distributed under the MIT License. See [`LICENSE`](LICENSE) for more information.

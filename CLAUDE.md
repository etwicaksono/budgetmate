# Claude Flow Configuration – Finance Web (Next.js)

## Project Overview
You are assisting on an existing production-grade web app called **Finance Web**.
The app is a frontend for various finance-related services and APIs.

The primary goal:  
Help the developer refactor, extend, and maintain this Next.js app safely, without breaking existing behavior.

## Tech Stack
- Framework: Next.js (App Router or Pages Router – infer from `app/` or `pages/`)
- Language: TypeScript (prefer) or JavaScript (follow existing files)
- Styling: Tailwind CSS (if `tailwind.config.ts/js` exists) or existing CSS modules
- State management: Follow current patterns (Context / Zustand / Redux / etc.)
- Backend: Talks to internal Finance APIs (do not invent random external APIs)

When unsure, **ask before inventing new technologies or libraries**.

## Architecture Rules
1. Keep business logic out of React components when possible.  
   Prefer helpers in `lib/` or server actions for data-heavy logic.
2. Reuse existing components inside `components/` instead of creating similar ones.
3. For data fetching:
   - In the App Router, prefer server components and `fetch` / server actions.
   - In the Pages Router, follow current `getServerSideProps` / `getStaticProps` patterns.
4. Do NOT introduce new UI libraries, design systems, or router libraries unless explicitly requested.
5. Keep routes, layouts, and navigation consistent with the existing structure.

## Coding Conventions
- Follow the existing ESLint / Prettier configuration in this repo.
- Follow the existing folder structure:
  - `app/` or `pages/` for routing.
  - `components/` for reusable UI.
  - `lib/` or `services/` for shared logic and API helpers.
- Prefer small, focused components and hooks over very large files.
- Write idiomatic TypeScript when the project already uses TS.
- Preserve existing naming conventions.

## Testing
- Use the existing testing framework (Jest, React Testing Library, Playwright, etc.).
- For new features:
  - Add or update tests that cover:
    - Rendering with typical data
    - Error / empty states (if relevant)
    - Critical user flows (submit, navigation, etc.)

## How Claude & Claude Flow Should Work Here
- Treat this project as **an ongoing, already-deployed codebase**:
  - Avoid large, risky rewrites.
  - Prefer incremental, well-scoped changes.
- When asked to modify code:
  1. Explain the plan first.
  2. Show diffs or complete files.
  3. Wait for explicit approval before applying changes.

## Multi-Agent / Swarm Behavior (Claude Flow)
When used with Claude-Flow and Claude Code:

- A **coordinator agent** should:
  - Read this `CLAUDE.md`.
  - Identify the relevant files for the task (pages, components, lib).
  - Delegate implementation and testing to specialized agents.

- A **frontend agent** should:
  - Focus on React/Next.js components, layout, UI states, and accessibility.
  - Respect the design and UX conventions already present.

- A **backend / API agent** should:
  - Focus on API helpers and data fetching logic.
  - Avoid changing external contracts unless explicitly requested.

- A **tester agent** should:
  - Propose and implement tests matching the current testing tools.
  - Keep tests fast, deterministic, and aligned with CI.

## Safety Rules
- Never remove or change environment variables without being asked.
- Never hardcode secrets or tokens.
- Assume this app is used in production: avoid breaking API contracts and URLs.
- When something is ambiguous, prefer to:
  - Ask clarifying questions, or
  - Suggest multiple options with pros/cons.

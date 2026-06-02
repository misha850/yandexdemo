# CLAUDE.md

This file documents the yandexdemo repository for AI assistants. Update it whenever the project structure, tooling, or conventions change significantly.

## Repository Status

This repository is in initial setup — no source code has been committed yet. This CLAUDE.md was created to establish conventions before development begins.

---

## Project Overview

- **Repository:** `misha850/yandexdemo`
- **Purpose:** TBD — update this section once the project goal is defined
- **Primary branch:** `main`

---

## Development Branch

When working in Claude Code on the web, development branches follow the pattern `claude/session-<id>`. Always push to your assigned session branch and open a PR into `main`.

---

## Getting Started

Once source files are added, document the setup steps here. Typical format:

```bash
# Install dependencies
<install command>

# Run development server / build
<dev command>

# Run tests
<test command>

# Lint / format
<lint command>
```

---

## Repository Structure

Update this section as the project grows.

```
yandexdemo/
├── CLAUDE.md          # This file
└── ...                # Source code (TBD)
```

---

## Key Conventions

### Commits
- Use clear, imperative commit messages: `Add user auth`, `Fix pagination bug`
- Commit only relevant files; never commit `.env` or credentials
- Prefer small, focused commits over large omnibus commits

### Code Style
- Document language/framework-specific style rules here once the stack is chosen
- Default: follow the dominant style of surrounding code in any given file

### Branching
- Feature branches: `feat/<short-description>`
- Bug fixes: `fix/<short-description>`
- Chores: `chore/<short-description>`

### Pull Requests
- Keep PRs focused on a single concern
- Include a brief description of *why* the change is made, not just what
- Do not merge without CI passing (once CI is configured)

---

## AI Assistant Guidelines

- **Read this file first** before making changes to understand current conventions
- **Do not add dependencies** without checking for existing alternatives in the project
- **Do not introduce new patterns** that conflict with patterns already used elsewhere
- **Prefer editing existing files** over creating new ones
- **No comments** unless the reasoning is non-obvious — well-named identifiers are the documentation
- **Update this file** when you make architectural decisions or establish new conventions that future assistants should know

---

## CI / Testing

CI configuration is not yet set up. Document pipelines, test commands, and required checks here once added.

---

## Environment Variables

Document required environment variables here once the project has runtime configuration needs. Never commit actual values.

---

## Notes for Future Updates

When the project has real code, replace or expand the following sections:
1. **Project Overview** — describe what the app does and who uses it
2. **Getting Started** — exact commands to install, build, run, and test
3. **Repository Structure** — a directory tree with one-line descriptions
4. **Key Conventions** — language/framework-specific style and patterns
5. **CI / Testing** — how to run tests locally, what CI checks exist
6. **Environment Variables** — names, descriptions, and where to get values

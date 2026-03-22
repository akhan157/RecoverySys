# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Status

This repository is currently empty — no source files, build system, or project structure have been committed yet. The working directory contains only a `.git` folder.

When a project is added, update this file with:
- Build, lint, and test commands
- Project architecture and key file locations
- Any conventions or tooling decisions made for the project

## gstack

For all web browsing, use the `/browse` skill from gstack. Never use `mcp__claude-in-chrome__*` tools directly.

Available gstack skills:
- `/office-hours` — async Q&A and advisory sessions
- `/plan-ceo-review` — prepare plan for CEO review
- `/plan-eng-review` — prepare plan for engineering review
- `/plan-design-review` — prepare plan for design review
- `/design-consultation` — get design feedback
- `/review` — code review
- `/ship` — ship a change
- `/land-and-deploy` — land and deploy a change
- `/canary` — canary deployment
- `/benchmark` — run benchmarks
- `/browse` — web browsing (use this for ALL web browsing)
- `/qa` — QA testing
- `/qa-only` — QA only (no shipping)
- `/design-review` — design review
- `/setup-browser-cookies` — configure browser cookies
- `/setup-deploy` — configure deployment
- `/retro` — retrospective
- `/investigate` — investigate an issue
- `/document-release` — document a release
- `/codex` — codex tasks
- `/careful` — careful/cautious mode
- `/freeze` — freeze deployments
- `/guard` — guard mode
- `/unfreeze` — unfreeze deployments
- `/gstack-upgrade` — upgrade gstack

If gstack skills aren't working, run `cd .claude/skills/gstack && ./setup` to build the binary and register skills.

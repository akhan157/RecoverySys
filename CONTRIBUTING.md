# Contributing to RecoverySys

## Before you start

Use issues for focused bug reports, documentation corrections, and small,
well-defined improvements. For larger changes, open an issue first so the
scope and approach can be discussed.

## Local development

From the `RecoverySys` directory, install dependencies and start the app:

```bash
npm install
npm run dev
```

Before submitting a change, run the full project check:

```bash
npm run check
```

For behavior changes, also run focused tests while iterating and add or update
tests when appropriate. Keep documentation accurate when behavior, commands,
limitations, or user-facing workflows change.

## Recovery-planning expectations

RecoverySys supports recovery planning; it does not replace engineering review,
manufacturer guidance, field procedures, or range rules. Changes affecting
compatibility checks, simulation, warnings, persistence, or exports should
include validation for relevant HPR scenarios and preserve explicit
assumptions, units, warnings, and failure states. Do not present estimates as
flight-certification results or silently make results more optimistic.

See [RecoverySys/README.md](RecoverySys/README.md) for product scope and
limitations.

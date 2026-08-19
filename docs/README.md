# Documentation

This directory keeps repository documentation grouped by purpose so the root README can stay concise.

## Sections

- [`architecture/`](architecture/) — repository structure, module ownership, and staged cleanup rules
- [`setup/`](setup/) — local and hosted setup guidance
- [`migration/`](migration/) — data, schema, and compatibility migration notes
- [`release/`](release/) — release-specific documentation and operational notes

## Documentation rules

- Put long-lived project orientation in the root `README.md`.
- Put chronological release history in `CHANGELOG.md` and GitHub Releases.
- Put implementation architecture and directory ownership here under `docs/architecture/`.
- Put one-time or release-specific operational notes under `docs/release/` rather than expanding the root README.
- Keep documentation changes scoped and avoid duplicating the same information in multiple locations.

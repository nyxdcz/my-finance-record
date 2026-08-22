# AGENTS.md

## User Preferences & Workflow Rules

- **Pre-execution Review Step**: Before executing repository modifications, list and summarize the proposed changes first.
- **User Confirmation**: Wait for the user's explicit approval command (`proceed`) before pushing the approved change set.
- **Versioning**: Keep the current application version for documentation, test, CI, repository-organization, or terminology-only maintenance unless the user approves a new deployed release. Runtime or release changes must keep `README.md`, `package.json`, `package-lock.json`, `version.json`, `index.html`, cache metadata, and the changelog aligned.
- **Commit Wording**: Use the Conventional Commit type that matches the work. Prefer `feat:`, `refactor:`, `style:`, `test:`, `docs:`, `ci:`, or `chore:` as appropriate. Reserve `fix:` for a confirmed defect and always use a specific descriptive subject.
- **Compatibility**: Do not rename persistent storage keys, schema identifiers, or migration-sensitive cache/database values solely for cosmetic cleanup.

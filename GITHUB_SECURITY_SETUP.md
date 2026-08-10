# GitHub Repository Security Setup

The repository files provide automated checks, but repository rules must be enabled once through GitHub Settings.

## Recommended repository visibility

For a personal finance project, private visibility is recommended when the selected GitHub plan supports the required Pages workflow. Publishable Supabase credentials are browser-safe only when Row Level Security is correct; private visibility still reduces unnecessary exposure of project structure.

## Enable GitHub Pages deployment

1. Open **Settings → Pages**.
2. Set **Build and deployment → Source** to **GitHub Actions**.
3. Run the **Quality and GitHub Pages** workflow manually once or merge a validated pull request.
4. Confirm the deployment environment is named `github-pages`.

## Protect `main`

Open **Settings → Rules → Rulesets** and create an active branch ruleset targeting `main`:

- Block force pushes
- Block deletion
- Require a pull request before merging
- Require the **V12 regression quality** status check
- Require branches to be up to date before merging
- Require a linear history
- Restrict bypass permission to the repository owner

Do not require a status check until the new workflow has completed successfully at least once, because GitHub only lists checks that have already run.

## General settings

- Enable Dependabot alerts and security updates.
- Disable unused Actions permissions.
- Keep workflow permissions at read-only by default.
- Require approval for workflows from untrusted forks.
- Enable private vulnerability reporting when available.

## Release tags

Create protected tags using the pattern `v*`, such as `v12.19.1`, after the validated commit is deployed and verified.

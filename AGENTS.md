<!--VITE PLUS START-->

# Using Vite+, the Unified Toolchain for the Web

This project is using Vite+, a unified toolchain built on top of Vite, Rolldown,
Vitest, tsdown, Oxlint, Oxfmt, and Vite Task. Vite+ wraps runtime management,
package management, and frontend tooling in a single global CLI called `vp`.
Vite+ is distinct from Vite, and it invokes Vite through `vp dev` and
`vp build`. Run `vp help` to print a list of commands and `vp <command> --help`
for information about a specific command.

Docs are local at `node_modules/vite-plus/docs` or online at
https://viteplus.dev/guide/.

## Review Checklist

- [ ] Run `vp install` after pulling remote changes and before getting started.
- [ ] Run `vp check` and `vp test` to format, lint, type check and test changes.
- [ ] Check if there are `vite.config.ts` tasks or `package.json` scripts
      necessary for validation, run via `vp run <script>`.

<!--VITE PLUS END-->

# Publishing

Workflow: `.github/workflows/publish-packages.yml`

Triggers on tag push (`v*.*.*`). Publishes both `@aamini/config` and
`@aamini/lib` with npm provenance. Both packages must be at the same version.

## Steps

1. Bump version in both `packages/config/package.json` and
   `packages/lib/package.json`
2. Commit: `git add -A && git commit -m "vX.Y.Z"`
3. Tag: `git tag vX.Y.Z`
4. Push: `git push && git push --tags`

CI builds and publishes automatically. Requires `NPM_TOKEN` in GitHub secrets (a
granular access token with `Read and write` for `Packages` scope).

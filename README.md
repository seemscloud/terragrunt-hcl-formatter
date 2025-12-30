# Terragrunt HCL Formatter

- VS Code formatter/grammar for Terragrunt `.hcl`.
- Examples/tests: `tests/before.hcl` ➜ `tests/after.hcl`.
- Tests: `npm test` or `./main.sh` (default runs tests). Logs JSON with `timestamp` and `message`.
- Build/local install: `./main.sh build` (bumps patch, builds VSIX into `build/`, installs via `cursor`). `./main.sh import` rebuilds if missing and installs for current version.
- Before publishing, set real `publisher` and `repository` in `package.json`.

# PLAN — Fix SonarCloud CI Pipeline

**Date:** 2026-03-07
**Status:** Open
**Affected file:** `.github/workflows/sonarcloud.yml`
**Impact:** Every push to `main` triggers a failing GitHub Actions run. SonarCloud analysis has NEVER succeeded (0 successes across all 96+ runs).

---

## Root Causes (confirmed)

### Problem 1: Karma flags passed to Vitest

The workflow runs:

```yaml
- run: npm test -- --coverage --watch=false --browsers=ChromeHeadless
```

But `npm test` is `vitest run`. Vitest does not accept `--browsers` or `--watch=false` (it's already non-watch in `run` mode). The `--browsers=ChromeHeadless` flag causes Vitest to crash immediately:

```
CACError: Unknown option `--browsers`
```

This is the primary failure — the test step exits with code 1, and all subsequent steps (including the SonarCloud scan) are skipped.

**Fix:** Change the test command to:

```yaml
- run: npm test -- --coverage
```

### Problem 2: No coverage reporter configured for SonarCloud

`sonar-project.properties` expects coverage at:

```
sonar.typescript.lcov.reportPaths=coverage/lcov.info
```

But `vitest.config.ts` has no `coverage` block at all. Without explicit configuration, Vitest defaults to outputting coverage in a format and location SonarCloud cannot find.

**Fix:** Add coverage configuration to `vitest.config.ts`:

```typescript
test: {
  // ...existing config...
  coverage: {
    provider: 'v8',
    reporter: ['text', 'lcov'],
    reportsDirectory: './coverage',
  },
},
```

This outputs `coverage/lcov.info` which matches the `sonar-project.properties` path. The `@vitest/coverage-v8` package is already installed (`^4.0.18` in devDependencies).

### Problem 3: 8 test files fail (59 tests)

Even with the correct flags, `vitest run --coverage` produces 8 failing test files (59 failed tests out of 1578). The CI pipeline will still fail until these tests pass.

Failing tests need to be triaged:
- Some failures are `NG0201: No provider for ActivatedRoute` — test files missing `provideRouter()` in their test providers
- Others may be stale tests that haven't been updated after recent component changes

**Fix options (choose one):**

A. **Fix all 59 failing tests** — correct approach but may be a large effort

B. **Allow CI to continue on test failure** — change the workflow to not block on test failures while still reporting coverage:

```yaml
- run: npm test -- --coverage || true
```

This lets SonarCloud analyze whatever coverage was generated. Tests still visibly fail in the step output but don't block the scan. This is a temporary workaround — failing tests should still be fixed.

C. **Exclude failing test files from CI** — add `exclude` patterns to `vitest.config.ts` for the 8 failing files. Not recommended as it hides real problems.

**Recommended:** Option A (fix the tests), with Option B as a temporary unblock so SonarCloud can start analyzing code quality immediately.

### Problem 4: SonarCloud action uses `@master` tag

```yaml
- uses: SonarSource/sonarcloud-github-action@master
```

Using `@master` is fragile — it can break without warning when the action is updated. Pin to a specific version.

**Fix:** Change to a pinned version:

```yaml
- uses: SonarSource/sonarcloud-github-action@v4
```

---

## Implementation Steps

### Step 1: Fix the workflow file

**File:** `.github/workflows/sonarcloud.yml`

Replace the current workflow with:

```yaml
name: SonarCloud Analysis

on:
  push:
    branches:
      - main
  pull_request:

jobs:
  sonarcloud:
    name: SonarCloud Scan
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - uses: actions/setup-node@v4
        with:
          node-version: 20

      - run: npm ci

      - run: npm test -- --coverage

      - uses: SonarSource/sonarcloud-github-action@v4
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          SONAR_TOKEN: ${{ secrets.SONAR_TOKEN }}
```

### Step 2: Add coverage config to vitest.config.ts

**File:** `vitest.config.ts`

Add `coverage` block inside `test`:

```typescript
coverage: {
  provider: 'v8',
  reporter: ['text', 'lcov'],
  reportsDirectory: './coverage',
},
```

### Step 3: Fix or triage the 59 failing tests

Run `npm test` locally and fix each failing file. Common fixes:
- Add `provideRouter([])` to test providers for components that inject `ActivatedRoute`
- Update test expectations for components that changed since the test was written
- Remove stale tests for deleted functionality

### Step 4: Verify end-to-end

1. Run `npm test -- --coverage` locally — all tests pass
2. Confirm `coverage/lcov.info` is generated
3. Push to `main` — GitHub Actions run should succeed
4. SonarCloud dashboard should show analysis results

---

## Files Modified

| File | Change |
|------|--------|
| `.github/workflows/sonarcloud.yml` | Remove invalid Karma flags, pin SonarCloud action version |
| `vitest.config.ts` | Add coverage reporter config (v8 provider, lcov output) |
| 8 test files (TBD) | Fix 59 failing tests |

## Verification

1. `npm test -- --coverage` passes locally with 0 failures
2. `coverage/lcov.info` exists after test run
3. GitHub Actions SonarCloud workflow passes on next push to `main`
4. SonarCloud dashboard shows code quality metrics

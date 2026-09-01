# Contributing

## Local verification

Use Node.js 20 or later. Install the lockfile-pinned dependencies, then run
the same checks used by pull requests:

```sh
npm ci
npm run typecheck
npm run build
npm test
```

Run the broader regression suite before release work or when changing shared
gameplay systems:

```sh
npm run test-all
```

## Continuous integration

Pull requests and pushes to `main` run type checking, the browser build, and
the fast test suite. The workflow uploads the generated `public/` directory as
a seven-day `browser-build` artifact. The full `test-all` suite runs nightly
and can also be started manually from the Actions page.

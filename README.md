# Grafana MQTT Panel

A lightweight panel to subscribe and publish MQTT messages over WebSockets directly from Grafana.

- Modes: Text, Slider, Switch, Button
- MQTT: ws/wss, optional Basic Auth, JSONata extraction from JSON payloads
- Receive-only mode and “first message before publish” gating for safety

## Getting started

### Frontend

1. Install dependencies

   ```bash
   pnpm install
   ```

2. Build plugin in development mode and run in watch mode

   ```bash
   pnpm run dev
   ```

3. Build plugin in production mode

   ```bash
   pnpm run build
   ```

4. Run the tests (using Jest)

   ```bash
   # Runs the tests and watches for changes, requires git init first
   pnpm run test

   # Exits after running all the tests
   pnpm run test:ci
   ```

5. Spin up a Grafana instance and run the plugin inside it (using Docker)

   ```bash
   pnpm run server
   ```

6. Run the E2E tests (using Playwright)

   ```bash
   # Spins up a Grafana instance first that we tests against
   pnpm run server

   # If you wish to start a certain Grafana version. If not specified will use latest by default
   GRAFANA_VERSION=11.3.0 pnpm run server

   # Starts the tests
   pnpm run e2e
   ```

7. Run the linter

   ```bash
   pnpm run lint

   # or

   pnpm run lint:fix
   ```

## Release a ZIP

- Push a version tag `vX.Y.Z` to trigger the workflow or run it manually via “Run workflow”.
- The workflow builds the plugin and attaches the packaged zip to the GitHub Release.

Quick tagging:

```bash
pnpm version patch # or minor/major
git push origin main --follow-tags
```

## Learn more

Below you can find source code for existing app plugins and other related documentation.

- [Basic panel plugin example](https://github.com/grafana/grafana-plugin-examples/tree/master/examples/panel-basic#readme)
- [`plugin.json` documentation](https://grafana.com/developers/plugin-tools/reference/plugin-json)
- [How to sign a plugin?](https://grafana.com/developers/plugin-tools/publish-a-plugin/sign-a-plugin)

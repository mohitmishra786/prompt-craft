# Demo Workspaces

This folder contains sample workspaces to validate the Prompt Craft extension.

- `ecom-backend`: Minimal Express + Mongo style structure.
  - Run: `npm install && npm start`
  - Trigger diagnostics: open `src/app.js` and uncomment the `broken` line to create a syntax error. Or request `/boom` to produce a runtime stack trace.
# ClickUp Tool

SvelteKit app that connects to the ClickUp API.

## Setup

Get your token from [ClickUp API](https://clickup.com/api);


## Developing

Once you've created a project and installed dependencies with `npm install` (or `pnpm install` or `yarn`), start a development server:

```sh
npm run dev

# or start the server and open the app in a new browser tab
npm run dev -- --open
```

## Building

To create a production version of your app:

```sh
npm run build
```

You can preview the Cloudflare production build with `npm run preview`.

## Deploying (Cloudflare Workers)

This app uses `@sveltejs/adapter-cloudflare` and `wrangler.jsonc`.

```sh
npm run deploy
```

For Cloudflare Git builds, use:

- **Build command:** `npm run build`
- **Deploy command:** `npx wrangler deploy`
- **Build output directory:** `.svelte-kit/cloudflare` (if the dashboard asks for one)

Set secrets (e.g. optional `API_TOKEN`) in the Worker settings or with `npx wrangler secret put API_TOKEN`.

## Features

- **ClickUp API** – Authenticated via `API_TOKEN`, using openapi-fetch with generated types
- **TanStack Query** – Query key factory (`@lukemorales/query-key-factory`) for cache management
- **Paraglide** – i18n with Czech (cs) as default, English (en); add more in `project.inlang/settings.json` and `messages/{locale}.json`
- **Dashboard** – Welcome message using the authenticated user's name from ClickUp

## Regenerating API types

When extending the ClickUp API integration, update `clickup-user-api.json` and run:

```sh
npm run generate:api
```

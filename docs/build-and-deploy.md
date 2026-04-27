# Build And Deploy

This document describes how to build and deploy the PWA yourself. Normal users
do not need these steps if they use the hosted app.

## Requirements

- Node.js LTS
- npm
- Git

## Local Development

Install dependencies:

```sh
npm install
```

Start the development server:

```sh
npm run dev
```

Open the local URL printed by Vite.

For Web Bluetooth:

- `localhost` is accepted as a secure context for local development
- testing from another device usually requires HTTPS
- Android Chrome is the primary target for real badge testing

## Checks

Run the usual checks before publishing changes:

```sh
npm run check
npm run test
npm run build
npm run lint
```

Production files are written to:

```text
dist/
```

This project builds a static web app, not an APK.

## GitHub Pages Deployment

The repository is prepared for GitHub Pages deployment through GitHub Actions.

Expected repository name:

```text
ble-led-badge-pwa
```

Published URL format:

```text
https://<your-github-name>.github.io/ble-led-badge-pwa/
```

Setup:

1. Push this project to a public GitHub repository.
2. In GitHub, open `Settings -> Pages`.
3. Set the source to `GitHub Actions`.
4. Push to `main`.
5. Wait for the `Deploy GitHub Pages` workflow to finish.

The workflow lives at:

```text
.github/workflows/deploy-pages.yml
```

## GitHub Pages Base Path

GitHub Pages project sites are usually served from a repository subpath such as:

```text
/ble-led-badge-pwa/
```

The Vite config handles this with a dedicated build mode:

```sh
npm run build -- --mode github-pages
```

Local development still uses `/` as the app base path.

The GitHub Actions workflow already uses the `github-pages` mode.

## Technical Specification

The internal project specification lives at:

```text
docs/SPEC.md
```

It documents product scope, architecture, protocol boundaries, UI rules,
licensing policy, and testing expectations.

The bitmap TTF font import process is documented in:

```text
docs/bitmap-ttf-import.md
```

# BLE LED Badge PWA Specification

This document is the working specification for the project. It is intended for
development decisions and future implementation work.

## Purpose

`ble-led-badge-pwa` is an Android-focused Progressive Web App for controlling
BLE LED name badges directly from a browser via Web Bluetooth.

The main product goal is:

- open the app on an Android phone
- connect to a compatible BLE LED badge
- send readable badge text quickly
- optionally create, edit, save, and upload a 48 x 12 pixel image

The app is a tool, not a landing page. The UI should optimize for repeated use
on a smartphone.

## Scope

Stable scope:

- Web Bluetooth connection and disconnection
- text rendering to badge bitmap format
- text upload to badge
- scroll mode selection
- brightness and speed control
- local text presets
- custom 48 x 12 pixel editor
- image file import with threshold conversion
- image invert, clear, save as 48 x 12 PNG, and upload
- named pixel presets with thumbnail picker
- built-in badge animations
- local app data export and import
- status/debug view for Web Bluetooth, PWA, notifications, and errors

Experimental scope:

- stored image slot display
- stored image slot check

Important distinction:

- custom text/image upload writes live bitmap payloads to the badge
- stored image slot commands address separate badge-side image slots
- text upload does not populate stored image slots

Out of scope for now:

- native Android app
- APK packaging
- cloud sync
- broad browser compatibility beyond Chromium/Web Bluetooth
- full reverse engineering of all badge commands
- general Unicode emoji rendering beyond the curated symbol set

## Repository Shape

Important repository files:

```text
LICENSE
NOTICE
README.md
THIRD_PARTY_LICENSES.md
docs/SPEC.md
docs/bitmap-ttf-import.md
docs/build-and-deploy.md
package.json
src/
```

## Origin And Attribution

This project was built using `ble-led-badge` as a technical reference and
protocol template.

Reference areas:

- BLE service and characteristic IDs
- AES-encrypted command structure
- text-to-bitmap rendering concept
- upload flow for badge data packets
- classic badge bitmap font data

The upstream `ble-led-badge` project is MIT-licensed. Copied or adapted
copyrightable material from that project remains subject to its upstream MIT
license. See `THIRD_PARTY_LICENSES.md`.

## License Policy

The PWA project's own original code and project-specific additions are intended
to be published under:

```text
PolyForm Noncommercial 1.0.0
```

Meaning:

- non-commercial use is allowed under the public license
- commercial use is not allowed under the public license
- commercial users must contact the repository owner for separate terms

Keep these files in the release repository:

- `LICENSE`
- `NOTICE`
- `THIRD_PARTY_LICENSES.md`

Third-party material keeps its own license. Font attribution and license notes
belong in `THIRD_PARTY_LICENSES.md` and, where useful for the UI, in
`TextRenderer.TEXT_FONT_OPTIONS`.

## Target Platform

Primary runtime:

- Android
- Chrome or another Chromium-based browser with Web Bluetooth support
- secure context, either HTTPS or `localhost`

Development runtime:

- desktop Chrome is useful for protocol and UI work
- real target validation must happen on Android Chrome with a physical badge

PWA installation:

- installability depends on browser heuristics
- absence of an install prompt is not by itself a broken PWA
- install diagnostics belong in the Status tab

## Tech Stack

- React
- TypeScript
- Vite
- Web Bluetooth API
- `vite-plugin-pwa`
- Vitest
- ESLint
- CryptoJS for AES ECB command encryption

Use existing project patterns before adding new abstractions.

## Build And Checks

Install dependencies:

```sh
npm install
```

Run development server:

```sh
npm run dev
```

Run checks:

```sh
npm run check
npm run test
npm run build
npm run lint
```

Production output:

```text
dist/
```

The build is a static web bundle, not an APK.

GitHub Pages deployment:

- the repository root is the PWA project root
- Pages should be deployed from `.github/workflows/deploy-pages.yml`
- production builds on GitHub Pages use the base path `/ble-led-badge-pwa/`
- Vite manifest `scope` and `start_url` follow that same base path

## App Architecture

The current app is intentionally simple:

- `src/App.tsx` owns global app state and cross-feature orchestration
- feature views are presentational components under `src/features/*`
- BLE transport lives in `src/features/bluetooth`
- image conversion/editor helpers live in `src/features/images`
- badge command protocol lives in `src/lib/badge-protocol`

Feature folders:

```text
src/features/bluetooth/
  badge-client.ts
  support.ts

src/features/text/
  TextView.tsx

src/features/images/
  PixelView.tsx
  custom-image.ts
  pixel-grid.ts

src/features/tools/
  ToolsView.tsx

src/features/status/
  StatusView.tsx
```

Protocol folder:

```text
src/lib/badge-protocol/
  protocol.ts
  encryption.ts
  commands.ts
  text-renderer.ts
  *.json font data
```

Prefer keeping protocol details in these modules rather than duplicating them
in documentation.

## App State

Important persistent local storage keys:

```text
ble-led-badge:draft
ble-led-badge:presets
ble-led-badge:pixel-presets
ble-led-badge:auto-connect
```

The Status tab can export and import all `ble-led-badge:` local storage entries
as a JSON backup.

It also provides a `Clear App Data` action that:

- shows a confirmation dialog before deleting anything
- removes all app-owned `ble-led-badge:` local storage entries
- resets text settings, pixel settings, presets, and Auto connect to defaults

Draft state includes:

- message
- selected font
- letter spacing
- space width adjustment
- scroll mode
- brightness
- speed

Text presets:

- do not have separate user-entered names
- label is always the message text
- selecting a preset loads it immediately
- saving/deleting text presets must work without a badge connection

Pixel presets:

- have user-entered names
- use an explicit Load button
- selecting a preset only selects it and fills the preset-name field
- Save changes to Update when the name already exists
- stored rows are 48 binary strings of 12-row image state
- preset picker uses thumbnail previews

## Connection Behavior

Connection states:

```text
idle
requesting-device
connecting
connected
disconnecting
```

The header contains:

- compact app identity
- selected badge name or fallback text
- status dot and status text
- Auto connect toggle
- one connection button whose label follows connection state

Connection button labels:

| State | Label |
| --- | --- |
| disconnected | `Connect Badge` |
| connected | `Disconnect Badge` |
| requesting or connecting | `Abort` |

Auto connect behavior:

- only reconnects to an already selected device
- only attempts reconnect when the document is visible or the app regains focus
- must not repeatedly reconnect while the tab is in the background
- uses a cooldown to avoid rapid retry loops
- must not lock the text or pixel editor while a reconnect attempt is running
- Auto connect remains toggleable during reconnect attempts
- turning Auto connect off during a reconnect attempt aborts the reconnect loop
- the connection button remains usable during reconnect attempts and aborts them

Abort behavior:

- Web Bluetooth connection promises cannot be hard-cancelled by the app
- aborting a connection attempt disables Auto connect and invalidates the active attempt
- late results from invalidated connection attempts must be ignored
- if an invalidated attempt still connects later, the client should disconnect again
- editing text, presets, and pixel images must remain possible during connection attempts

Web Bluetooth constraints:

- `requestDevice` requires a user gesture
- reconnecting can use the previously selected device while available
- unsupported browser or insecure context disables connection actions

## Badge Protocol

Protocol constants live in `src/lib/badge-protocol/protocol.ts`.

Current constants:

```text
service UUID: 0000fee9-0000-1000-8000-00805f9b34fb
command characteristic: d44bc439-abfd-45a2-b575-925416129600
image upload characteristic: d44bc439-abfd-45a2-b575-92541612960a
notify characteristic: d44bc439-abfd-45a2-b575-925416129601
AES block size: 16 bytes
```

Commands are built in `commands.ts` and encrypted in `encryption.ts`.

Known commands:

- `LEDON`
- `LEDOFF`
- `LIGHT`
- `MODE`
- `IMAG`
- `ANIM`
- `SPEED`
- `PLAY`
- `DELE`
- `CHEC`
- `DATS`
- `DATCP`

Command packets:

- start with payload length
- contain ASCII command plus arguments
- are padded/truncated to one 16-byte AES block
- are encrypted with AES ECB and no padding

Image upload:

- send `DATS` with image payload length
- wait for notification/ack
- split image data into encrypted 16-byte packets
- first byte of each upload packet is chunk length
- each packet carries up to 15 bytes of payload
- write image packets without response
- send `DATCP` after all upload packets

The test suite contains protocol regression vectors and should be extended when
new protocol behavior is added.

## Text Rendering

Badge text is rendered to the same 48 x 12-compatible segment format used for
image payloads.

Text rendering rules:

- every font follows the same layout model
- glyph data has no built-in tracking
- non-space glyphs are trimmed to occupied columns
- spaces use explicit configured widths
- space width adjustment is applied relative to each font's default space width
- letter spacing is applied by layout, not baked into glyph data
- no font-specific layout exceptions
- supported emoji and symbols use curated bitmap fallback glyphs
- unsupported non-ASCII glyphs render as `?`
- symbol picker size variants are inserted as concrete symbol sequences
- changing the picker size must not re-render existing text differently

Emoji and symbol fallback:

- symbol data lives in `src/lib/badge-protocol/symbols.ts`
- every symbol glyph is a validated 12-row bitmap converted to badge column masks
- `SYMBOL_GLYPHS` maps concrete Unicode sequences to bitmap glyphs
- `SYMBOL_SEQUENCES` is matched longest-first before normal character rendering
- `SYMBOL_PICKER_ITEMS` defines the Text tab picker groups and size variants
- Large picker variants use the displayed symbol plus `LARGE_SYMBOL_MARKER`
- existing font glyphs take precedence over fallback symbols
- unsupported emoji or non-ASCII characters fall back to `?`
- stars are intentionally not included because they were not readable enough at 12 px

Symbol picker behavior:

- the picker shows one button per symbol family
- the Large toggle is part of the symbol row and controls which concrete symbol sequence is inserted
- Large is the default picker mode
- Large inserts the same visible symbol as Small, followed by the shared invisible large marker
- picker buttons keep a stable tile size while the displayed symbol grows or shrinks with the selected mode
- changing the toggle only affects future inserts
- existing text, loaded presets, and already inserted symbols are not re-rendered into a different size
- symbols are inserted at the current message cursor position when possible

Current font IDs:

```text
classic
ark-pixel-12-mono
ark-pixel-16-mono
grape-soda
modern-dos-8x16
kakwa-12
kakwa-12-bold
```

Default font:

```text
ark-pixel-12-mono
```

Font metadata belongs in `TextRenderer.TEXT_FONT_OPTIONS`.

Font-specific default space widths:

- Classic Badge Font, Ark Pixel 12 Mono, and KakwaFont 12 use compact 4 px spaces
- Ark Pixel 16 Mono, Modern DOS 8x16, and Grape Soda use compact 5 px spaces
- the Space width slider's center position is always adjustment `0` relative to these defaults

Bitmap-style TTF imports:

- must be extracted pixel-exactly
- must not be anti-aliased
- must not be horizontally stretched or squeezed
- must preserve baseline alignment where the source permits it
- use `docs/bitmap-ttf-import.md` as the detailed import workflow and checklist

Do not re-explain JSON font internals here beyond the rendering contract; the
code and bitmap import doc are the authoritative details.

## Image And Pixel Editing

Badge image format:

```text
width: 48 px
height: 12 px
encoded bytes: 72
segments: 8 segments * 9 bytes
```

Pixel editor rules:

- the 48 x 12 grid is always visible in the Pixel tab
- without a loaded image, the grid is empty
- loading a file fills the same editable grid
- painting always works, whether a file was loaded or not
- drag painting must work through pointer interactions
- corners must not be rounded, so every pixel remains reachable
- horizontal scrolling should be avoided on normal phone widths

File import:

- accepts `image/*`
- draws source into a 48 x 12 canvas
- converts to monochrome using luminance threshold
- optional invert applies to conversion
- threshold is visible only while it can affect the loaded source image
- after manual editing, threshold is hidden until a new source file is loaded

Editor actions:

- Load File
- Save File
- Invert Image
- Clear
- Upload Image as bottom action

Save File output:

- PNG
- exactly 48 x 12 pixels
- black and white image data
- not a scaled editor preview

## UI Specification

The app has four tabs:

- `Text`
- `Pixel`
- `Tools`
- `Status`

`Text` is the default tab.

The mobile layout is the leading layout. Desktop should remain usable, but
desktop convenience must not compromise the phone workflow.

Global structure:

- compact header at top
- fixed tab bar near bottom
- fixed bottom action for Text and Pixel tabs
- flat sections with compact spacing
- no hero area
- no nested cards
- avoid oversized rounded boxes and excessive whitespace

Text tab:

- Preset heading and preset row
- Message textarea
- compact symbol picker with one button per symbol family
- Large symbol size toggle for newly inserted picker symbols
- symbol insertion at the current message cursor position
- Badge text font select
- Scroll mode select
- Letter spacing slider
- Space width slider with the current default width at the center position
- Brightness slider
- Speed slider
- fixed bottom action: Send Text

Pixel tab:

- Preset heading, name field, Load/Save-or-Update/Delete controls
- thumbnail preset picker
- Editor heading
- responsive 48 x 12 pixel grid
- threshold slider only when applicable
- Load File, Save File, Invert Image, Clear in one compact action row when space allows
- fixed bottom action: Upload Image

Tools tab:

- built-in animation select
- Play Animation action
- experimental stored image slot controls
- optional tool response as hex and ASCII

Status tab:

- App Data at the top
- Export Backup
- Import Backup
- Clear App Data with confirmation dialog
- Web Bluetooth support
- secure context
- PWA install status/action
- connection state
- badge name
- last action
- last notification as hex and ASCII
- last error

## Interaction Rules

Controls that need a badge connection are disabled while disconnected.

Controls that should work offline remain usable without a badge:

- writing text
- changing text settings
- saving/deleting/loading text presets
- editing pixels
- loading image files
- saving PNG files
- saving/deleting/loading pixel presets
- exporting/importing app data

Busy operations:

- disable conflicting actions
- prevent duplicate sends/uploads
- update `lastAction`
- surface errors near status/debug information

Disconnect handling:

- reset connection and send state
- keep current draft, presets, and pixel grid
- remove notification listeners cleanly

## Visual Direction

The app should feel like a compact hardware-control utility.

Guidelines:

- dense but readable
- large enough touch targets for phone use
- small headings inside controls
- 8px or smaller card radius
- restrained color use
- avoid marketing-page composition
- avoid explanatory in-app text except where a platform state blocks action
- use the Status tab for support/debug explanations

The current CSS uses a light utility-like visual direction. Preserve the compact
tool feel unless a larger UI redesign is explicitly requested.

## Testing Strategy

Automated tests should cover:

- protocol packet encryption vectors
- text rendering dimensions and bytes
- supported emoji and symbol fallback rendering
- unsupported emoji fallback behavior
- picker symbol variant renderability
- imported font regressions
- image encoding and conversion helpers
- pixel grid sizing logic
- Web Bluetooth support detection

Existing test files:

```text
src/test/badge-protocol.test.ts
src/test/bluetooth-support.test.ts
src/test/custom-image.test.ts
src/test/pixel-view.test.ts
```

Manual tests should cover:

- desktop Chrome connection where available
- Android Chrome connection
- text upload with multiple fonts
- brightness/speed/scroll changes
- built-in animations
- custom pixel image upload
- local storage backup export/import
- PWA install prompt behavior where Chrome offers it

Hardware behavior beats assumptions. If badge behavior differs from the spec,
test with the physical badge and update the spec or code accordingly.

## Documentation Boundaries

This spec should contain:

- product goals
- feature scope
- architectural boundaries
- UX rules
- protocol-level contracts
- licensing policy
- testing expectations

The code should remain the documentation for:

- exact command byte construction
- AES conversion helpers
- binary pixel packing details
- React prop names and local component structure
- full font JSON data

Specialized docs:

- `docs/bitmap-ttf-import.md` documents importing bitmap-style TTF fonts.
- `docs/build-and-deploy.md` documents local builds and deployment.
- `THIRD_PARTY_LICENSES.md` documents third-party licenses.

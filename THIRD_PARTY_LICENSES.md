# Third-Party Licenses

This project is distributed under `PolyForm Noncommercial 1.0.0` for the
project's own original source code and project-specific additions.

Third-party code, fonts, and other included material keep their own licenses.
Those licenses apply independently and are not replaced by the project
license.

## Technical reference and adapted material

### `ble-led-badge`

- Upstream repository: `https://github.com/timhodson/ble-led-badge`
- Upstream license: `MIT`

This web app was built using `ble-led-badge` as a technical reference and
protocol template. To the extent that any code, bitmap data, or other
copyrightable material was copied or adapted from that repository, those
upstream portions remain available under the MIT License and should keep the
corresponding attribution.

The original badge bitmap font exposed in the app as `Classic Badge Font`
originates from that reference implementation.

## Fonts

### Ark Pixel

- In-app variants: `Ark Pixel 12 Mono`, `Ark Pixel 16 Mono`
- License: `SIL Open Font License 1.1`
- Bundled font data:
  - `src/lib/badge-protocol/ark-pixel-12-mono-latin.json`
  - `src/lib/badge-protocol/ark-pixel-16-mono-columns.json`

The bundled font data used by this project is based on the OFL-licensed font
software. The OFL terms should be preserved when distributing the font or
modified derivatives of it.

### KakwaFont

- In-app variants: `KakwaFont 12 Normal`, `KakwaFont 12 Bold`
- License: `SIL Open Font License 1.1`
- Bundled font data:
  - `src/lib/badge-protocol/kakwafont-12-n.json`
  - `src/lib/badge-protocol/kakwafont-12-b.json`

### Modern DOS

- In-app variant: `Modern DOS 8x16`
- License: `CC0 1.0 Universal`
- Bundled font data: `src/lib/badge-protocol/modern-dos-8x16-columns.json`
- Import workflow: `docs/bitmap-ttf-import.md`

### Grape Soda

- In-app variant: `Grape Soda`
- License: `CC BY 4.0`
- Bundled font data: `src/lib/badge-protocol/grape-soda-columns.json`
- Attribution: Font by `jeti`, reference page `https://fontenddev.com/fonts/grape-soda/`

`CC BY 4.0` requires attribution when redistributing the font or derivatives.

## Notes

- The public project license does not authorize commercial use of the
  project's own code.
- Third-party licenses may still allow broader use for the third-party
  material itself.
- If you plan to redistribute this repository, ship `LICENSE`, `NOTICE`, and
  this file together.

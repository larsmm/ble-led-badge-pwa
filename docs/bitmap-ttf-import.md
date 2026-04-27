# Importing Bitmap-Style TTF Fonts

This note documents how to import bitmap-style TTF fonts into the PWA's badge
font format, using `ModernDOS8x16.ttf` as the example.

The first attempt, based on Windows GDI rasterization, was not pixel-accurate
enough: some glyphs were rendered incorrectly or were missing entirely.
The working solution reads the TTF glyph data directly from `glyf`, rasterizes
it on the original pixel grid, and converts that into the badge column masks.

## Target Format

The text engine expects imported bitmap fonts as a JSON object:

```json
{
  "A": [1020, 66, 66, 1020],
  "B": [1022, 546, 546, 476],
  " ": [0, 0, 0, 0, 0, 0, 0, 0]
}
```

Each entry is an array of columns. Each column is a bitmask for the
12 badge rows:

```text
bit 0  = top badge row
bit 11 = bottom badge row
```

Example:

```ts
const topPixel = 1 << 0;
const bottomPixel = 1 << 11;
const fullColumn = (1 << 12) - 1;
```

Important:

- Non-space glyphs are trimmed by the renderer to their actually used pixel
  columns.
- Spaces keep an explicit width because they contain no set pixels.
- Letter spacing must not be baked into the glyph data. Spacing belongs in the
  text layout logic.
- There are no font-specific layout exceptions. All fonts should be imported
  and trimmed according to the same rules.

## When This Importer Makes Sense

This approach is useful for TTF files that are really bitmap or pixel fonts,
but store their glyphs as vector outlines in the `glyf` table.

Typical signs:

- The font has a fixed pixel size, for example `8x16`.
- The outline points lie on a regular grid.
- `head.unitsPerEm` and the font bounding box reveal a clear cell size.
- The output must be pixel-exact, with no anti-aliasing, dithering,
  stretching, or squeezing.

Do not use this approach when:

- The font is truly proportional or vector-based and has no clear pixel grid.
- Optical resampling is explicitly desired.
- A font is already available in a native bitmap format that can be read
  directly.

## Import Workflow

### 1. Check the License

Always check the license in the third-party folder before importing.

For `ModernDOS8x16.ttf`, the license was `CC0 1.0 Universal`. That is
unproblematic for a freely published project.

The license information is then documented in `TEXT_FONT_OPTIONS`.

### 2. Inspect the TTF Metrics

For the Modern DOS import, these values were decisive:

```text
unitsPerEm: 1600
font bbox:  xMin=0, yMin=-400, xMax=800, yMax=1200
hhea:       ascent=1200, descent=-400
source grid: 8 x 16 pixels
cell size:   100 font units
```

From that:

```text
8 columns * 100 = 800 units
16 rows    * 100 = 1600 units
```

However, the badge only has 12 rows. That means the full 16-row height is not
used directly. Instead, a 12-row window is sampled from the original grid.
Important: the window is not scaled. It simply selects 12 real source pixel
rows.

Working Modern DOS configuration:

```py
CELL = 100
WIDTH = 8
HEIGHT = 12
TOP_Y = 1000
```

This samples the cell centers from `y = 950` down to `y = -150`.
That window keeps uppercase letters, punctuation, the baseline, and
below-baseline characters such as `_` visible.

### 3. Read the Cmap

The importer reads `cmap` format 4 and maps Unicode code points to glyph IDs.
For badge text, the `0x20..0x7E` range is usually enough as a first step.

### 4. Read Glyf and Loca

The `loca` table provides offsets into the `glyf` table. The `glyf` table
contains the outlines.

There are two important glyph types:

- Simple glyphs: contain outline points directly.
- Composite glyphs: are built from other glyphs.

Composite glyphs must not be ignored. In the Modern DOS import, characters
such as `:` and `;` were otherwise empty or incorrect.

### 5. Rasterize the Outlines

For each source cell, test the center point:

```text
x = col * CELL + CELL / 2
y = TOP_Y - row * CELL - CELL / 2
```

Then use an even-odd test to determine whether the point lies inside the glyph
contours. If it does, set the corresponding bit in the badge column mask.

This approach avoids:

- anti-aliasing
- dithering
- horizontal squeezing
- vertical stretching
- rounding artifacts caused by Canvas or GDI

## Reusable Python Importer

The following importer has no external Python dependencies. It reads the
relevant TTF tables directly. For new fonts, these values are the main ones
to adjust:

- `FONT_PATH`
- `OUT_PATH`
- `CELL`
- `WIDTH`
- `HEIGHT`
- `TOP_Y`
- `FIRST_CODEPOINT`
- `LAST_CODEPOINT`

```py
from __future__ import annotations

import json
import struct
from dataclasses import dataclass
from pathlib import Path


FONT_PATH = Path(r"<path-to-third-party-fonts>\modern_dos\ModernDOS8x16.ttf")
OUT_PATH = Path(
    r"src\lib\badge-protocol\modern-dos-8x16-columns.json"
)

CELL = 100
WIDTH = 8
HEIGHT = 12
TOP_Y = 1000
FIRST_CODEPOINT = 0x20
LAST_CODEPOINT = 0x7E


def u16(data: bytes, offset: int) -> int:
    return struct.unpack_from(">H", data, offset)[0]


def i16(data: bytes, offset: int) -> int:
    return struct.unpack_from(">h", data, offset)[0]


def u32(data: bytes, offset: int) -> int:
    return struct.unpack_from(">I", data, offset)[0]


def fixed_2_14(value: int) -> float:
    return value / 16384.0


@dataclass
class Point:
    x: float
    y: float
    on_curve: bool


class TtfReader:
    def __init__(self, path: Path):
        self.data = path.read_bytes()
        self.tables = self._read_tables()
        self.index_to_loc_format = i16(self.data, self.tables["head"] + 50)
        self.num_glyphs = u16(self.data, self.tables["maxp"] + 4)
        self.glyph_offsets = self._read_loca()
        self.cmap = self._read_cmap_format_4()

    def _read_tables(self) -> dict[str, int]:
        table_count = u16(self.data, 4)
        tables: dict[str, int] = {}
        for index in range(table_count):
            entry = 12 + index * 16
            tag = self.data[entry : entry + 4].decode("ascii")
            tables[tag] = u32(self.data, entry + 8)
        return tables

    def _read_loca(self) -> list[int]:
        offset = self.tables["loca"]
        if self.index_to_loc_format == 0:
            return [u16(self.data, offset + i * 2) * 2 for i in range(self.num_glyphs + 1)]
        return [u32(self.data, offset + i * 4) for i in range(self.num_glyphs + 1)]

    def _read_cmap_format_4(self) -> dict[int, int]:
        cmap_offset = self.tables["cmap"]
        subtable_count = u16(self.data, cmap_offset + 2)
        chosen = None

        for index in range(subtable_count):
            platform_id = u16(self.data, cmap_offset + 4 + index * 8)
            encoding_id = u16(self.data, cmap_offset + 6 + index * 8)
            sub_offset = u32(self.data, cmap_offset + 8 + index * 8)
            absolute = cmap_offset + sub_offset
            fmt = u16(self.data, absolute)
            if fmt == 4 and platform_id in (0, 3):
                chosen = absolute
                if platform_id == 3 and encoding_id in (1, 10):
                    break

        if chosen is None:
            raise RuntimeError("No cmap format 4 table found.")

        seg_count = u16(self.data, chosen + 6) // 2
        end_codes = [u16(self.data, chosen + 14 + i * 2) for i in range(seg_count)]
        start_codes_offset = chosen + 16 + seg_count * 2
        start_codes = [u16(self.data, start_codes_offset + i * 2) for i in range(seg_count)]
        id_delta_offset = start_codes_offset + seg_count * 2
        id_deltas = [i16(self.data, id_delta_offset + i * 2) for i in range(seg_count)]
        id_range_offset_offset = id_delta_offset + seg_count * 2
        id_range_offsets = [
            u16(self.data, id_range_offset_offset + i * 2) for i in range(seg_count)
        ]

        cmap: dict[int, int] = {}
        for seg in range(seg_count):
            for codepoint in range(start_codes[seg], end_codes[seg] + 1):
                if codepoint == 0xFFFF:
                    continue
                if id_range_offsets[seg] == 0:
                    glyph_id = (codepoint + id_deltas[seg]) & 0xFFFF
                else:
                    glyph_index_offset = (
                        id_range_offset_offset
                        + seg * 2
                        + id_range_offsets[seg]
                        + (codepoint - start_codes[seg]) * 2
                    )
                    glyph_id = u16(self.data, glyph_index_offset)
                    if glyph_id:
                        glyph_id = (glyph_id + id_deltas[seg]) & 0xFFFF
                cmap[codepoint] = glyph_id
        return cmap

    def glyph_contours(self, glyph_id: int) -> list[list[Point]]:
        return self._glyph_contours(glyph_id, depth=0)

    def _glyph_contours(self, glyph_id: int, depth: int) -> list[list[Point]]:
        if depth > 8:
            raise RuntimeError("Composite glyph recursion too deep.")

        start = self.tables["glyf"] + self.glyph_offsets[glyph_id]
        end = self.tables["glyf"] + self.glyph_offsets[glyph_id + 1]
        if start == end:
            return []

        contour_count = i16(self.data, start)
        if contour_count >= 0:
            return self._simple_glyph(start, contour_count)
        return self._composite_glyph(start, depth)

    def _simple_glyph(self, start: int, contour_count: int) -> list[list[Point]]:
        end_points = [u16(self.data, start + 10 + i * 2) for i in range(contour_count)]
        instruction_length_offset = start + 10 + contour_count * 2
        instruction_length = u16(self.data, instruction_length_offset)
        cursor = instruction_length_offset + 2 + instruction_length
        point_count = end_points[-1] + 1 if end_points else 0

        flags: list[int] = []
        while len(flags) < point_count:
            flag = self.data[cursor]
            cursor += 1
            flags.append(flag)
            if flag & 0x08:
                repeat = self.data[cursor]
                cursor += 1
                flags.extend([flag] * repeat)

        xs: list[int] = []
        x = 0
        for flag in flags:
            if flag & 0x02:
                delta = self.data[cursor]
                cursor += 1
                x += delta if flag & 0x10 else -delta
            elif not (flag & 0x10):
                x += i16(self.data, cursor)
                cursor += 2
            xs.append(x)

        ys: list[int] = []
        y = 0
        for flag in flags:
            if flag & 0x04:
                delta = self.data[cursor]
                cursor += 1
                y += delta if flag & 0x20 else -delta
            elif not (flag & 0x20):
                y += i16(self.data, cursor)
                cursor += 2
            ys.append(y)

        points = [Point(xs[i], ys[i], bool(flags[i] & 0x01)) for i in range(point_count)]
        contours: list[list[Point]] = []
        first = 0
        for last in end_points:
            contours.append(points[first : last + 1])
            first = last + 1
        return contours

    def _composite_glyph(self, start: int, depth: int) -> list[list[Point]]:
        ARG_1_AND_2_ARE_WORDS = 0x0001
        ARGS_ARE_XY_VALUES = 0x0002
        WE_HAVE_A_SCALE = 0x0008
        MORE_COMPONENTS = 0x0020
        WE_HAVE_AN_X_AND_Y_SCALE = 0x0040
        WE_HAVE_A_TWO_BY_TWO = 0x0080

        cursor = start + 10
        contours: list[list[Point]] = []

        while True:
            flags = u16(self.data, cursor)
            glyph_id = u16(self.data, cursor + 2)
            cursor += 4

            if flags & ARG_1_AND_2_ARE_WORDS:
                arg1 = i16(self.data, cursor)
                arg2 = i16(self.data, cursor + 2)
                cursor += 4
            else:
                arg1 = struct.unpack_from(">b", self.data, cursor)[0]
                arg2 = struct.unpack_from(">b", self.data, cursor + 1)[0]
                cursor += 2

            dx = arg1 if flags & ARGS_ARE_XY_VALUES else 0
            dy = arg2 if flags & ARGS_ARE_XY_VALUES else 0
            a, b, c, d = 1.0, 0.0, 0.0, 1.0

            if flags & WE_HAVE_A_SCALE:
                scale = fixed_2_14(i16(self.data, cursor))
                cursor += 2
                a = d = scale
            elif flags & WE_HAVE_AN_X_AND_Y_SCALE:
                a = fixed_2_14(i16(self.data, cursor))
                d = fixed_2_14(i16(self.data, cursor + 2))
                cursor += 4
            elif flags & WE_HAVE_A_TWO_BY_TWO:
                a = fixed_2_14(i16(self.data, cursor))
                b = fixed_2_14(i16(self.data, cursor + 2))
                c = fixed_2_14(i16(self.data, cursor + 4))
                d = fixed_2_14(i16(self.data, cursor + 6))
                cursor += 8

            for contour in self._glyph_contours(glyph_id, depth + 1):
                transformed = [
                    Point(a * p.x + c * p.y + dx, b * p.x + d * p.y + dy, p.on_curve)
                    for p in contour
                ]
                contours.append(transformed)

            if not flags & MORE_COMPONENTS:
                return contours


def expand_contour(contour: list[Point]) -> list[tuple[float, float]]:
    """Convert TrueType quadratic contours into line-like sample polygons.

    Bitmap-style TTFs often use rectangular contours. For robust point-in-shape
    testing, implicit on-curve points between two off-curve points are inserted.
    The even-odd test below works well for these pixel-font outlines.
    """

    if not contour:
        return []

    expanded: list[Point] = []
    for index, point in enumerate(contour):
        prev = contour[index - 1]
        if not prev.on_curve and not point.on_curve:
            expanded.append(Point((prev.x + point.x) / 2, (prev.y + point.y) / 2, True))
        expanded.append(point)

    return [(point.x, point.y) for point in expanded if point.on_curve]


def point_inside_polygon(x: float, y: float, polygon: list[tuple[float, float]]) -> bool:
    inside = False
    if len(polygon) < 3:
        return False

    j = len(polygon) - 1
    for i in range(len(polygon)):
        xi, yi = polygon[i]
        xj, yj = polygon[j]
        crosses = (yi > y) != (yj > y)
        if crosses:
            x_intersection = (xj - xi) * (y - yi) / (yj - yi) + xi
            if x < x_intersection:
                inside = not inside
        j = i
    return inside


def point_inside_contours(x: float, y: float, contours: list[list[Point]]) -> bool:
    inside = False
    for contour in contours:
        polygon = expand_contour(contour)
        if point_inside_polygon(x, y, polygon):
            inside = not inside
    return inside


def rasterize(reader: TtfReader, character: str) -> list[int]:
    glyph_id = reader.cmap.get(ord(character), 0)
    contours = reader.glyph_contours(glyph_id)
    columns: list[int] = []

    for col in range(WIDTH):
        mask = 0
        x = col * CELL + CELL / 2
        for row in range(HEIGHT):
            y = TOP_Y - row * CELL - CELL / 2
            if point_inside_contours(x, y, contours):
                mask |= 1 << row
        columns.append(mask)

    return columns


def main() -> None:
    reader = TtfReader(FONT_PATH)
    output: dict[str, list[int]] = {}

    for codepoint in range(FIRST_CODEPOINT, LAST_CODEPOINT + 1):
        character = chr(codepoint)
        output[character] = rasterize(reader, character)

    empty = [
        character
        for character, columns in output.items()
        if character != " " and not any(columns)
    ]
    if empty:
        raise RuntimeError(f"Unexpected empty glyphs: {empty}")

    OUT_PATH.write_text(json.dumps(output, indent=2, ensure_ascii=False) + "\n", "utf-8")
    print(f"Wrote {OUT_PATH}")


if __name__ == "__main__":
    main()
```

## Renderer Registration

After importing, the JSON file is wired into the renderer.

Example:

```ts
import modernDos8x16ColumnsRawFont from "./modern-dos-8x16-columns.json";
```

Then it is normalized into the internal font format:

```ts
const MODERN_DOS_8X16_COLUMN_FONT = normalizeColumnFontMap(
  modernDos8x16ColumnsRawFont as Record<string, number[]>,
);
```

The font must appear in the font map:

```ts
const COLUMN_FONT_MAPS: Partial<Record<TextFontId, ColumnFontMap>> = {
  "modern-dos-8x16": MODERN_DOS_8X16_COLUMN_FONT,
};
```

Spaces need an explicit width:

```ts
const SPACE_WIDTHS: Partial<Record<TextFontId, number>> = {
  "modern-dos-8x16": 8,
};
```

And the UI selector needs metadata:

```ts
{
  id: "modern-dos-8x16",
  label: "Modern DOS 8x16",
  license: "CC0 1.0 Universal",
  note:
    "Imported from ModernDOS8x16.ttf, cropped to the 12-row badge window and packed losslessly into badge segments.",
}
```

## Tests

At minimum, these things should be tested:

- The font can be selected.
- A normal text such as `ABCDEFG` has a plausible width.
- Rendering produces segments.
- Composite glyphs are visible.
- Baseline and descender-style characters are visible.

Example:

```ts
it("keeps Modern DOS composite and baseline glyphs visible", () => {
  for (const character of [":", ";", "_"]) {
    expect(TextRenderer.getGlyphColumns(character, "modern-dos-8x16")).not.toHaveLength(0);
    expect(
      TextRenderer.getGlyphColumns(character, "modern-dos-8x16").some((column) => column !== 0),
    ).toBe(true);
  }
});
```

After an import:

```sh
npm run check
npm run test
npm run build
npm run lint
```

## Common Mistakes

### Using GDI, Canvas, or Browser Rasterization

That is risky for pixel-accurate font imports. Such renderers may apply
anti-aliasing, hinting, rounding, dithering, or other corrections.
On a 48x12 badge, the result can quickly look squeezed or noisy.

### Ignoring Composite Glyphs

Some characters are internally built from other glyphs. If composite glyphs
are not resolved, they may appear empty.

In the Modern DOS import, `:` and `;` were good test characters.

### Setting the Crop Window Too High

If the 12-row window only takes the upper rows of a 16-row font, the baseline,
descenders, or `_` disappear.

For the Modern DOS import, `TOP_Y = 1000` was the useful choice instead of
`1200`.

### Scaling Glyphs Horizontally

Do not force the width. An `8x16` source should be read as 8 source columns.
Narrow characters then become narrower naturally through the normal trimming
behavior.

### Baking Spacing into Glyphs

Glyph data should contain only visible pixels. Additional spacing between
characters is layout, not font data.

## Quick Checklist for New Fonts

1. Put the license into the third-party folder and verify it.
2. Inspect the TTF metrics from `head`, `hhea`, `maxp`, `loca`, `glyf`, and `cmap`.
3. Determine the source pixel grid, for example `8x16` with `CELL = 100`.
4. Choose the 12-row badge window without scaling.
5. Generate the JSON column masks.
6. Verify visibility for all desired ASCII characters.
7. Register the font in `text-renderer.ts`.
8. Document the license and source in `TEXT_FONT_OPTIONS`.
9. Add regression tests for normal letters, punctuation, and baseline characters.
10. Run `check`, `test`, `build`, and `lint`.

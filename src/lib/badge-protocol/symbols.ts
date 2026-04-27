export type SymbolGlyph = {
  columns: number[];
  label: string;
};

export type SymbolSize = "small" | "large";

const SYMBOL_HEIGHT = 12;

function rowsToColumns(rows: string[]): number[] {
  const width = rows[0]?.length ?? 0;
  if (rows.length !== SYMBOL_HEIGHT || rows.some((row) => row.length !== width)) {
    throw new Error("Symbol glyphs must use a consistent 12-row bitmap.");
  }

  const columns: number[] = [];

  for (let column = 0; column < width; column += 1) {
    let mask = 0;

    for (let row = 0; row < rows.length; row += 1) {
      if (rows[row]?.[column] === "#") {
        mask |= 1 << row;
      }
    }

    columns.push(mask);
  }

  return columns;
}

const SMILE = rowsToColumns([
  "............",
  "...######...",
  "..#......#..",
  ".#.#....#.#.",
  ".#........#.",
  ".#........#.",
  ".#..#..#..#.",
  ".#...##...#.",
  "..#......#..",
  "...######...",
  "............",
  "............"
]);

const HAPPY = rowsToColumns([
  "............",
  "...######...",
  "..#......#..",
  ".#.#....#.#.",
  ".#........#.",
  ".#........#.",
  ".#.#....#.#.",
  ".#..####..#.",
  "..#......#..",
  "...######...",
  "............",
  "............"
]);

const WINK = rowsToColumns([
  "............",
  "...######...",
  "..#......#..",
  ".#.#..###.#.",
  ".#........#.",
  ".#........#.",
  ".#..#..#..#.",
  ".#...##...#.",
  "..#......#..",
  "...######...",
  "............",
  "............"
]);

const COOL = rowsToColumns([
  "............",
  "...######...",
  "..#......#..",
  ".#.###.###..",
  ".#.###.###..",
  ".#........#.",
  ".#..#..#..#.",
  ".#...##...#.",
  "..#......#..",
  "...######...",
  "............",
  "............"
]);

const BIG_SMILE = rowsToColumns([
  "....####....",
  "..##....##..",
  ".#........#.",
  ".#.##..##.#.",
  "#..##..##..#",
  "#..........#",
  "#..........#",
  "#..#....#..#",
  ".#..####..#.",
  ".#........#.",
  "..##....##..",
  "....####...."
]);

const BIG_HAPPY = rowsToColumns([
  "....####....",
  "..##....##..",
  ".#........#.",
  ".#.##..##.#.",
  "#..##..##..#",
  "#..........#",
  "#..######..#",
  "#..#....#..#",
  ".#.##..##.#.",
  ".#..####..#.",
  "..##....##..",
  "....####...."
]);

const BIG_WINK = rowsToColumns([
  "....####....",
  "..##....##..",
  ".#........#.",
  ".#.##.....#.",
  "#..##.###..#",
  "#..........#",
  "#..........#",
  "#..#....#..#",
  ".#..####..#.",
  ".#........#.",
  "..##....##..",
  "....####...."
]);

const BIG_COOL = rowsToColumns([
  "....####....",
  "..##....##..",
  ".#........#.",
  ".#.########.",
  "#..#.#.#.#.#",
  "#..###.###.#",
  "#..........#",
  "#..#....#..#",
  ".#..####..#.",
  ".#........#.",
  "..##....##..",
  "....####...."
]);

const HEART = rowsToColumns([
  "............",
  "............",
  "..##..##....",
  ".########...",
  ".########...",
  ".########...",
  "..######....",
  "...####.....",
  "....##......",
  "............",
  "............",
  "............"
]);

const BIG_HEART = rowsToColumns([
  "..##....##..",
  ".####..####.",
  "############",
  "############",
  "############",
  "############",
  ".##########.",
  ".##########.",
  "..########..",
  "...######...",
  "....####....",
  ".....##.....",
]);

const SPIRAL = rowsToColumns([
  "......##....",
  ".......##...",
  "..####..##..",
  ".##..##..##.",
  "##....##..#.",
  "#..##..#..#.",
  "#.###..#..#.",
  "#.##..##..#.",
  "#..####..##.",
  "##......##..",
  ".##....##...",
  "..######...."
]);

const CHECK = rowsToColumns([
  "............",
  "............",
  ".........#..",
  "........##..",
  ".......##...",
  "..#...##....",
  "..##.##.....",
  "...###......",
  "....#.......",
  "............",
  "............",
  "............"
]);

const CROSS = rowsToColumns([
  "............",
  "............",
  "..#.....#...",
  "...#...#....",
  "....#.#.....",
  ".....#......",
  "....#.#.....",
  "...#...#....",
  "..#.....#...",
  "............",
  "............",
  "............"
]);

const BIG_CHECK = rowsToColumns([
  "...........#",
  "..........##",
  ".........###",
  "........####",
  ".......####.",
  "#.....####..",
  "##...####...",
  "###.####....",
  "#######.....",
  ".#####......",
  "..###.......",
  "...#........"
]);

const BIG_CROSS = rowsToColumns([
  "##.......##.",
  "###.....###.",
  ".###...###..",
  "..###.###...",
  "...#####....",
  "....###.....",
  "...#####....",
  "..###.###...",
  ".###...###..",
  "###.....###.",
  "##.......##.",
  "............"
]);

const UP = rowsToColumns([
  "............",
  ".....#......",
  "....###.....",
  "...#####....",
  ".....#......",
  ".....#......",
  ".....#......",
  ".....#......",
  ".....#......",
  "............",
  "............",
  "............"
]);

const DOWN = rowsToColumns([
  "............",
  ".....#......",
  ".....#......",
  ".....#......",
  ".....#......",
  ".....#......",
  "...#####....",
  "....###.....",
  ".....#......",
  "............",
  "............",
  "............"
]);

const LEFT = rowsToColumns([
  "............",
  "............",
  "....#.......",
  "...##.......",
  "..########..",
  "...##.......",
  "....#.......",
  "............",
  "............",
  "............",
  "............",
  "............"
]);

const RIGHT = rowsToColumns([
  "............",
  "............",
  ".......#....",
  ".......##...",
  "..########..",
  ".......##...",
  ".......#....",
  "............",
  "............",
  "............",
  "............",
  "............"
]);

const BIG_UP = rowsToColumns([
  "....#.......",
  "...###......",
  "..#####.....",
  ".#######....",
  "#########...",
  "...###......",
  "...###......",
  "...###......",
  "...###......",
  "...###......",
  "...###......",
  "...###......"
]);

const BIG_DOWN = rowsToColumns([
  "...###......",
  "...###......",
  "...###......",
  "...###......",
  "...###......",
  "...###......",
  "...###......",
  "#########...",
  ".#######....",
  "..#####.....",
  "...###......",
  "....#......."
]);

const BIG_LEFT = rowsToColumns([
  "............",
  "............",
  "............",
  "....#.......",
  "...##.......",
  "..###.......",
  ".###########",
  "############",
  ".###########",
  "..###.......",
  "...##.......",
  "....#......."
]);

const BIG_RIGHT = rowsToColumns([
  "............",
  "............",
  "............",
  ".......#....",
  ".......##...",
  ".......###..",
  "###########.",
  "############",
  "###########.",
  ".......###..",
  ".......##...",
  ".......#...."
]);

export const SYMBOL_GLYPHS: Record<string, SymbolGlyph> = {
  "\u{1F642}": { columns: SMILE, label: "smile" },
  "\u{1F642}\uFE0E": { columns: BIG_SMILE, label: "large smile" },
  "\u{1F603}": { columns: HAPPY, label: "happy" },
  "\u{1F603}\uFE0E": { columns: BIG_HAPPY, label: "large happy" },
  "\u{1F609}": { columns: WINK, label: "wink" },
  "\u{1F609}\uFE0E": { columns: BIG_WINK, label: "large wink" },
  "\u{1F60E}": { columns: COOL, label: "cool" },
  "\u{1F60E}\uFE0E": { columns: BIG_COOL, label: "large cool" },
  "\u2764": { columns: HEART, label: "heart" },
  "\u2764\uFE0F": { columns: HEART, label: "heart" },
  "\u{1F496}": { columns: BIG_HEART, label: "big heart" },
  "\u{1F300}": { columns: SPIRAL, label: "spiral" },
  "\u2713": { columns: CHECK, label: "check" },
  "\u2713\uFE0E": { columns: BIG_CHECK, label: "large check" },
  "\u2714": { columns: CHECK, label: "check" },
  "\u2715": { columns: CROSS, label: "cross" },
  "\u2715\uFE0E": { columns: BIG_CROSS, label: "large cross" },
  "\u00D7": { columns: CROSS, label: "cross" },
  "\u2191": { columns: UP, label: "up" },
  "\u2191\uFE0E": { columns: BIG_UP, label: "large up" },
  "\u2193": { columns: DOWN, label: "down" },
  "\u2193\uFE0E": { columns: BIG_DOWN, label: "large down" },
  "\u2190": { columns: LEFT, label: "left" },
  "\u2190\uFE0E": { columns: BIG_LEFT, label: "large left" },
  "\u2192": { columns: RIGHT, label: "right" },
  "\u2192\uFE0E": { columns: BIG_RIGHT, label: "large right" }
};

export const SYMBOL_SEQUENCES = Object.keys(SYMBOL_GLYPHS).sort(
  (left, right) => right.length - left.length
);

export type SymbolPickerItem = {
  display: string;
  label: string;
  variants: Partial<Record<SymbolSize, string>>;
};

export const SYMBOL_PICKER_ITEMS: SymbolPickerItem[] = [
  {
    display: "\u{1F642}",
    label: "Smile",
    variants: { small: "\u{1F642}", large: "\u{1F642}\uFE0E" }
  },
  {
    display: "\u{1F603}",
    label: "Happy",
    variants: { small: "\u{1F603}", large: "\u{1F603}\uFE0E" }
  },
  {
    display: "\u{1F609}",
    label: "Wink",
    variants: { small: "\u{1F609}", large: "\u{1F609}\uFE0E" }
  },
  {
    display: "\u{1F60E}",
    label: "Cool",
    variants: { small: "\u{1F60E}", large: "\u{1F60E}\uFE0E" }
  },
  {
    display: "\u2764",
    label: "Heart",
    variants: { small: "\u2764", large: "\u{1F496}" }
  },
  {
    display: "\u{1F300}",
    label: "Spiral",
    variants: { small: "\u{1F300}", large: "\u{1F300}" }
  },
  {
    display: "\u2713",
    label: "Check",
    variants: { small: "\u2713", large: "\u2713\uFE0E" }
  },
  {
    display: "\u2715",
    label: "Cross",
    variants: { small: "\u2715", large: "\u2715\uFE0E" }
  },
  {
    display: "\u2191",
    label: "Up",
    variants: { small: "\u2191", large: "\u2191\uFE0E" }
  },
  {
    display: "\u2193",
    label: "Down",
    variants: { small: "\u2193", large: "\u2193\uFE0E" }
  },
  {
    display: "\u2190",
    label: "Left",
    variants: { small: "\u2190", large: "\u2190\uFE0E" }
  },
  {
    display: "\u2192",
    label: "Right",
    variants: { small: "\u2192", large: "\u2192\uFE0E" }
  }
];

/**
 * constellation-layout.ts — the PURE, DETERMINISTIC spatial layout for the board
 * (plan §6: "deterministic semantic layout, never force-directed; star anchors
 * placed by rank on a fixed layout WITH BOUNDING-BOX COLLISION HANDLING; node
 * cards cluster under their star; star→node hub-and-spoke edges"). Same input ⇒
 * same coordinates, so the board is replayable and testable without a canvas.
 *
 * THE ARRANGEMENT — the writer's draft is the CENTRE of their own constellation:
 *  - The draft card sits at the origin. Stars are placed on an ELLIPSE around it
 *    whose radii clear the card's bounding box outright — the 2026-03 board
 *    audit's failure #2 ("radial layout ignores bounding boxes", islands
 *    overlapping the draft) is designed out rather than patched.
 *  - Stars are ordered by assembly rank clockwise from the top, so document order
 *    (keyboard Tab order) matches the spatial reading order — audit failure #10.
 *  - The ⚡ crux star takes the prime slot and is rendered dominant, so the
 *    highest-leverage idea is never one of N identical islands — audit failure #4.
 *  - Each star's cards fan OUTWARD along the ray from the draft through the star,
 *    so an expanded fan never crowds the draft or its neighbours, and each card
 *    keeps a visible spoke back to its star — audit failure #9 (no spatial
 *    connection between a detail panel and its source).
 *  - The off-map cluster ("what you didn't write about") sits in its own zone
 *    well beyond the ring, so it reads as genuinely apart (D10).
 *
 * Coordinates are React-Flow canvas units. This module speaks CENTRES; the
 * renderer converts to React-Flow's top-left `position` via `toTopLeft`.
 */

import type { BoardNode, BoardStar } from "./constellation-glue";

// ── The draft card's silhouette (must match canvas-flow's editor node) ───────

/** The editor card's width in canvas units (canvas-flow `NODE_WIDTH`). */
export const DRAFT_WIDTH = 896;
/** A generous assumed height for the draft card — the ring clears this, and
 * over-estimating only spaces the constellation more comfortably. */
export const DRAFT_HEIGHT = 1040;
/** The draft's centre (the node is positioned at {0,0} top-left). */
export const DRAFT_CENTER = { x: DRAFT_WIDTH / 2, y: DRAFT_HEIGHT / 2 };

/**
 * On the board, the draft is CONTEXT, not a reading surface — at constellation
 * zoom nobody reads it, and at full size it is by far the largest object on the
 * canvas, which forces the whole ring so far out that star labels shrink to
 * illegibility. So while a constellation is showing, the card scales down to a
 * centre mark ("your draft, here is what orbits it") and the ring tightens
 * around it. Verified empirically: at full size the fitted board rendered at
 * ~0.08 zoom — unreadable; at this scale the stars land near 0.75.
 */
export const DRAFT_BOARD_SCALE = 0.4;
/**
 * The card's height is CSS-clamped on the board (`.gaddr-draft--constellation`),
 * so however much the writer wrote, its board box can never exceed this. MUST
 * stay in sync with the `max-height` in globals.css — it is what guarantees the
 * ring clears the draft for ANY draft length.
 */
export const DRAFT_BOARD_MAX_HEIGHT = 900;
/** The draft's worst-case half-extents on the board, after clamp + scale. */
export const DRAFT_BOARD_HALF_W = (DRAFT_WIDTH * DRAFT_BOARD_SCALE) / 2;
export const DRAFT_BOARD_HALF_H =
  (DRAFT_BOARD_MAX_HEIGHT * DRAFT_BOARD_SCALE) / 2;

// ── Node sizes (the renderer applies these; the layout reserves the space) ────

export const STAR_WIDTH = 248;
export const STAR_HEIGHT = 104;
/** The crux star is deliberately larger — redundant with its ⚡ marker and glow. */
export const CRUX_STAR_WIDTH = 288;
export const CRUX_STAR_HEIGHT = 120;
export const CARD_WIDTH = 320;
export const CARD_HEIGHT = 188;
/** An OPENED card's framing height. A card grows well past its collapsed
 * reservation once the body, the reaction row and the actions are showing, and
 * the camera must frame what is actually there — not the collapsed box. The
 * body itself is scroll-clamped in CSS so this stays an upper bound. */
export const OPENED_CARD_HEIGHT = 420;

// ── Ring geometry ────────────────────────────────────────────────────────────

/**
 * Ring radii. Each clears the scaled draft's half-extent PLUS half a star PLUS a
 * breathing gap, so no star sits on the writer's words:
 *   rx = 179 (half scaled draft) + 124 (half star) + gap
 *   ry = 208 (half scaled draft) +  52 (half star) + gap
 * The ellipse is deliberately wider than tall — it fills a landscape viewport
 * instead of forcing the fit to zoom out to reach a tall bounding box.
 */
export const RING_RX = 540;
export const RING_RY = 280;

/**
 * The off-map zone's centre — a COLUMN to the right of the ring, outside it and
 * clearly its own region ("beyond what you wrote"), never mixed into the orbit.
 *
 * Deliberately to the SIDE rather than below: the board's chrome (the status
 * line, "Sprint complete", the actions) lives in a bottom-centre stack, and an
 * off-map star placed under the ring landed on top of it — the 2026-03 audit's
 * corner-collision failure, reproduced in-browser. Sideways also keeps the
 * board's bounding box landscape, which is what the viewport actually is.
 */
export const OFFMAP_GAP = 560;
export const OFFMAP_CENTER = {
  x: DRAFT_CENTER.x + RING_RX + OFFMAP_GAP,
  y: DRAFT_CENTER.y,
};
/** Vertical spacing between off-map seeds (1–3 of them, stacked). */
const OFFMAP_SPACING = 150;

/**
 * Ring slots per star count. An even 360/N spread is deterministic but not
 * COMPOSED at the counts we actually ship: three stars at -60/60/180 puts two on
 * the right flank and exiles one to the far left. These sets are balanced by
 * hand for N=1..4 (the common cases) and fall back to an even spread beyond,
 * which is where the difference stops mattering. Slot 0 is always the prime
 * position — the crux takes it.
 */
const RING_ANGLES: Readonly<Record<number, readonly number[]>> = {
  1: [-90],
  2: [-90, 90],
  3: [-90, 30, 150],
  4: [-90, 0, 90, 180],
};
const RING_START_DEG = -90;

function ringAngle(index: number, count: number): number {
  const preset = RING_ANGLES[count];
  const fromPreset = preset?.[index];
  if (fromPreset !== undefined) return fromPreset;
  return RING_START_DEG + (360 / Math.max(count, 1)) * index;
}

/**
 * How far a card sits from its star's centre, along the outward ray, and the
 * angular gap between successive cards. These two are a PAIR: adjacent cards are
 * a chord `2·R·sin(θ/2)` apart, which must exceed the card width or the fan
 * overlaps itself (it did — verified in-browser at R=330/θ=34°, where the chord
 * was ~193 against 320-wide cards). At R=560/θ=42° the chord is ~401, clearing
 * the card width with room to breathe. Cards are read at FOCUS zoom (expanding a
 * star re-frames to its cluster), so a generous radius costs nothing.
 */
const CARD_RADIUS = 560;
const CARD_FAN_STEP_DEG = 42;

function deg2rad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/** Convert a centre point + size into React Flow's top-left `position`. */
export function toTopLeft(
  center: { readonly x: number; readonly y: number },
  width: number,
  height: number,
): { x: number; y: number } {
  return { x: center.x - width / 2, y: center.y - height / 2 };
}

/** A star placed on the canvas — its centre plus the role flags the renderer
 * needs. `angleDeg` is the outward direction its card fan points. */
export interface PlacedStar {
  readonly star: BoardStar;
  readonly x: number;
  readonly y: number;
  readonly isCrux: boolean;
  readonly isOffMap: boolean;
  readonly angleDeg: number;
  /** 0-based position in reading/Tab order across the whole board. */
  readonly order: number;
}

/** A node card placed relative to its star's fan. */
export interface PlacedCard {
  readonly node: BoardNode;
  readonly x: number;
  readonly y: number;
}

/** A hub-and-spoke edge (star → card). Card-to-card edges are never drawn (§6). */
export interface LayoutEdge {
  readonly id: string;
  readonly starId: string;
  readonly nodeId: string;
}

export interface ConstellationLayout {
  readonly stars: readonly PlacedStar[];
  readonly cards: readonly PlacedCard[];
  readonly edges: readonly LayoutEdge[];
}

/** Place a star's visible cards in a fan centred on the star's outward ray, so
 * the cards splay away from the draft and from neighbouring stars. */
function placeCards(star: PlacedStar, cards: readonly BoardNode[]): PlacedCard[] {
  const n = cards.length;
  if (n === 0) return [];
  const spread = (n - 1) * CARD_FAN_STEP_DEG;
  const start = star.angleDeg - spread / 2;
  return cards.map((node, i) => {
    const a = deg2rad(start + i * CARD_FAN_STEP_DEG);
    return {
      node,
      x: star.x + CARD_RADIUS * Math.cos(a),
      y: star.y + CARD_RADIUS * Math.sin(a),
    };
  });
}

/**
 * Compute the whole board layout. `stars` arrive in assembly rank order (crux
 * first among core; off-map last). `cruxStarId` (a persisted star id) marks the
 * dominant star. Only `visible` nodes are laid out — the "more" partition is
 * ranked but not placed.
 */
export function layoutConstellation(input: {
  readonly stars: readonly BoardStar[];
  readonly nodes: readonly BoardNode[];
  readonly cruxStarId: string | null;
  /** The draft card's ACTUAL centre on the canvas. The card's height depends on
   * how much the writer wrote, so the ring is centred on what is really there
   * rather than on an assumed box — otherwise a short draft floats above its own
   * constellation. Defaults to the nominal centre for tests/first paint. */
  readonly center?: { readonly x: number; readonly y: number };
}): ConstellationLayout {
  const center = input.center ?? DRAFT_CENTER;
  const core = input.stars.filter((s) => s.kind === "star");
  const offMap = input.stars.filter((s) => s.kind === "off-map");

  // Order core stars so the crux leads: it takes the prime ring slot AND first
  // Tab stop, then the rest keep their assembly rank.
  const cruxFirst =
    input.cruxStarId === null
      ? core
      : [
          ...core.filter((s) => s.id === input.cruxStarId),
          ...core.filter((s) => s.id !== input.cruxStarId),
        ];

  const placedStars: PlacedStar[] = [];
  const slotCount = Math.max(cruxFirst.length, 1);

  cruxFirst.forEach((star, i) => {
    // A composed slot for this star count (see RING_ANGLES) — deterministic, and
    // spread so no two stars' fans collide.
    const angle = ringAngle(i, slotCount);
    placedStars.push({
      star,
      x: center.x + RING_RX * Math.cos(deg2rad(angle)),
      y: center.y + RING_RY * Math.sin(deg2rad(angle)),
      isCrux: star.id === input.cruxStarId,
      isOffMap: false,
      // Cards fan outward, directly away from the draft at the centre.
      angleDeg: angle,
      order: i,
    });
  });

  // Off-map: a stacked column in its own zone beside the ring, clearly apart.
  const offMapSpan = (offMap.length - 1) * OFFMAP_SPACING;
  offMap.forEach((star, i) => {
    placedStars.push({
      star,
      x: center.x + RING_RX + OFFMAP_GAP,
      y: center.y - offMapSpan / 2 + i * OFFMAP_SPACING,
      isCrux: false,
      isOffMap: true,
      // Off-map fans point further out, never back through the ring.
      angleDeg: 20,
      order: cruxFirst.length + i,
    });
  });

  // Cards + hub-and-spoke edges, grouped under their star.
  const cards: PlacedCard[] = [];
  const edges: LayoutEdge[] = [];
  for (const placed of placedStars) {
    const own = input.nodes.filter(
      (node) => node.visible && node.starId === placed.star.id,
    );
    for (const pc of placeCards(placed, own)) {
      cards.push(pc);
      edges.push({
        id: `${placed.star.id}->${pc.node.id}`,
        starId: placed.star.id,
        nodeId: pc.node.id,
      });
    }
  }

  return { stars: placedStars, cards, edges };
}

/** How many VISIBLE cards hang off a star — the count the collapsed anchor shows
 * so the writer knows there is something behind it. */
export function visibleCardCount(
  starId: string,
  nodes: readonly BoardNode[],
): number {
  return nodes.filter((n) => n.visible && n.starId === starId).length;
}

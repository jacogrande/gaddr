"use client";

import {
  ReactFlow,
  Background,
  BackgroundVariant,
  Panel,
  useReactFlow,
  useNodesInitialized,
  ReactFlowProvider,
  type Edge,
  type Node,
} from "@xyflow/react";
import "@xyflow/react/dist/base.css";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { EditorCardNode } from "./editor-card-node";
import type { BoardMode } from "./use-board-entry";
import type { BoardNode, BoardStar } from "./constellation-glue";
import type { RunStatus } from "../../../domain/constellation/run-types";
import {
  CARD_HEIGHT,
  CARD_WIDTH,
  OPENED_CARD_HEIGHT,
  DRAFT_HEIGHT,
  DRAFT_WIDTH,
  CRUX_STAR_HEIGHT,
  CRUX_STAR_WIDTH,
  layoutConstellation,
  STAR_HEIGHT,
  STAR_WIDTH,
  toTopLeft,
  visibleCardCount,
} from "./constellation-layout";
import {
  ConstellationStarNode,
  type StarNodeData,
} from "./constellation-star-node";
import {
  ConstellationCardNode,
  type CardNodeData,
} from "./constellation-card-node";
import { ConstellationStatus } from "./constellation-status";

const NODE_WIDTH = 896;

const nodeTypes = {
  editorCard: EditorCardNode,
  constellationStar: ConstellationStarNode,
  constellationCard: ConstellationCardNode,
} as const;

/** What the board needs to render a constellation. Supplied by the composition;
 * `stars` empty means beat one has not landed yet. */
export interface CanvasConstellation {
  readonly status: RunStatus | null;
  readonly stars: readonly BoardStar[];
  readonly nodes: readonly BoardNode[];
  readonly cruxStarId: string | null;
  readonly confidence: "high" | "low" | null;
  readonly resumable: boolean;
  readonly onOpen: (nodeId: string) => void;
  readonly onReact: (nodeId: string, reaction: string) => void;
  readonly onDismiss: (nodeId: string) => void;
  readonly onSetAside: (nodeId: string) => void;
  readonly onRetry: () => void;
}

type CanvasFlowProps = {
  boardMode: BoardMode;
  onExitBoard: () => void;
  onNewFreewrite: () => void;
  constellation: CanvasConstellation;
  /** Reports whether the board currently has something open (a focused star or
   * an opened card). The editor shell uses it to decide whether Escape means
   * "close what's open here" or "leave the board" — see the note on the Escape
   * handler below. */
  onBoardFocusChange?: (hasFocus: boolean) => void;
};

const TRANSITION_DURATION_MS = 1400;
/** Re-framing when the constellation arrives or focus changes — quick enough to
 * feel responsive, slow enough to stay orienting rather than jarring. */
const REFRAME_DURATION_MS = 700;
const FIT_VIEW_PADDING = 0.5;
/** Padding when the whole constellation is in frame — a touch tighter, since the
 * ring already carries its own generous negative space. */
const CONSTELLATION_PADDING = 0.12;
/** Padding when one star's cluster is focused. */
const FOCUS_PADDING = 0.22;
/** The board may zoom PAST 1:1 — a two-card cluster should fill the screen and
 * be read comfortably, not sit tiny in the middle of it. */
const MAX_ZOOM = 1.35;
/** A focused cluster never renders smaller than this, so body text keeps the
 * size the stylesheet authored (see `minZoom` on frameBoxes). */
const FOCUS_MIN_ZOOM = 1;
/**
 * Vertical space the board's bottom-centre chrome occupies (status line, "Sprint
 * complete", the two actions). Framing centres content in the area ABOVE this,
 * so a star or card can never land behind the controls — the 2026-03 audit's
 * chrome-collision failure, which reappeared in-browser the moment a focused
 * cluster was centred in the full viewport.
 */
const BOTTOM_CHROME_PX = 215;

/** The OS reduced-motion preference. The board's dominant motion is the camera
 * (`setViewport` durations), which is JS-driven and so invisible to the CSS
 * `prefers-reduced-motion` block — a user who asked for less motion still got
 * the full zoom/pan choreography, the one piece most likely to affect them. */
function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

function CanvasFlowInner({
  boardMode,
  onExitBoard,
  onNewFreewrite,
  constellation,
  onBoardFocusChange,
}: CanvasFlowProps) {
  const reactFlow = useReactFlow();
  const containerRef = useRef<HTMLDivElement>(null);
  const hasAnimatedIn = useRef(false);
  const hasInitialFitRef = useRef(false);

  const [expandedStarId, setExpandedStarId] = useState<string | null>(null);
  const [openedCardId, setOpenedCardId] = useState<string | null>(null);

  const boardActive = boardMode !== "hidden";
  const hasConstellation = constellation.stars.length > 0;

  // The ring centres on the draft card's REAL centre (its height depends on how
  // much was written), so a short draft never floats above its own constellation.
  const [draftCenter, setDraftCenter] = useState({
    x: DRAFT_WIDTH / 2,
    y: DRAFT_HEIGHT / 2,
  });

  const layout = useMemo(
    () =>
      layoutConstellation({
        stars: constellation.stars,
        nodes: constellation.nodes,
        cruxStarId: constellation.cruxStarId,
        center: draftCenter,
      }),
    [constellation.stars, constellation.nodes, constellation.cruxStarId, draftCenter],
  );

  const handleToggleStar = useCallback((starId: string) => {
    setExpandedStarId((current) => (current === starId ? null : starId));
    setOpenedCardId(null);
  }, []);

  const handleOpenCard = useCallback(
    (nodeId: string) => {
      setOpenedCardId(nodeId);
      constellation.onOpen(nodeId);
    },
    [constellation],
  );

  const handleCloseCard = useCallback(() => {
    setOpenedCardId(null);
  }, []);

  // ── Nodes ──────────────────────────────────────────────────────────────────
  const nodes: Node[] = useMemo(() => {
    const editorNode: Node = {
      id: "editor-card",
      type: "editorCard",
      position: { x: 0, y: 0 },
      data: {},
      draggable: false,
      selectable: false,
      style: { width: NODE_WIDTH },
      // The draft recedes while a star is focused, so the constellation reads.
      className: [
        // While a constellation is showing, the draft shrinks to the centre mark
        // the ring orbits — at board zoom it is context, never a reading surface.
        boardActive && hasConstellation ? "gaddr-draft--constellation" : "",
        expandedStarId !== null ? "gaddr-draft--receded" : "",
      ]
        .filter(Boolean)
        .join(" "),
    };
    if (!boardActive || !hasConstellation) return [editorNode];

    const starNodes: Node[] = layout.stars.map((placed) => {
      const width = placed.isCrux ? CRUX_STAR_WIDTH : STAR_WIDTH;
      const height = placed.isCrux ? CRUX_STAR_HEIGHT : STAR_HEIGHT;
      const data: StarNodeData = {
        star: placed.star,
        isCrux: placed.isCrux,
        isOffMap: placed.isOffMap,
        leadsOffMap:
          placed.isOffMap &&
          layout.stars.filter((p) => p.isOffMap)[0]?.star.id === placed.star.id,
        cardCount: visibleCardCount(placed.star.id, constellation.nodes),
        runComplete: constellation.status === "complete",
        expanded: expandedStarId === placed.star.id,
        dimmed: expandedStarId !== null && expandedStarId !== placed.star.id,
        onToggle: handleToggleStar,
      };
      return {
        id: `star:${placed.star.id}`,
        type: "constellationStar",
        position: toTopLeft(placed, width, height),
        data,
        draggable: false,
        selectable: false,
        style: {
          width,
          // Staggered ignition: each star lights in reading order.
          ["--ignite-delay" as string]: `${String(placed.order * 70)}ms`,
        },
        className: "gaddr-star-node",
      };
    });

    // Only the expanded star's cards are mounted — progressive disclosure keeps
    // the board scannable and the edges purposeful.
    const cardNodes: Node[] = layout.cards
      .filter((c) => c.node.starId === expandedStarId)
      .map((placed, index) => {
        const starOf = layout.stars.find((p) => p.star.id === placed.node.starId);
        const data: CardNodeData = {
          node: placed.node,
          opened: openedCardId === placed.node.id,
          onOpen: handleOpenCard,
          onClose: handleCloseCard,
          onReact: constellation.onReact,
          onDismiss: constellation.onDismiss,
          onSetAside: constellation.onSetAside,
        };
        return {
          id: `card:${placed.node.id}`,
          type: "constellationCard",
          position: toTopLeft(placed, CARD_WIDTH, CARD_HEIGHT),
          data,
          draggable: false,
          selectable: false,
          style: {
            width: CARD_WIDTH,
            // Sequenced AFTER the camera settles rather than racing it, and
            // originating at the star so the fan reads as unfurling from its hub
            // instead of popping in place.
            ["--unfurl-delay" as string]: `${String(Math.round(REFRAME_DURATION_MS * 0.55) + index * 60)}ms`,
            ["--unfurl-from-x" as string]: `${String(Math.round((starOf?.x ?? placed.x) - placed.x))}px`,
            ["--unfurl-from-y" as string]: `${String(Math.round((starOf?.y ?? placed.y) - placed.y))}px`,
            zIndex: openedCardId === placed.node.id ? 40 : 10,
          },
          className: "gaddr-card-node",
        };
      });

    // Splice the expanded star's cards in directly after their star so Tab order
    // matches what the writer is looking at, instead of walking every dimmed
    // star first.
    const ordered: Node[] = [editorNode];
    for (const starNode of starNodes) {
      ordered.push(starNode);
      if (starNode.id === `star:${expandedStarId ?? ""}`) ordered.push(...cardNodes);
    }
    return ordered;
  }, [
    boardActive,
    hasConstellation,
    layout,
    constellation,
    expandedStarId,
    openedCardId,
    handleToggleStar,
    handleOpenCard,
    handleCloseCard,
  ]);

  // ── Edges: star → card hub-and-spoke, only for the expanded star ────────────
  const edges: Edge[] = useMemo(() => {
    if (!boardActive || !hasConstellation) return [];
    // AT REST: faint draft→star spokes. Without these the board is just boxes on
    // a dot grid — the "your draft at the centre of its own constellation"
    // structure exists in the geometry but never reaches the screen. Still
    // strictly hub-and-spoke (§6): draft→star, star→card, never card-to-card.
    if (expandedStarId === null) {
      return layout.stars.map((p) => ({
        id: `draft->${p.star.id}`,
        source: "editor-card",
        target: `star:${p.star.id}`,
        type: "straight",
        className: p.isOffMap ? "gaddr-spoke gaddr-spoke--rest gaddr-spoke--offmap" : "gaddr-spoke gaddr-spoke--rest",
        selectable: false,
      }));
    }
    return layout.edges
      .filter((e) => e.starId === expandedStarId)
      .map((e) => ({
        id: e.id,
        source: `star:${e.starId}`,
        target: `card:${e.nodeId}`,
        type: "straight",
        className: "gaddr-spoke",
        selectable: false,
      }));
  }, [boardActive, hasConstellation, expandedStarId, layout.edges, layout.stars]);

  /** Viewport that shows the editor node at zoom=1, horizontally centered. */
  const getCenteredViewport = useCallback(() => {
    const node = reactFlow.getNode("editor-card");
    if (!node) return null;
    const w = containerRef.current?.clientWidth ?? window.innerWidth;
    const nodeWidth = node.measured?.width ?? NODE_WIDTH;
    return { x: (w - nodeWidth) / 2 - node.position.x, y: 0, zoom: 1 };
  }, [reactFlow]);

  /**
   * Frame the whole board. With a constellation, the fit targets the STARS ONLY:
   * the draft node's measured box is its full 896×1040 (the CSS scale that shrinks
   * it on the board is a transform React Flow does not measure), so including it
   * would inflate the bounding box and zoom the stars down to illegibility. The
   * scaled draft sits comfortably inside the ring, so framing the ring frames it
   * too.
   */
  /**
   * Frame a set of nodes into the canvas area ABOVE the bottom chrome. React
   * Flow's `fitView` centres in the whole viewport, which parks content behind
   * the controls, and its padding is symmetric so it cannot express "leave room
   * at the bottom" — hence the explicit viewport maths here.
   */
  /**
   * Frame a set of BOXES (centre + size) into the canvas area ABOVE the bottom
   * chrome.
   *
   * Bounds come from the LAYOUT, never from React Flow's measured node state:
   * `getNodesBounds` silently treats an unmeasured node as zero-sized, which
   * clipped the off-map cluster off the right edge (verified in-browser). The
   * layout already knows every position and size deterministically, so this is
   * both more robust and truer to the "same input ⇒ same board" rule.
   *
   * The explicit viewport maths (rather than `fitView`) is what lets the frame
   * leave room at the bottom — `fitView` centres in the whole viewport and its
   * padding is symmetric, so content parked behind the controls.
   */
  const frameBoxes = useCallback(
    (
      boxes: readonly {
        readonly x: number;
        readonly y: number;
        readonly w: number;
        readonly h: number;
      }[],
      padding: number,
      duration: number,
      /** Never frame below this zoom. The board is a READING surface: at a fit
       * zoom of 0.75 the card body rendered ~10px, and on a laptop viewport
       * ~8px — the stylesheet's legibility floors are meaningless if the camera
       * scales them away. A focused read clamps to 1:1 and lets the writer pan
       * instead of shrinking the text. */
      minZoom = 0,
    ) => {
      const container = containerRef.current;
      if (container === null || boxes.length === 0) return;
      const minX = Math.min(...boxes.map((b) => b.x - b.w / 2));
      const maxX = Math.max(...boxes.map((b) => b.x + b.w / 2));
      const minY = Math.min(...boxes.map((b) => b.y - b.h / 2));
      const maxY = Math.max(...boxes.map((b) => b.y + b.h / 2));
      const bw = maxX - minX;
      const bh = maxY - minY;
      if (bw <= 0 || bh <= 0) return;

      const w = container.clientWidth;
      const usableH = Math.max(container.clientHeight - BOTTOM_CHROME_PX, 120);
      const zoom = Math.max(
        minZoom,
        Math.min(w / (bw * (1 + padding)), usableH / (bh * (1 + padding)), MAX_ZOOM),
      );
      void reactFlow.setViewport(
        {
          x: w / 2 - (minX + bw / 2) * zoom,
          y: usableH / 2 - (minY + bh / 2) * zoom,
          zoom,
        },
        { duration },
      );
    },
    [reactFlow],
  );

  /** Every star's box, from the layout's own sizes. */
  const starBoxes = useCallback(
    () =>
      layout.stars.map((p) => ({
        x: p.x,
        y: p.y,
        w: p.isCrux ? CRUX_STAR_WIDTH : STAR_WIDTH,
        h: p.isCrux ? CRUX_STAR_HEIGHT : STAR_HEIGHT,
      })),
    [layout.stars],
  );

  const fitWholeBoard = useCallback(
    (duration: number) => {
      if (!hasConstellation) {
        void reactFlow.fitView({
          duration: prefersReducedMotion() ? 0 : duration,
          padding: FIT_VIEW_PADDING,
          nodes: [{ id: "editor-card" }],
        });
        return;
      }
      frameBoxes(starBoxes(), CONSTELLATION_PADDING, duration);
    },
    [hasConstellation, reactFlow, frameBoxes, starBoxes],
  );

  // Lock viewport at zoom=1 centered on the node in writing mode
  useEffect(() => {
    if (boardActive) return;
    const vp = getCenteredViewport();
    if (vp) void reactFlow.setViewport(vp);
  }, [boardActive, getCenteredViewport, reactFlow]);

  // Instant-fit on first mount into a board-active state (e.g. refresh into
  // the completion view).
  useEffect(() => {
    if (hasInitialFitRef.current) return;
    if (!boardActive) return;
    hasInitialFitRef.current = true;
    hasAnimatedIn.current = true;

    let cancelled = false;
    const raf = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (cancelled) return;
        fitWholeBoard(0);
      });
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
    };
  }, [boardActive, fitWholeBoard]);

  // Zoom out when transitioning in — the first beat of the reveal.
  useEffect(() => {
    if (boardMode !== "transition_in") {
      hasAnimatedIn.current = false;
      return;
    }
    if (hasAnimatedIn.current) return;
    hasAnimatedIn.current = true;

    let cancelled = false;
    const raf = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (cancelled) return;
        fitWholeBoard(TRANSITION_DURATION_MS);
      });
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
    };
  }, [boardMode, fitWholeBoard]);

  // Beat two: when the stars first arrive (or their count grows) while the board
  // is already open, re-frame so the new constellation is actually in view.
  //
  // The fit MUST wait for `nodesInitialized`: React Flow computes a fit from
  // MEASURED node boxes, and firing before the star nodes have been measured
  // frames a bounding box that does not exist yet — which rendered the
  // constellation clipped off the top of the viewport. (Verified in-browser.)
  const starCount = layout.stars.length;
  const nodesInitialized = useNodesInitialized();

  // Read the draft card's measured box once it exists, so the ring centres on it.
  // Its board height is CSS-clamped, so a very long draft cannot grow a card tall
  // enough to reach the ring.
  useEffect(() => {
    if (!boardActive) return;
    // Read the rendered box straight from the DOM on the next frame. React Flow's
    // `measured` is not reliably populated for this node when we need it, and
    // `nodesInitialized` gates too late — a wrong height leaves the draft floating
    // outside its own ring (verified in-browser).
    let cancelled = false;
    const raf = requestAnimationFrame(() => {
      if (cancelled) return;
      const el = containerRef.current?.querySelector<HTMLElement>(
        '.react-flow__node[data-id="editor-card"]',
      );
      if (el === null || el === undefined) return;
      const next = { x: el.offsetWidth / 2, y: el.offsetHeight / 2 };
      setDraftCenter((current) =>
        current.x === next.x && current.y === next.y ? current : next,
      );
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
    };
  }, [boardActive, constellation.stars, constellation.status]);

  // Re-frame whenever the ring's centre moves (the draft box was measured), or
  // the constellation would stay framed on where the stars used to be.
  const framedCenterRef = useRef<string>("");
  useEffect(() => {
    if (!boardActive || !hasConstellation || expandedStarId !== null) return;
    const key = `${String(draftCenter.x)}:${String(draftCenter.y)}`;
    if (framedCenterRef.current === key) return;
    framedCenterRef.current = key;
    fitWholeBoard(REFRAME_DURATION_MS);
  }, [boardActive, hasConstellation, expandedStarId, draftCenter, fitWholeBoard]);
  const framedStarCountRef = useRef(0);
  useEffect(() => {
    if (!boardActive || boardMode === "transition_in") return;
    if (!nodesInitialized) return;
    if (starCount === framedStarCountRef.current) return;
    framedStarCountRef.current = starCount;
    if (starCount === 0 || expandedStarId !== null) return;
    fitWholeBoard(REFRAME_DURATION_MS);
  }, [
    boardActive,
    boardMode,
    nodesInitialized,
    starCount,
    expandedStarId,
    fitWholeBoard,
  ]);

  // Focus: expanding a star frames it with its cards; collapsing returns to the
  // whole board. The re-frame is what makes an expanded fan readable at all.
  useEffect(() => {
    if (!boardActive || !hasConstellation) return;
    if (expandedStarId === null) {
      fitWholeBoard(REFRAME_DURATION_MS);
      return;
    }
    const focused = layout.stars.find((p) => p.star.id === expandedStarId);
    const openedCard = layout.cards.find((c) => c.node.id === openedCardId);
    const boxes = [
      ...(focused === undefined
        ? []
        : [
            {
              x: focused.x,
              y: focused.y,
              w: focused.isCrux ? CRUX_STAR_WIDTH : STAR_WIDTH,
              h: focused.isCrux ? CRUX_STAR_HEIGHT : STAR_HEIGHT,
            },
          ]),
      // When a card is OPEN, frame the star and that card only: an opened card
      // grows well past its collapsed reservation (a full 900-char body is ~3x
      // CARD_HEIGHT), and framing the whole fan would push it off-screen behind
      // the chrome — the one flow this board exists for.
      ...(openedCard !== undefined
        ? [{ x: openedCard.x, y: openedCard.y, w: CARD_WIDTH, h: OPENED_CARD_HEIGHT }]
        : layout.cards
            .filter((c) => c.node.starId === expandedStarId)
            .map((c) => ({ x: c.x, y: c.y, w: CARD_WIDTH, h: CARD_HEIGHT }))),
    ];
    const timer = window.setTimeout(() => {
      frameBoxes(boxes, FOCUS_PADDING, REFRAME_DURATION_MS, FOCUS_MIN_ZOOM);
    }, 30);
    return () => {
      window.clearTimeout(timer);
    };
    // `layout.cards` is derived from the same inputs; re-running on focus change
    // is the intent.
  }, [
    expandedStarId,
    openedCardId,
    boardActive,
    hasConstellation,
    layout.cards,
    layout.stars,
    frameBoxes,
    fitWholeBoard,
  ]);

  // Zoom back to 1:1 when transitioning out
  useEffect(() => {
    if (boardMode !== "transition_out") return;
    const vp = getCenteredViewport();
    if (vp)
      void reactFlow.setViewport(vp, {
        duration: prefersReducedMotion() ? 0 : TRANSITION_DURATION_MS,
      });
  }, [boardMode, getCenteredViewport, reactFlow]);

  // Escape collapses the focused card, then the focused star — the board's one
  // global key.
  //
  // Registered ONCE (state is read through refs) and in CAPTURE phase. Both
  // matter: the editor shell has its own window/capture Escape listener that
  // exits the board, listeners on the same target fire in REGISTRATION order,
  // and a listener that re-subscribes whenever state changes moves to the BACK
  // of that queue — which is why an effect keyed on the focus state lost the
  // race the moment a card was actually open. `stopImmediatePropagation` is
  // then what prevents the shell's sibling listener from also firing.
  // Tell the shell whether anything is open here, so its own Escape handler can
  // stand down. Ordering between two window/capture listeners is not something
  // to fight over: the shell's re-subscribes on many deps, ours on one, so which
  // fires first is incidental — and `stopImmediatePropagation` only helps the
  // listener that happens to run first. Making the shell DEFER is deterministic.
  useEffect(() => {
    onBoardFocusChange?.(expandedStarId !== null || openedCardId !== null);
  }, [expandedStarId, openedCardId, onBoardFocusChange]);

  const escapeStateRef = useRef({ expandedStarId, openedCardId });
  escapeStateRef.current = { expandedStarId, openedCardId };
  useEffect(() => {
    if (!boardActive) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      const { expandedStarId: star, openedCardId: card } = escapeStateRef.current;
      if (card !== null) {
        event.stopImmediatePropagation();
        event.preventDefault();
        setOpenedCardId(null);
        return;
      }
      if (star !== null) {
        event.stopImmediatePropagation();
        event.preventDefault();
        setExpandedStarId(null);
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => {
      window.removeEventListener("keydown", onKey, true);
    };
  }, [boardActive]);

  // A new sprint clears any focus so the board never reopens mid-expansion.
  useEffect(() => {
    if (!boardActive) {
      setExpandedStarId(null);
      setOpenedCardId(null);
    }
  }, [boardActive]);

  const handleNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      // Clicking the draft returns to writing ONLY when there is no constellation
      // to review. With a constellation the draft is scaled to a small centre
      // mark, but its React Flow wrapper is still the full unscaled ~896x900 box
      // — so a click anywhere near the middle of the board would silently eject
      // the writer out of review. "Resume writing" is the explicit affordance.
      if (boardMode === "visible" && node.id === "editor-card" && !hasConstellation) {
        onExitBoard();
      }
    },
    [boardMode, onExitBoard, hasConstellation],
  );

  return (
    <div ref={containerRef} style={{ width: "100%", height: "100%" }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodeClick={handleNodeClick}
        panOnDrag={boardActive}
        zoomOnScroll={boardActive}
        zoomOnPinch={boardActive}
        zoomOnDoubleClick={false}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        minZoom={boardActive ? 0.05 : 1}
        maxZoom={boardActive ? MAX_ZOOM : 1}
        className="gaddr-react-flow"
        data-constellation={hasConstellation ? "true" : "false"}
      >
        {boardActive ? (
          <>
            <Background
              variant={BackgroundVariant.Dots}
              gap={36}
              size={2}
              className="gaddr-react-flow-bg"
            />
            {hasConstellation ? (
              <Panel position="top-center" className="gaddr-board-legend">
                <span className="gaddr-board-legend__mark" aria-hidden />
                Your draft sits at the centre. Open a star to see what it drew.
              </Panel>
            ) : null}
            <Panel
              position="bottom-center"
              className="gaddr-board-overlay animate-in fade-in slide-in-from-bottom-2 duration-700 delay-700 ease-out fill-mode-both motion-reduce:animate-none"
              data-testid="board-overlay"
            >
              <ConstellationStatus
                status={constellation.status}
                starCount={constellation.stars.length}
                cardCount={constellation.nodes.filter((n) => n.visible).length}
                resumable={constellation.resumable}
                confidence={constellation.confidence}
                onRetry={constellation.onRetry}
              />
              {constellation.status === null ? (
                <p className="gaddr-board-overlay__label">Sprint complete</p>
              ) : null}
              <button
                type="button"
                className="gaddr-board-overlay__resume"
                data-testid="board-resume-button"
                onClick={onExitBoard}
              >
                Resume writing
              </button>
              <button
                type="button"
                className="gaddr-board-overlay__new"
                data-testid="board-new-freewrite-button"
                onClick={onNewFreewrite}
              >
                Start a new freewrite
              </button>
            </Panel>
          </>
        ) : (
          <Panel position="bottom-center" className="gaddr-footer-panel">
            <span className="text-xs tracking-[0.18em] text-[color:var(--app-muted-soft)]">
              Copyright Gaddr 2026
            </span>
          </Panel>
        )}
      </ReactFlow>
    </div>
  );
}

const MemoizedCanvasFlow = memo(CanvasFlowInner);

export function CanvasFlow(props: CanvasFlowProps) {
  return (
    <ReactFlowProvider>
      <MemoizedCanvasFlow {...props} />
    </ReactFlowProvider>
  );
}

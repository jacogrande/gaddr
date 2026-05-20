"use client";

import {
  ReactFlow,
  Background,
  BackgroundVariant,
  Panel,
  useReactFlow,
  ReactFlowProvider,
  type Node,
} from "@xyflow/react";
import "@xyflow/react/dist/base.css";
import { memo, useCallback, useEffect, useMemo, useRef } from "react";
import { EditorCardNode } from "./editor-card-node";
import type { BoardMode } from "./minimal-editor";

const NODE_WIDTH = 896;

const nodeTypes = { editorCard: EditorCardNode } as const;

type CanvasFlowProps = {
  boardMode: BoardMode;
  onExitBoard: () => void;
};

const TRANSITION_DURATION_MS = 1400;
const FIT_VIEW_PADDING = 0.5;

function CanvasFlowInner({ boardMode, onExitBoard }: CanvasFlowProps) {
  const reactFlow = useReactFlow();
  const containerRef = useRef<HTMLDivElement>(null);
  const hasAnimatedIn = useRef(false);

  // Node identity is stable — content is injected via EditorCardContext, not node data.
  const nodes: Node[] = useMemo(
    () => [
      {
        id: "editor-card",
        type: "editorCard",
        position: { x: 0, y: 0 },
        data: {},
        draggable: false,
        selectable: false,
        style: { width: NODE_WIDTH },
      },
    ],
    [],
  );

  const boardActive = boardMode !== "hidden";

  /** Viewport that shows the editor node at zoom=1, horizontally centered. */
  const getCenteredViewport = useCallback(() => {
    const node = reactFlow.getNode("editor-card");
    if (!node) return null;
    const w = containerRef.current?.clientWidth ?? window.innerWidth;
    const nodeWidth = node.measured?.width ?? NODE_WIDTH;
    return { x: (w - nodeWidth) / 2 - node.position.x, y: 0, zoom: 1 };
  }, [reactFlow]);

  // Lock viewport at zoom=1 centered on the node in writing mode
  useEffect(() => {
    if (boardActive) return;
    const vp = getCenteredViewport();
    if (vp) void reactFlow.setViewport(vp);
  }, [boardActive, getCenteredViewport, reactFlow]);

  // Zoom out when transitioning in
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
        void reactFlow.fitView({
          duration: TRANSITION_DURATION_MS,
          padding: FIT_VIEW_PADDING,
          nodes: [{ id: "editor-card" }],
        });
      });
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
    };
  }, [boardMode, reactFlow]);

  // Zoom back to 1:1 when transitioning out
  useEffect(() => {
    if (boardMode !== "transition_out") return;
    const vp = getCenteredViewport();
    if (vp) void reactFlow.setViewport(vp, { duration: TRANSITION_DURATION_MS });
  }, [boardMode, getCenteredViewport, reactFlow]);

  const handleNodeClick = useCallback(() => {
    if (boardMode === "visible") {
      onExitBoard();
    }
  }, [boardMode, onExitBoard]);

  return (
    <div ref={containerRef} style={{ width: "100%", height: "100%" }}>
      <ReactFlow
        nodes={nodes}
        edges={[]}
        nodeTypes={nodeTypes}
        onNodeClick={handleNodeClick}
        panOnDrag={boardActive}
        zoomOnScroll={boardActive}
        zoomOnPinch={boardActive}
        zoomOnDoubleClick={false}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        minZoom={boardActive ? 0.1 : 1}
        maxZoom={1}
        className="gaddr-react-flow"
      >
        {boardActive ? (
          <>
            <Background
              variant={BackgroundVariant.Dots}
              gap={36}
              size={2}
              className="gaddr-react-flow-bg"
            />
            <Panel
              position="bottom-center"
              className="gaddr-board-overlay animate-in fade-in slide-in-from-bottom-2 duration-700 delay-700 ease-out fill-mode-both motion-reduce:animate-none"
              data-testid="board-overlay"
            >
              <p className="gaddr-board-overlay__label">Sprint complete</p>
              <button
                type="button"
                className="gaddr-board-overlay__resume"
                data-testid="board-resume-button"
                onClick={onExitBoard}
              >
                Resume writing
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

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
const NODE_HEIGHT = 600;

const nodeTypes = { editorCard: EditorCardNode } as const;

type CanvasFlowProps = {
  boardMode: BoardMode;
  cardLabel: string;
  onExitBoard: () => void;
};

const TRANSITION_DURATION_MS = 1400;
const FIT_VIEW_PADDING = 0.5;

function CanvasFlowInner({ boardMode, cardLabel, onExitBoard }: CanvasFlowProps) {
  const reactFlow = useReactFlow();
  const containerRef = useRef<HTMLDivElement>(null);
  const hasAnimatedIn = useRef(false);

  const nodes: Node[] = useMemo(
    () => [
      {
        id: "editor-card",
        type: "editorCard",
        position: { x: 0, y: 0 },
        data: { label: cardLabel },
        draggable: false,
        selectable: false,
        style: { width: NODE_WIDTH, height: NODE_HEIGHT },
      },
    ],
    [cardLabel],
  );

  // Zoom out when transitioning in
  useEffect(() => {
    if (boardMode !== "transition_in") {
      hasAnimatedIn.current = false;
      return;
    }
    if (hasAnimatedIn.current) return;
    hasAnimatedIn.current = true;

    const raf = requestAnimationFrame(() => {
      void reactFlow.fitView({
        duration: TRANSITION_DURATION_MS,
        padding: FIT_VIEW_PADDING,
        nodes: [{ id: "editor-card" }],
      });
    });

    return () => {
      cancelAnimationFrame(raf);
    };
  }, [boardMode, reactFlow]);

  // Zoom back to 1:1 when transitioning out
  useEffect(() => {
    if (boardMode !== "transition_out") return;

    const node = reactFlow.getNode("editor-card");
    if (!node) return;

    const containerWidth = containerRef.current?.clientWidth ?? window.innerWidth;
    const containerHeight = containerRef.current?.clientHeight ?? window.innerHeight;
    const nodeWidth = node.measured?.width ?? NODE_WIDTH;
    const nodeHeight = node.measured?.height ?? NODE_HEIGHT;

    void reactFlow.setViewport(
      {
        x: (containerWidth - nodeWidth) / 2 - node.position.x,
        y: (containerHeight - nodeHeight) / 2 - node.position.y,
        zoom: 1,
      },
      { duration: TRANSITION_DURATION_MS },
    );
  }, [boardMode, reactFlow]);

  const isInteractive = boardMode === "visible";

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
      panOnDrag={isInteractive}
      zoomOnScroll={isInteractive}
      zoomOnPinch={isInteractive}
      zoomOnDoubleClick={false}
      nodesDraggable={false}
      nodesConnectable={false}
      elementsSelectable={false}
      minZoom={0.1}
      maxZoom={1}
      fitView
      fitViewOptions={{ padding: FIT_VIEW_PADDING, nodes: [{ id: "editor-card" }] }}
      className="gaddr-react-flow"
    >
      <Background
        variant={BackgroundVariant.Dots}
        gap={36}
        size={1}
        className="gaddr-react-flow-bg"
      />
      <Panel position="bottom-center" className="gaddr-board-overlay" data-testid="board-overlay">
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

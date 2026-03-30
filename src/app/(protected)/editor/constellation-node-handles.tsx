"use client";

import { Handle, Position } from "@xyflow/react";
import {
  getConstellationHandleId,
  type ConstellationHandleSide,
} from "./constellation-flow-nodes";

const CONSTELLATION_HANDLE_SIDES: readonly ConstellationHandleSide[] = [
  "top",
  "right",
  "bottom",
  "left",
];

const HANDLE_POSITIONS: Record<ConstellationHandleSide, Position> = {
  top: Position.Top,
  right: Position.Right,
  bottom: Position.Bottom,
  left: Position.Left,
};

type ConstellationNodeHandlesProps = {
  source?: boolean;
  target?: boolean;
};

export function ConstellationNodeHandles({
  source = true,
  target = true,
}: ConstellationNodeHandlesProps) {
  return (
    <>
      {target
        ? CONSTELLATION_HANDLE_SIDES.map((side) => (
            <Handle
              key={`target-${side}`}
              id={getConstellationHandleId("target", side)}
              type="target"
              position={HANDLE_POSITIONS[side]}
              className="!invisible"
            />
          ))
        : null}
      {source
        ? CONSTELLATION_HANDLE_SIDES.map((side) => (
            <Handle
              key={`source-${side}`}
              id={getConstellationHandleId("source", side)}
              type="source"
              position={HANDLE_POSITIONS[side]}
              className="!invisible"
            />
          ))
        : null}
    </>
  );
}

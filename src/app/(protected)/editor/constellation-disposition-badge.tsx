"use client";

export function ConstellationDispositionBadge({
  label,
}: {
  label: string;
}) {
  return <span className="gaddr-constellation-pill">{label}</span>;
}

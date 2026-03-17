export function selectNextConstellationFocusableItemId(
  itemIds: readonly string[],
  currentItemId: string | null,
  direction: "previous" | "next",
): string | null {
  if (itemIds.length === 0) {
    return null;
  }

  if (!currentItemId) {
    return itemIds[0] ?? null;
  }

  const currentIndex = itemIds.indexOf(currentItemId);
  if (currentIndex === -1) {
    return itemIds[0] ?? null;
  }

  const nextIndex =
    direction === "next"
      ? (currentIndex + 1) % itemIds.length
      : (currentIndex - 1 + itemIds.length) % itemIds.length;

  return itemIds[nextIndex] ?? null;
}

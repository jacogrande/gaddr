export type HotkeyEvent = {
  key: string;
  metaKey: boolean;
  ctrlKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
};

export type HotkeyCommand = {
  id: string;
  label: string;
  hotkeys: string[];
};

export type ModifierBadge = {
  key: string;
  label: string;
};

export type DisplayModifierBadge = ModifierBadge & {
  exiting: boolean;
};

export type ModifierOrderingState = {
  orderByKey: Record<string, number>;
  nextOrder: number;
};

export type SlashQueryContext = {
  query: string;
  from: number;
  to: number;
};

export function createModifierOrderingState(): ModifierOrderingState {
  return { orderByKey: {}, nextOrder: 0 };
}

export function eventMatchesHotkey(event: HotkeyEvent, hotkey: string): boolean {
  const parts = hotkey.split("-").map((part) => part.toLowerCase());
  const requiresMod = parts.includes("mod");
  const requiresShift = parts.includes("shift");
  const requiresAlt = parts.includes("alt");
  const baseKey = parts.find((part) => part !== "mod" && part !== "shift" && part !== "alt");

  if (!baseKey) {
    return false;
  }

  const hasMod = event.metaKey || event.ctrlKey;

  if (hasMod !== requiresMod) {
    return false;
  }

  if (event.shiftKey !== requiresShift) {
    return false;
  }

  if (event.altKey !== requiresAlt) {
    return false;
  }

  return event.key.toLowerCase() === baseKey;
}

export function filterCommandsByQuery<T extends HotkeyCommand>(commands: readonly T[], rawQuery: string): T[] {
  const query = rawQuery.trim().toLowerCase();

  if (!query) {
    return [...commands];
  }

  return commands
    .map((command) => {
      const label = command.label.toLowerCase();
      const id = command.id.toLowerCase();
      const hotkeys = command.hotkeys.join(" ").toLowerCase();

      if (label.startsWith(query)) {
        return { command, rank: 0 };
      }

      if (id.startsWith(query)) {
        return { command, rank: 1 };
      }

      const labelIndex = label.indexOf(query);
      if (labelIndex >= 0) {
        return { command, rank: 10 + labelIndex };
      }

      const idIndex = id.indexOf(query);
      if (idIndex >= 0) {
        return { command, rank: 30 + idIndex };
      }

      const hotkeyIndex = hotkeys.indexOf(query);
      if (hotkeyIndex >= 0) {
        return { command, rank: 50 + hotkeyIndex };
      }

      return null;
    })
    .filter((entry): entry is { command: T; rank: number } => entry !== null)
    .sort((left, right) => {
      if (left.rank !== right.rank) {
        return left.rank - right.rank;
      }

      return left.command.label.localeCompare(right.command.label);
    })
    .map((entry) => entry.command);
}

export function listCommandHotkeyEntries<T extends HotkeyCommand>(
  commands: readonly T[],
): Array<{ command: T; hotkey: string }> {
  return commands.flatMap((command) =>
    command.hotkeys.map((hotkey) => ({
      command,
      hotkey,
    })),
  );
}

export function orderModifierBadges(
  activeBadges: readonly ModifierBadge[],
  previousState: ModifierOrderingState,
): { orderedBadges: ModifierBadge[]; signature: string; nextState: ModifierOrderingState } {
  const activeKeys = new Set(activeBadges.map((badge) => badge.key));
  const orderByKey = Object.fromEntries(
    Object.entries(previousState.orderByKey).filter(([key]) => activeKeys.has(key)),
  );
  let nextOrder = previousState.nextOrder;

  for (const badge of activeBadges) {
    if (orderByKey[badge.key] !== undefined) {
      continue;
    }

    nextOrder += 1;
    orderByKey[badge.key] = nextOrder;
  }

  if (activeBadges.length === 0) {
    nextOrder = 0;
  }

  const orderedBadges = [...activeBadges].sort((left, right) => {
    const leftOrder = orderByKey[left.key] ?? Number.MAX_SAFE_INTEGER;
    const rightOrder = orderByKey[right.key] ?? Number.MAX_SAFE_INTEGER;
    return leftOrder - rightOrder;
  });
  const signature = orderedBadges.map((badge) => badge.key).join("|");

  return {
    orderedBadges,
    signature,
    nextState: {
      orderByKey,
      nextOrder,
    },
  };
}

export function mergeDisplayModifiers(
  previous: readonly DisplayModifierBadge[],
  activeModifiers: readonly ModifierBadge[],
): DisplayModifierBadge[] {
  const activeByKey = new Map(activeModifiers.map((modifier) => [modifier.key, modifier] as const));
  const seen = new Set<string>();
  const next: DisplayModifierBadge[] = [];

  for (const modifier of previous) {
    const active = activeByKey.get(modifier.key);
    if (active) {
      next.push({ ...active, exiting: false });
      seen.add(modifier.key);
      continue;
    }

    next.push({ ...modifier, exiting: true });
  }

  for (const modifier of activeModifiers) {
    if (seen.has(modifier.key)) {
      continue;
    }

    next.push({ ...modifier, exiting: false });
  }

  return next;
}

export function collectExitingModifierKeys(displayModifiers: readonly DisplayModifierBadge[]): string[] {
  return displayModifiers.filter((modifier) => modifier.exiting).map((modifier) => modifier.key);
}

export function getSlashQueryContext(textBeforeCursor: string, cursorPos: number): SlashQueryContext | null {
  const match = textBeforeCursor.match(/(?:^|\s)\/([^\s/]*)$/);
  if (!match) {
    return null;
  }

  const query = match[1] ?? "";
  const from = cursorPos - (query.length + 1);

  return {
    query,
    from,
    to: cursorPos,
  };
}

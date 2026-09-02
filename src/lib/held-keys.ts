export type TypingKeyEvent = {
  key: string;
  code?: string;
  repeat?: boolean;
};

function holdId(event: TypingKeyEvent): string {
  return event.code || event.key;
}

/** First printable keydown only. OS repeats and held keys are rejected until keyup. */
export function acceptTypingKeydown(event: TypingKeyEvent, held: Set<string>): boolean {
  if (event.key.length !== 1) return false;
  if (event.repeat) return false;
  const id = holdId(event);
  if (held.has(id)) return false;
  held.add(id);
  return true;
}

export function releaseTypingKey(event: TypingKeyEvent, held: Set<string>): void {
  held.delete(holdId(event));
}

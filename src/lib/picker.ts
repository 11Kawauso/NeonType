export function pickNextId(ids: string[], lastId: string | null, random = Math.random): string {
  if (ids.length === 0) {
    throw new Error("問題がありません");
  }
  const candidates = lastId ? ids.filter((id) => id !== lastId) : ids;
  const pool = candidates.length > 0 ? candidates : ids;
  return pool[Math.floor(random() * pool.length)]!;
}

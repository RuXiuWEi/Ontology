export function parseJsonObjectInput(
  text: string,
  emptyError: string,
  invalidError: string,
): { ok: true; value: Record<string, unknown> } | { ok: false; message: string } {
  const trimmed = text.trim()
  if (!trimmed) {
    return { ok: false, message: emptyError }
  }
  try {
    const parsed = JSON.parse(trimmed)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return { ok: false, message: invalidError }
    }
    return { ok: true, value: parsed as Record<string, unknown> }
  } catch {
    return { ok: false, message: invalidError }
  }
}

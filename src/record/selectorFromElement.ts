/**
 * Build a stable Playwright selector from a serialized element descriptor
 * (captured at click time in the page, no full HTML needed).
 */
export type ElementDescriptor = {
  tagName: string;
  id?: string;
  className?: string;
  /** data-testid, data-e2e, data-placeholder, etc. */
  dataAttrs?: Record<string, string>;
  role?: string;
  ariaLabel?: string;
  name?: string;
  placeholder?: string;
  type?: string;
  /** Visible text (truncated). */
  text?: string;
  /** For fallback: path from body as list of [tagName, nthChild]. */
  path?: Array<[string, number]>;
  /** true if element is contenteditable or inside contenteditable (e.g. rich text editor). */
  contentEditable?: boolean;
};

function escapeAttr(v: string): string {
  return v.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

export function buildSelector(d: ElementDescriptor): string {
  const tag = (d.tagName || "div").toLowerCase();

  if (d.id && /^[a-zA-Z][\w-]*$/.test(d.id)) {
    return `#${escapeAttr(d.id)}`;
  }

  if (d.dataAttrs) {
    if (d.dataAttrs["data-testid"]) return `[data-testid="${escapeAttr(d.dataAttrs["data-testid"])}"]`;
    if (d.dataAttrs["data-e2e"]) return `[data-e2e="${escapeAttr(d.dataAttrs["data-e2e"])}"]`;
    if (d.dataAttrs["data-placeholder"]) return `[data-placeholder="${escapeAttr(d.dataAttrs["data-placeholder"])}"]`;
    const stableData = Object.entries(d.dataAttrs).find(([k]) => !k.startsWith("data-v-") && k !== "data-pf");
    if (stableData) return `[${stableData[0]}="${escapeAttr(stableData[1])}"]`;
  }

  if (d.role && (d.ariaLabel || d.name)) {
    const name = (d.ariaLabel ?? d.name ?? "").trim();
    if (name) return `role=${JSON.stringify(d.role)}[name=${JSON.stringify(name)}]`;
  }

  if (d.placeholder && (tag === "input" || tag === "textarea")) {
    return `${tag}[placeholder="${escapeAttr(d.placeholder)}"]`;
  }

  if (d.name && (tag === "input" || tag === "button")) {
    return `${tag}[name="${escapeAttr(d.name)}"]`;
  }

  const text = (d.text ?? "").trim().slice(0, 100);
  if (text) {
    return `text="${escapeAttr(text)}"`;
  }

  if (d.path && d.path.length > 0) {
    const parts = d.path.map(([t, n]) => `${t.toLowerCase()}:nth-child(${n})`).join(" >> ");
    return parts;
  }

  if (d.className) {
    const firstClass = d.className.split(/\s+/).find((c) => c.length > 0);
    if (firstClass) return `${tag}.${firstClass.split("-").map(escapeAttr).join(".")}`;
  }

  return tag;
}

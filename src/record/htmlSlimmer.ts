/**
 * Produce a slimmed HTML string from page content for LLM consumption:
 * strip scripts, styles, comments; optional head/svg path placeholders; shorten long URLs.
 */
export interface SlimHtmlOptions {
  /** Max length for src/href/data-src/data-href attribute values. Default 80. */
  maxAttributeLength?: number;
  /** Replace <head>...</head> with a short placeholder. Default true. */
  replaceHead?: boolean;
  /** Replace SVG <path d="..."> long d attribute with placeholder. Default true. */
  replaceSvgPath?: boolean;
}

const DEFAULT_OPTIONS: Required<SlimHtmlOptions> = {
  maxAttributeLength: 80,
  replaceHead: true,
  replaceSvgPath: true,
};

export function slimHtml(html: string, options?: SlimHtmlOptions | number): string {
  const opts: Required<SlimHtmlOptions> =
    typeof options === "number"
      ? { ...DEFAULT_OPTIONS, maxAttributeLength: options }
      : { ...DEFAULT_OPTIONS, ...options };

  let s = html;

  // Replace head with placeholder
  if (opts.replaceHead) {
    s = s.replace(/<head\b[^>]*>[\s\S]*?<\/head>/gi, "<head data-slimmed=\"true\">…</head>");
  }

  // Remove script and style blocks (content included)
  s = s.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "");
  s = s.replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "");
  s = s.replace(/<!--[\s\S]*?-->/g, "");

  // Replace SVG path d attribute with placeholder (path content is very long)
  if (opts.replaceSvgPath) {
    s = s.replace(/<path\b([^>]*)>/gi, (_, attrs) => {
      const slimmed = attrs.replace(/\sd=["'][^"']*["']/i, ' d="…"');
      return `<path${slimmed}>`;
    });
  }

  // Remove data-v-xxx attributes (Vue scoped, changes per build)
  s = s.replace(/\s+data-v-[a-f0-9]+(="[^"]*")?/gi, "");

  // Shorten long src/href/data-* attributes to avoid token explosion
  s = s.replace(
    /\b(src|href|data-src|data-href)="([^"]+)"/gi,
    (_, name, value) => {
      const maxLen = opts.maxAttributeLength;
      const v = value.length > maxLen ? value.slice(0, maxLen) + "…" : value;
      return `${name}="${v}"`;
    }
  );

  // Normalize whitespace in tags (single spaces)
  s = s.replace(/\s+/g, " ").trim();
  return s;
}

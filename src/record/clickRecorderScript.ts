/** Inject only click capture (no panel) + MutationObserver to re-attach on page re-render. */
export const INJECT_CLICK_RECORDER = `
(function() {
  function slimHtml(html) {
    var s = html;
    s = s.replace(/<head\\b[^>]*>[\\s\\S]*?<\\/head>/gi, '<head>…</head>');
    s = s.replace(/<script\\b[^>]*>[\\s\\S]*?<\\/script>/gi, '');
    s = s.replace(/<style\\b[^>]*>[\\s\\S]*?<\\/style>/gi, '');
    s = s.replace(/<!--[\\s\\S]*?-->/g, '');
    s = s.replace(/\\s+data-v-[a-f0-9]+(="[^"]*")?/gi, '');
    s = s.replace(/\\b(src|href|data-src|data-href)="([^"]{80})[^"]*"/gi, '$1="$2…"');
    s = s.replace(/\\s+/g, ' ').trim();
    return s;
  }
  function serialize(el) {
    if (!el || !el.getAttribute) return null;
    var dataAttrs = {};
    for (var i = 0; i < (el.attributes && el.attributes.length); i++) {
      var a = el.attributes[i];
      if (a.name.indexOf('data-') === 0 && a.name.indexOf('data-v-') !== 0) dataAttrs[a.name] = a.value;
    }
    var text = (el.innerText || el.textContent || '').trim().slice(0, 200);
    var path = [];
    var node = el;
    while (node && node !== document.body) {
      var parent = node.parentElement;
      if (!parent) break;
      var idx = Array.prototype.indexOf.call(parent.children, node) + 1;
      path.unshift([node.tagName, idx]);
      node = parent;
    }
    return {
      tagName: el.tagName,
      id: el.id || undefined,
      className: (typeof el.className === 'string') ? el.className : undefined,
      dataAttrs: Object.keys(dataAttrs).length ? dataAttrs : undefined,
      role: el.getAttribute('role') || undefined,
      ariaLabel: el.getAttribute('aria-label') || undefined,
      name: el.getAttribute('name') || undefined,
      placeholder: el.getAttribute('placeholder') || undefined,
      type: el.getAttribute('type') || undefined,
      text: text || undefined,
      path: path.length ? path : undefined,
      contentEditable: el.isContentEditable || (el.getAttribute && el.getAttribute('contenteditable') === 'true')
    };
  }
  var RECORD_MARK = 'data-pf';
  function attachClick() {
    var handler = function(e) {
      var el = e.target;
      if (!el || !el.getAttribute) return;
      document.querySelectorAll('[' + RECORD_MARK + ']').forEach(function(n) { n.removeAttribute(RECORD_MARK); });
      el.setAttribute(RECORD_MARK, '1');
      var d = serialize(el);
      if (d && window.__recordClick__) {
        var snapshot = slimHtml(document.documentElement.outerHTML);
        window.__recordClick__(d, snapshot);
      }
    };
    if (window.__recordClickHandler__) {
      document.removeEventListener('click', window.__recordClickHandler__, true);
    }
    window.__recordClickHandler__ = handler;
    document.addEventListener('click', handler, true);
  }
  attachClick();
  if (window.__recordClickObserver__) {
    window.__recordClickObserver__.disconnect();
  }
  var debounceTimer;
  window.__recordClickObserver__ = new MutationObserver(function() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(function() {
      if (typeof window.__recordPageRendered__ === 'function') window.__recordPageRendered__();
    }, 300);
  });
  if (document.body) {
    window.__recordClickObserver__.observe(document.body, { childList: true, subtree: true });
  }
})();
`;

/** 从 selector 中移除 data-pf，避免 LLM 或 buildSelector 带上仅录制时存在的属性，重放时会失败。 */
export function stripDataPfFromSelector(selector: string): string {
  return selector
    .replace(/\[\s*data-pf(=\s*["'][^"']*["'])?\s*\]/gi, "")
    .replace(/\[\s*\]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

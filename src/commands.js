// What hold-right-Option + key does, keyed by KeyboardEvent.code (Option
// mangles e.key: ⌥J is "∆").
(() => {
  const N = (globalThis.NaVIM ||= {});
  const api = globalThis.browser ?? globalThis.chrome;
  const STEP = 70;

  let lastClick = null, cached = null;
  addEventListener('mousedown', e => {
    lastClick = e.composedPath()[0];
    cached = null;
  }, true);

  const scrollsY = el =>
    el instanceof Element &&
    el.scrollHeight > el.clientHeight + 2 &&
    /auto|scroll|overlay/.test(getComputedStyle(el).overflowY);

  // The thing that should scroll: the box you last clicked in, else the page,
  // else the biggest scrollable box (Gmail, Discord and friends).
  function scroller() {
    const doc = document.scrollingElement || document.documentElement;
    for (let n = lastClick ?? document.activeElement; n && n !== document.body && n !== doc; n = n.parentElement ?? n.getRootNode().host) {
      if (scrollsY(n)) return n;
    }
    if (doc.scrollHeight > innerHeight + 2) return doc;
    if (cached?.isConnected) return cached;
    let best = doc, area = 0;
    for (const el of document.body?.querySelectorAll('*') ?? []) {
      if (el.scrollHeight <= el.clientHeight + 2) continue;
      const r = el.getBoundingClientRect();
      if (r.width * r.height > area && scrollsY(el)) [best, area] = [el, r.width * r.height];
    }
    return (cached = best);
  }

  const scroll = (dy, e) => scroller().scrollBy({ top: dy, behavior: e.repeat ? 'auto' : 'smooth' });
  const page = f => Math.min(scroller().clientHeight, innerHeight) * f;
  const edge = top => {
    const s = scroller();
    s.scrollTo({ top: top ? 0 : s.scrollHeight, behavior: 'smooth' });
  };

  function focusInput() {
    const el = [...document.querySelectorAll('input, textarea, [contenteditable=""], [contenteditable=true]')]
      .find(el => N.hints.isEditable(el) && !el.disabled && N.hints.visibleRect(el));
    if (!el) return N.overlay.hud('NO INPUT', 900);
    el.focus();
    el.select?.();
  }

  N.openTab = url => {
    const fallback = () => open(url, '_blank', 'noopener');
    try {
      Promise.resolve(api.runtime.sendMessage({ type: 'openTab', url })).catch(fallback);
    } catch {
      fallback();
    }
  };

  N.commands = {
    KeyJ: e => scroll(STEP, e),
    KeyK: e => scroll(-STEP, e),
    KeyD: e => scroll(page(0.5), e),
    KeyU: e => scroll(-page(0.5), e),
    KeyG: e => edge(!e.shiftKey),
    KeyH: () => history.back(),
    KeyL: () => history.forward(),
    KeyR: () => location.reload(),
    KeyI: focusInput,
    KeyF: e => N.hints.start({ newTab: e.shiftKey }),
    KeyY: () =>
      navigator.clipboard.writeText(location.href).then(
        () => N.overlay.hud('COPIED', 900),
        () => N.overlay.hud('NO COPY', 900),
      ),
  };
})();

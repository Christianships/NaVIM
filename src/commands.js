// What hold-right-Option + key does, keyed by KeyboardEvent.code (Option
// mangles e.key: ⌥J is "∆").
(() => {
  const N = (globalThis.NaVIM ||= {});
  const api = globalThis.browser ?? globalThis.chrome;

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

  // Throttle: holding j/k scrolls continuously and speeds up the longer you
  // hold, from a reading pace to a sprint. Speed eases in and, on release,
  // coasts to a stop, so there's never a jump. Position is tracked as a float
  // and rounded once per frame, so steps stay even.
  const BASE = 650, ACCEL = 2.4, MAX = 2800; // px/s, px/s per ms held, px/s
  const EASE_IN = 0.09, COAST = 0.09; // seconds to close ~63% of the speed gap
  let flight = null;

  function throttle(dir, e) {
    if (e.repeat) return;
    const el = scroller(), now = performance.now();
    if (flight?.el === el) {
      // already moving: steer (j <-> k) or re-open the throttle mid-coast
      Object.assign(flight, { dir, key: e.code, held: true, t0: now });
      return;
    }
    const f = (flight = { el, dir, key: e.code, held: true, t0: now, last: now, v: 0, pos: el.scrollTop, set: el.scrollTop });
    // Sites with `scroll-behavior: smooth` would turn every frame's step into
    // its own animation. Switch it off on the scroller while we fly.
    const box = el === document.scrollingElement ? document.documentElement : el;
    const before = box.style.getPropertyValue('scroll-behavior');
    const priority = box.style.getPropertyPriority('scroll-behavior');
    box.style.setProperty('scroll-behavior', 'auto', 'important');
    const land = () => {
      box.style.setProperty('scroll-behavior', before, priority);
      if (flight === f) flight = null;
    };

    const frame = t => {
      if (flight !== f) return land();
      const dt = Math.min((t - f.last) / 1000, 1 / 30);
      f.last = t;
      // something else scrolled (wheel, page script): fly on from there
      if (Math.abs(el.scrollTop - f.set) > 2) f.pos = el.scrollTop;

      const target = f.held ? f.dir * Math.min(MAX, BASE + (t - f.t0) * ACCEL) : 0;
      f.v += (target - f.v) * (1 - Math.exp(-dt / (f.held ? EASE_IN : COAST)));
      f.pos = Math.max(0, Math.min(el.scrollHeight - el.clientHeight, f.pos + f.v * dt));

      // whole pixels: half-pixel offsets get truncated, which pairs up steps
      el.scrollTop = f.set = Math.round(f.pos);
      // under ~0.7px a frame the coast would just flicker between 1 and 0
      if (!f.held && Math.abs(f.v) < 40) return land();
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  }

  N.release = code => {
    if (flight && (code === flight.key || code === 'AltRight')) flight.held = false;
  };

  // Waypoints: the page's headings, in order. ] and [ jump between them.
  function waypoint(dir) {
    const marks = [...document.querySelectorAll('h1, h2, h3, h4, h5, h6, [role=heading]')]
      .filter(h => h.getClientRects().length && h.checkVisibility?.({ visibilityProperty: true }) !== false);
    const top = h => h.getBoundingClientRect().top;
    // 80px of slack so the heading you just landed on doesn't count as "next"
    const to = dir > 0 ? marks.find(h => top(h) > 80) : marks.findLast(h => top(h) < -4);
    if (!to) return N.overlay.hud(dir > 0 ? 'LAST' : 'FIRST', 800);
    to.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setTimeout(() => N.overlay.mark(to), 420);
  }
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
    KeyJ: e => throttle(1, e),
    KeyK: e => throttle(-1, e),
    BracketRight: () => waypoint(1),
    BracketLeft: () => waypoint(-1),
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

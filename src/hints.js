// Lock-on hints: label every clickable thing in view, type a label to click it.
(() => {
  const N = (globalThis.NaVIM ||= {});

  const ALPHABET = 'sadfjklewcmpgh';
  const SELECTOR = [
    'a[href]', 'button', 'input:not([type=hidden])', 'select', 'textarea', 'summary', 'label[for]',
    '[role=button]', '[role=link]', '[role=tab]', '[role=menuitem]', '[role=menuitemcheckbox]',
    '[role=menuitemradio]', '[role=option]', '[role=checkbox]', '[role=radio]', '[role=switch]',
    '[role=treeitem]', '[onclick]', '[jsaction]', '[contenteditable=""]', '[contenteditable=true]',
    '[tabindex]:not([tabindex="-1"])',
  ].join(',');
  const TEXT_INPUT = /^(|text|search|url|email|password|tel|number|date|datetime-local|month|time|week)$/;

  let state = null;

  const isEditable = el =>
    el.isContentEditable ||
    el.localName === 'textarea' ||
    el.localName === 'select' ||
    (el.localName === 'input' && TEXT_INPUT.test((el.getAttribute('type') || '').toLowerCase()));

  // Every element in the tree, descending into open shadow roots (YouTube etc).
  function collect(root, out) {
    for (const el of root.querySelectorAll('*')) {
      if (el.matches(SELECTOR)) out.push(el);
      if (el.shadowRoot) collect(el.shadowRoot, out);
    }
    return out;
  }

  // The first on-screen box of el that isn't covered by something else.
  function visibleRect(el) {
    if (el.checkVisibility && !el.checkVisibility({ visibilityProperty: true })) return null;
    const vw = innerWidth, vh = innerHeight;
    const root = el.getRootNode();
    const from = root.elementFromPoint ? root : document;
    for (const r of el.getClientRects()) {
      if (r.width < 3 || r.height < 3) continue;
      if (r.bottom <= 0 || r.right <= 0 || r.top >= vh || r.left >= vw) continue;
      const l = Math.max(r.left, 0), t = Math.max(r.top, 0);
      const rr = Math.min(r.right, vw), b = Math.min(r.bottom, vh);
      for (const [x, y] of [[(l + rr) / 2, (t + b) / 2], [l + 2, t + 2]]) {
        const hit = from.elementFromPoint(x, y);
        if (hit && (hit === el || el.contains(hit) || hit.contains(el))) return r;
      }
    }
    return null;
  }

  // Prefix-free labels, as short as the target count allows (Vimium's scheme).
  function makeLabels(count) {
    const out = [''];
    let offset = 0;
    while (out.length - offset < count || out.length === 1) {
      const base = out[offset++];
      for (const ch of ALPHABET) out.push(ch + base);
    }
    return out.slice(offset, offset + count).sort().map(s => [...s].reverse().join(''));
  }

  const near = (a, b) =>
    Math.abs(a.left - b.left) < 6 && Math.abs(a.top - b.top) < 6 &&
    Math.abs(a.width - b.width) < 6 && Math.abs(a.height - b.height) < 6;

  function start({ newTab = false } = {}) {
    stop();
    const targets = [];
    for (const el of collect(document, [])) {
      if (el.disabled || el.getAttribute('aria-hidden') === 'true') continue;
      const rect = visibleRect(el);
      if (!rect) continue;
      // <a><div role=button> is one target, not two stacked labels
      if (targets.some(t => (t.el.contains(el) || el.contains(t.el)) && near(t.rect, rect))) continue;
      targets.push({ el, rect });
    }
    if (!targets.length) return N.overlay.hud('NO TARGETS', 900);

    const labels = makeLabels(targets.length);
    const layer = N.overlay.layer();
    targets.forEach((t, i) => {
      t.label = labels[i];
      t.node = document.createElement('div');
      t.node.className = 'hint';
      t.node.style.left = `${Math.round(Math.max(0, Math.min(t.rect.left - 2, innerWidth - 30)))}px`;
      t.node.style.top = `${Math.round(Math.max(0, Math.min(t.rect.top - 2, innerHeight - 18)))}px`;
      t.node.append(...N.overlay.label(t.label));
      layer.append(t.node);
    });
    state = { targets, typed: '', newTab };
    N.overlay.hud(newTab ? 'NAVIM TAB' : 'NAVIM');
  }

  function stop() {
    if (!state) return;
    state = null;
    N.overlay.clear();
    N.overlay.hideHud();
  }

  function update() {
    const { targets, typed } = state;
    const matches = targets.filter(t => t.label.startsWith(typed));
    if (!matches.length) {
      state.typed = typed.slice(0, -1); // a miss: ignore the key
      return;
    }
    if (matches.length === 1 && matches[0].label === typed) {
      const { el } = matches[0], newTab = state.newTab;
      stop();
      return activate(el, newTab);
    }
    for (const t of targets) {
      t.node.hidden = !t.label.startsWith(typed);
      if (!t.node.hidden) t.node.replaceChildren(...N.overlay.label(t.label, typed.length));
    }
  }

  function click(el) {
    const r = el.getBoundingClientRect();
    const init = { bubbles: true, cancelable: true, composed: true, view: window, clientX: r.left + r.width / 2, clientY: r.top + r.height / 2, button: 0, isPrimary: true };
    for (const type of ['pointerover', 'mouseover', 'pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click']) {
      const Event = type.startsWith('pointer') ? PointerEvent : MouseEvent;
      el.dispatchEvent(new Event(type, { ...init, buttons: type.endsWith('down') ? 1 : 0 }));
      if (type === 'mousedown' && el.tabIndex >= 0) el.focus({ preventScroll: true });
    }
  }

  function activate(el, newTab) {
    const link = el.closest('a[href]');
    if (newTab && link) return N.openTab(link.href);
    if (isEditable(el)) {
      el.focus({ preventScroll: true });
      if (el.localName === 'select') try { el.showPicker(); } catch {}
      return;
    }
    click(el);
  }

  const MODIFIERS = /^(Shift|Control|Meta|Alt)(Left|Right)$|^CapsLock$|^Fn$/;

  // Returns true when the key was consumed by hint mode.
  function key(e) {
    if (e.code === 'Escape') return stop(), true;
    if (e.metaKey || e.ctrlKey) return stop(), false; // let ⌘L, ⌘T etc through
    if (MODIFIERS.test(e.code)) return false;
    if (e.code === 'Backspace') {
      state.typed = state.typed.slice(0, -1);
      update();
      return true;
    }
    const ch = e.code.startsWith('Key') ? e.code.slice(3).toLowerCase() : '';
    if (ALPHABET.includes(ch) && ch) {
      state.typed += ch;
      state.newTab ||= e.shiftKey;
      update();
    }
    return true; // swallow everything else so the page doesn't react mid-hint
  }

  addEventListener('scroll', () => stop(), { capture: true, passive: true });
  addEventListener('resize', () => stop());

  N.hints = {
    start,
    stop,
    key,
    toggle: () => (state ? stop() : start()),
    active: () => !!state,
    isEditable,
    visibleRect,
  };
})();

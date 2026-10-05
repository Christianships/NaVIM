// Normal mode for text boxes, laid out for the right hand with the thumb on
// right ⌘. Tap right ⌘ in a text box to switch between typing and editing.
//
//   y  u  i  o  p      line start · word ← · back to typing · word → · line end
//    h  j  k  l  ;     ← ↓ ↑ → · undo  (Shift+' redoes)
//     n  m  ,  .  /    del word ← · del char ← · del char → · del word → · clear line
//
// Hold Shift with any move to select instead; a delete then removes the
// selection. Esc also goes back to typing.
(() => {
  const N = (globalThis.NaVIM ||= {});

  let on = false;

  // The focused element, looking through open shadow roots.
  function focused() {
    let el = document.activeElement;
    while (el?.shadowRoot?.activeElement) el = el.shadowRoot.activeElement;
    return el;
  }
  const inBox = () => {
    const el = focused();
    return !!el && el.localName !== 'select' && N.hints.isEditable(el);
  };

  // Inputs keep their selection to themselves; the page's always looks collapsed.
  function selected() {
    const el = focused();
    return typeof el?.selectionStart === 'number' ? el.selectionStart !== el.selectionEnd : !getSelection().isCollapsed;
  }

  // Moves go through Selection.modify, the browser's own caret engine: it
  // knows wrapped lines and word edges, inside inputs and rich editors alike.
  const go = (dir, unit) => e =>
    getSelection().modify(e.shiftKey ? 'extend' : 'move', dir, unit);

  // Deletes go through execCommand so the site sees a real edit (React state,
  // undo history). A selection is deleted as-is; otherwise grab the unit first.
  function del(dir, unit) {
    return () => {
      if (!selected() && unit !== 'character') getSelection().modify('extend', dir, unit);
      document.execCommand(dir === 'backward' ? 'delete' : 'forwardDelete');
    };
  }

  function clearLine() {
    const sel = getSelection();
    sel.modify('move', 'backward', 'lineboundary');
    sel.modify('extend', 'forward', 'lineboundary');
    if (selected()) document.execCommand('delete');
  }

  const KEYS = {
    KeyH: go('backward', 'character'),
    KeyL: go('forward', 'character'),
    KeyJ: go('forward', 'line'),
    KeyK: go('backward', 'line'),
    KeyU: go('backward', 'word'),
    KeyO: go('forward', 'word'),
    KeyY: go('backward', 'lineboundary'),
    KeyP: go('forward', 'lineboundary'),
    KeyN: del('backward', 'word'),
    KeyM: del('backward', 'character'),
    Comma: del('forward', 'character'),
    Period: del('forward', 'word'),
    Slash: clearLine,
    Semicolon: () => document.execCommand('undo'),
    Quote: e => e.shiftKey && document.execCommand('redo'),
    KeyI: () => set(false),
    Escape: () => set(false),
  };

  // Keys that keep their usual job in normal mode.
  const PASS = /^(Enter|NumpadEnter|Tab|Backspace|Delete|Arrow\w+|Home|End|Page\w+|F\d+)$/;

  function set(next) {
    if (next === on) return;
    on = next;
    if (on) N.overlay.hud('NORMAL');
    else N.overlay.hud('INSERT', 700);
  }

  N.edit = {
    active: () => on,
    // Right ⌘ tapped: toggle, but only while typing in a text box.
    tap() {
      if (on || inBox()) set(!on);
    },
    // One keydown in normal mode. True = NaVIM ate it.
    key(e) {
      if (!inBox()) {
        set(false);
        return false;
      }
      if (e.metaKey || e.ctrlKey || PASS.test(e.code)) return false;
      KEYS[e.code]?.(e);
      // Unmapped letters are eaten too: normal mode never types.
      return !/^(Shift|Alt|Control|Meta)(Left|Right)$|^CapsLock$/.test(e.code);
    },
  };

  // Leaving the box (click, Tab, another field) ends normal mode.
  addEventListener('focusout', () => set(false), true);
  addEventListener('blur', () => set(false));
})();

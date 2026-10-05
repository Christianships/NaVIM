// Right Option drives the page:
//   tap (press + release alone)  -> toggle lock-on hints
//   hold + key                   -> run a command
// Right Command, tapped alone in a text box, toggles normal mode (src/edit.js).
// Left Option, left Command and every other key behave exactly as normal.
(() => {
  const N = globalThis.NaVIM;
  const TAP_MS = 350;
  const MODIFIERS = /^(Shift|Control|Meta|Alt)(Left|Right)$|^CapsLock$|^Fn$/;

  let held = false, used = false, downAt = 0;
  let cmd = false, cmdUsed = false, cmdAt = 0;
  const swallowed = new Set();

  function swallow(e) {
    e.preventDefault();
    e.stopImmediatePropagation();
    swallowed.add(e.code);
  }

  addEventListener('keydown', e => {
    if (e.code === 'AltRight') {
      if (!e.repeat) [held, used, downAt] = [true, false, performance.now()];
      return;
    }
    if (e.code === 'MetaRight') {
      if (!e.repeat) [cmd, cmdUsed, cmdAt] = [true, false, performance.now()];
      return;
    }
    if (held && !MODIFIERS.test(e.code)) used = true;
    if (cmd) cmdUsed = true;

    if (N.hints.active()) {
      if (N.hints.key(e)) swallow(e);
      return;
    }
    if (!held && N.edit.active()) {
      if (N.edit.key(e)) swallow(e);
      return;
    }
    if (!held || MODIFIERS.test(e.code)) return;

    // Swallow even unmapped keys so ⌥-characters (∆, ˚, dead keys) never type.
    swallow(e);
    N.commands[e.code]?.(e);
  }, true);

  addEventListener('keyup', e => {
    if (swallowed.delete(e.code)) {
      e.preventDefault();
      e.stopImmediatePropagation();
      N.release?.(e.code);
      return;
    }
    if (e.code === 'MetaRight') {
      const tap = cmd && !cmdUsed && performance.now() - cmdAt < TAP_MS;
      cmd = false;
      if (tap) N.edit.tap();
      return;
    }
    if (e.code !== 'AltRight') return;
    N.release?.('AltRight');
    const tap = held && !used && performance.now() - downAt < TAP_MS;
    held = false;
    if (tap) N.hints.toggle();
  }, true);

  // Belt and braces for ⌥ dead keys (⌥E, ⌥U, ⌥N…) that start a composition.
  addEventListener('beforeinput', e => held && e.preventDefault(), true);

  // A missed keyup (switched apps mid-hold) must not leave Option stuck.
  const reset = () => {
    held = cmd = false;
    N.release?.('AltRight');
  };
  addEventListener('blur', reset);
  document.addEventListener('visibilitychange', reset);
})();

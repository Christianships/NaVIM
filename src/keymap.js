// The keyboard is a map of the screen.
//
//   Q W E R T Y U I O P      <- top of the page
//    A S D F G H J K L ;     <- middle
//      Z X C V B N M , . /   <- bottom
//
// Every target gets the key that sits where it sits: a link in the top-right
// is P, a button bottom-left is Z. When one key's patch of screen holds more
// than one target, that patch becomes a keyboard of its own and the second
// key picks within it, the same way. So labels are addresses, not codes:
// you look at a link and your hand already knows the first key.
(() => {
  const N = (globalThis.NaVIM ||= {});

  const ROWS = ['qwertyuiop', 'asdfghjkl;', 'zxcvbnm,./'];
  const STAGGER = [0, 0.25, 0.75]; // how far each row sits right on a real keyboard
  const KEYS = ROWS.flatMap((row, r) => [...row].map((k, i) => ({ k, x: STAGGER[r] + i + 0.5, y: r + 0.5 })));
  const CODES = {
    Semicolon: ';', Comma: ',', Period: '.', Slash: '/',
  };

  const d2 = (a, b) => (a.x - b.x) ** 2 + (a.y - b.y) ** 2;

  // A target's position in "key units" of the region: x 0..10, y 0..3.
  const where = (t, r) => ({ x: ((t.cx - r.x) / r.w) * 10, y: ((t.cy - r.y) / r.h) * 3 });

  const nearest = p => KEYS.reduce((best, k) => (d2(p, k) < d2(p, best) ? k : best));

  function assign(targets, region, prefix) {
    const pos = targets.map(t => where(t, region));

    // Room for everyone: each target takes the free key closest to it,
    // closest pairs first, so the best-placed targets get their own key.
    if (targets.length <= KEYS.length) {
      const pairs = [];
      pos.forEach((p, ti) => KEYS.forEach((k, ki) => pairs.push([d2(p, k), ti, ki])));
      pairs.sort((a, b) => a[0] - b[0]);
      const tookT = new Set(), tookK = new Set();
      for (const [, ti, ki] of pairs) {
        if (tookT.has(ti) || tookK.has(ki)) continue;
        tookT.add(ti);
        tookK.add(ki);
        targets[ti].label = prefix + KEYS[ki].k;
      }
      return;
    }

    // Too many: group by the key each target sits under, then zoom into
    // each key's patch of screen and label inside it.
    const groups = new Map();
    pos.forEach((p, ti) => {
      const k = nearest(p);
      if (!groups.has(k)) groups.set(k, []);
      groups.get(k).push(targets[ti]);
    });

    if (groups.size === 1) {
      // Everything piled under one key (a dense list): fall back to reading
      // order, 30 to a key, so the recursion always makes progress.
      const sorted = [...targets].sort((a, b) => a.cy - b.cy || a.cx - b.cx);
      const per = Math.ceil(sorted.length / KEYS.length);
      KEYS.forEach((k, i) => {
        const chunk = sorted.slice(i * per, (i + 1) * per);
        if (chunk.length === 1) chunk[0].label = prefix + k.k;
        else if (chunk.length) assign(chunk, bounds(chunk), prefix + k.k);
      });
      return;
    }

    for (const [k, group] of groups) {
      if (group.length === 1) {
        group[0].label = prefix + k.k;
        continue;
      }
      const patch = {
        x: region.x + ((k.x - 0.5) / 10) * region.w,
        y: region.y + ((k.y - 0.5) / 3) * region.h,
        w: region.w / 10,
        h: region.h / 3,
      };
      assign(group, patch, prefix + k.k);
    }
  }

  function bounds(ts) {
    const xs = ts.map(t => t.cx), ys = ts.map(t => t.cy);
    const x = Math.min(...xs), y = Math.min(...ys);
    return { x, y, w: Math.max(Math.max(...xs) - x, 1), h: Math.max(Math.max(...ys) - y, 1) };
  }

  // targets: [{ cx, cy }] in viewport px. Sets t.label on each.
  function label(targets) {
    assign(targets, { x: 0, y: 0, w: innerWidth, h: innerHeight }, '');
    return targets;
  }

  // The label character a key press stands for, or '' if it isn't one.
  function char(e) {
    if (e.code.startsWith('Key')) return e.code.slice(3).toLowerCase();
    return CODES[e.code] ?? '';
  }

  N.keymap = { label, char, rows: ROWS };
})();

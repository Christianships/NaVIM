// One fixed, click-through layer in a closed shadow root, so page CSS can't
// restyle the hints and page scripts can't see them.
(() => {
  const N = (globalThis.NaVIM ||= {});

  const CSS = `
    .layer { position: fixed; inset: 0; }
    .hint {
      position: absolute;
      padding: 3px 4px;
      line-height: 0;
      background: rgba(0, 0, 0, 0.92);
      border-radius: 5px;
      /* white hairline for dark pages, dark ring + shadow for light ones */
      box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.2), 0 0 0 1px rgba(0, 0, 0, 0.55), 0 2px 8px rgba(0, 0, 0, 0.45);
    }
    .hint[hidden] { display: none; }
    .hud {
      position: fixed;
      right: 14px;
      bottom: 14px;
      padding: 7px 9px;
      line-height: 0;
      background: #000;
      border-radius: 8px;
      box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.2), 0 4px 14px rgba(0, 0, 0, 0.5);
      opacity: 0;
      transform: translateY(4px);
      transition: opacity 0.12s, transform 0.12s;
    }
    .hud.on { opacity: 1; transform: none; }
  `;

  let host, layer, hud, hudTimer;

  function ensure() {
    if (host?.isConnected) return;
    host = document.createElement('navim-overlay');
    host.style.cssText = 'all: initial !important; display: block !important; position: fixed !important; inset: 0 !important; pointer-events: none !important; z-index: 2147483647 !important;';
    const root = host.attachShadow({ mode: 'closed' });
    root.innerHTML = `<style>${CSS}</style><div class="layer"></div><div class="hud"></div>`;
    layer = root.querySelector('.layer');
    hud = root.querySelector('.hud');
    document.documentElement.append(host);
  }

  N.overlay = {
    layer() {
      ensure();
      return layer;
    },
    clear() {
      layer?.replaceChildren();
    },
    // Dot-matrix badge in the bottom-right; ms auto-hides it.
    hud(text, ms) {
      ensure();
      hud.replaceChildren(N.dots.svg(text, { pitch: 2.2, r: 0.8, ghost: 0.12 }));
      hud.classList.add('on');
      clearTimeout(hudTimer);
      if (ms) hudTimer = setTimeout(() => hud.classList.remove('on'), ms);
    },
    hideHud() {
      clearTimeout(hudTimer);
      hud?.classList.remove('on');
    },
  };
})();

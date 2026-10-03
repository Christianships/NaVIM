# NaVIM

Vim-style browsing driven entirely by the **right Option key**, built for
the Search browser (WebKit) but plain WebExtension JS, so it loads unpacked
anywhere.

Plain typing never triggers anything, so there's no insert mode to manage.

## Keys

| Right ⌥ | Does |
|---|---|
| **tap** (press + release alone) | Lock-on hints: every clickable thing gets a dot-matrix label; type it to click. Esc or another tap cancels. Shift on the last letter opens a link in a new tab. |
| hold + `j` / `k` | scroll down / up |
| hold + `d` / `u` | half page down / up |
| hold + `g` / `G` | top / bottom |
| hold + `h` / `l` | back / forward |
| hold + `r` | reload |
| hold + `i` | focus the first text box |
| hold + `f` / `F` | hints / hints that open in a new tab |
| hold + `y` | copy the page URL |

Left Option is untouched.

## Install

1. Search → Extensions → **Load Unpacked**
2. Pick this folder (the one with `manifest.json`)
3. Grant it access to websites when asked

After editing code, reload the extension and refresh the page.

## Layout

```
manifest.json
src/dotmatrix.js   5x7 round-dot glyphs drawn as SVG (the hint look)
src/overlay.js     closed-shadow-root layer for hints + the HUD badge
src/hints.js       find visible clickables, label, type-to-click
src/commands.js    hold-⌥ commands and the "what should scroll" logic
src/keys.js        right-⌥ tap / hold detection, key routing
src/background.js  opens new tabs
preview/labels.html  open in any browser to see the hint design
```

## Preview the hint design

Open `preview/labels.html`, or `preview/labels.html?typed=s` to see the
mid-typing state (typed letters dim, non-matching labels hide).

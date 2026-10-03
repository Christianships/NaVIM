// Only job so far: open a link in a new background tab next to the current one.
const api = globalThis.browser ?? globalThis.chrome;

api.runtime.onMessage.addListener((msg, sender) => {
  if (msg?.type !== 'openTab') return;
  const index = sender.tab ? sender.tab.index + 1 : undefined;
  api.tabs.create({ url: msg.url, active: false, index });
});

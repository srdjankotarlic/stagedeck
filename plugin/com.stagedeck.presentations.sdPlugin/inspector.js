let socket, context, settings = {};
const select = document.getElementById('slot');
function renderLanguage(language) {
  const sr = language === 'sr', key = sr ? 'Taster' : 'Key';
  document.documentElement.lang = sr ? 'sr-Latn' : 'en';
  document.getElementById('intro').textContent = sr ? 'Izaberi poziciju prezentacije. U gotovom XL profilu raspored je već podešen.' : 'Choose a presentation slot. The included XL profile already maps all 32 keys.';
  document.getElementById('key-label').textContent = key;
  document.getElementById('help').textContent = sr ? 'Prezentacije, nazive i slike menjaš u StageDecku. Pritisak pokreće prikaz; ponovni pritisak zatvara prezentaciju.' : 'Manage presentations, labels and previews in StageDeck. Press the key to start and press it again to close the presentation.';
  for (let i = 0; i < select.options.length; i++) select.options[i].text = key + ' ' + (i + 1);
}
for (let i = 0; i < 32; i++) select.add(new Option('Key ' + (i + 1), String(i)));
function connectElgatoStreamDeckSocket(port, uuid, event, info, actionInfo) {
  const action = JSON.parse(actionInfo);
  context = action.context;
  settings = action.payload.settings || {};
  select.value = settings.slot ?? 0;
  socket = new WebSocket('ws://127.0.0.1:' + port);
  socket.onopen = () => {
    socket.send(JSON.stringify({event, uuid}));
    socket.send(JSON.stringify({event:'sendToPlugin', action:action.action, context, payload:{request:'language'}}));
  };
  socket.onmessage = ({data}) => {
    const frame = JSON.parse(data);
    if (frame.event === 'sendToPropertyInspector' && frame.payload?.language) renderLanguage(frame.payload.language);
  };
}
select.onchange = () => {
  settings.slot = Number(select.value);
  socket?.send(JSON.stringify({event:'setSettings', context, payload:settings}));
};

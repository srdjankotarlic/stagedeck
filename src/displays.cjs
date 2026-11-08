// Keep notes with the desk; output is always a different display when available.
function planDisplays(displays, controlId, preferredId) {
  const control = displays.find(d => d.id === controlId) || displays[0];
  const others = displays.filter(d => d.id !== control.id);
  const audience = others.find(d => d.id === preferredId) || others.find(d => d.id === displays[1]?.id) || others[0] || control;
  return { control, audience, separate: others.length > 0, audienceIndex: displays.indexOf(audience) + 1 };
}
module.exports = { planDisplays };

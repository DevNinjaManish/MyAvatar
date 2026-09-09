'use strict';
const WIDTH = 260, COMPACT_HEIGHT = 370, CHAT_HEIGHT = 570;
const TOOLS_HEIGHT = 720, COMBINED_HEIGHT = 850, WING_WIDTH = 440, GAP = 10;
const clamp = (value, min, max) => Math.max(min, Math.min(value, Math.max(min, max)));

/** A pure, testable layout function in Electron device-independent pixels.
 * anchor always describes the compact column, never the optional side panel.
 * Expansion must not replace that anchor, so closing restores its location.
 */
function widgetLayout(anchor, view, area) {
  const width = Math.min(WIDTH, area.width);
  const wantedHeight = view.tools ? (view.chat ? COMBINED_HEIGHT : TOOLS_HEIGHT)
    : view.chat ? CHAT_HEIGHT : COMPACT_HEIGHT;
  const height = Math.min(wantedHeight, area.height);
  let x = clamp(anchor.x, area.x, area.x + area.width - width);
  const y = clamp(anchor.y, area.y, area.y + area.height - height);
  let side = 'none', offset = 0, wingWidth = 0, totalWidth = width;
  if (view.tools && view.wide) {
    // Very narrow work areas get an in-column expanded view instead.
    wingWidth = Math.min(WING_WIDTH, area.width - width - GAP);
    if (wingWidth >= 280) {
      totalWidth = width + GAP + wingWidth;
      const rightRoom = area.x + area.width - (x + width), leftRoom = x - area.x;
      side = rightRoom >= wingWidth + GAP ? 'right'
        : leftRoom >= wingWidth + GAP ? 'left' : leftRoom > rightRoom ? 'left' : 'right';
      if (side === 'left') { offset = wingWidth + GAP; x -= offset; }
      x = clamp(x, area.x, area.x + area.width - totalWidth);
    } else { side = 'inline'; wingWidth = 0; }
  }
  return {bounds: {x: Math.round(x), y: Math.round(y), width: Math.round(totalWidth), height: Math.round(height)},
    side, offset, wingWidth};
}
function validPanelsRequest(value) {
  return !!value && typeof value === 'object' && !Array.isArray(value)
    && Object.keys(value).every(key => ['open', 'wide'].includes(key))
    && typeof value.open === 'boolean' && typeof value.wide === 'boolean'
    && (!value.wide || value.open);
}
module.exports = {widgetLayout, validPanelsRequest, WIDTH, COMPACT_HEIGHT};

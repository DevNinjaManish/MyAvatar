'use strict';
// The companion platform occupies the upper rail.  Utility and chat panels are
// Chat stays in the companion column; wide specialist views use a left wing.
const WIDTH = 320, COMPACT_HEIGHT = 430, UTILITY_HEIGHT = 820;
const CHAT_HEIGHT = UTILITY_HEIGHT, TOOLS_HEIGHT = UTILITY_HEIGHT;
const COMBINED_HEIGHT = UTILITY_HEIGHT, CALENDAR_HEIGHT = UTILITY_HEIGHT, WING_WIDTH = 440, GAP = 10;
const clamp = (value, min, max) => Math.max(min, Math.min(value, Math.max(min, max)));

/**
 * A pure, testable layout function in Electron device-independent pixels.
 * anchor always describes the compact column, never the optional wide wing.
 * Wide panels expand left of the compact column, so closing restores the same anchor.
 */
function widgetLayout(anchor, view, area) {
  const compactWidth = Math.min(WIDTH, area.width);
  const wide = !!view.wide && area.width >= compactWidth + WING_WIDTH + GAP;
  const width = wide ? compactWidth + WING_WIDTH + GAP : compactWidth;
  const extras = (view.chat ? CHAT_HEIGHT - COMPACT_HEIGHT : 0)
    + (view.calendar ? CALENDAR_HEIGHT - COMPACT_HEIGHT : 0)
    + (view.tools ? TOOLS_HEIGHT - COMPACT_HEIGHT : 0);
  const wantedHeight = view.chat && view.tools && !view.calendar
    ? COMBINED_HEIGHT
    : extras ? COMPACT_HEIGHT + extras : COMPACT_HEIGHT;
  const height = Math.min(wantedHeight, area.height);
  let x = clamp(wide ? anchor.x - WING_WIDTH - GAP : anchor.x, area.x, area.x + area.width - width);

  // Reserve the full utility height even while compact. This keeps the
  // platform's screen coordinate stable when a utility panel opens; only
  // content below it grows.
  const reservedHeight = Math.min(UTILITY_HEIGHT, area.height);
  const y = clamp(anchor.y, area.y, area.y + area.height - reservedHeight);

  const side = wide ? 'left' : view.wide ? 'inline' : 'none';
  const offset = wide ? WING_WIDTH + GAP : 0;
  const wingWidth = wide ? WING_WIDTH : 0;

  return {
    bounds: {
      x: Math.round(x),
      y: Math.round(y),
      width: Math.round(width),
      height: Math.round(height),
    },
    side,
    offset,
    wingWidth,
  };
}
function validPanelsRequest(value) {
  return !!value && typeof value === 'object' && !Array.isArray(value)
    && Object.keys(value).every(key => ['open', 'wide'].includes(key))
    && typeof value.open === 'boolean' && typeof value.wide === 'boolean'
    && (!value.wide || value.open);
}
module.exports = {widgetLayout, validPanelsRequest, WIDTH, COMPACT_HEIGHT, UTILITY_HEIGHT, CALENDAR_HEIGHT};

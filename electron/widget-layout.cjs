'use strict';
// The companion always owns one fixed native window. The right column is the
// companion; specialists use a permanently reserved left column.
const WIDTH = 640, COMPACT_HEIGHT = 430, UTILITY_HEIGHT = 820;
const CHAT_HEIGHT = UTILITY_HEIGHT, TOOLS_HEIGHT = UTILITY_HEIGHT;
const COMBINED_HEIGHT = UTILITY_HEIGHT, CALENDAR_HEIGHT = UTILITY_HEIGHT;
const clamp = (value, min, max) => Math.max(min, Math.min(value, Math.max(min, max)));

/**
 * A pure, testable layout function in Electron device-independent pixels.
 * anchor always describes the fixed companion shell. Specialists use its
 * reserved left column, so opening one cannot move the companion on the right.
 */
function widgetLayout(anchor, view, area) {
  const compactWidth = Math.min(WIDTH, area.width);
  const width = compactWidth;
  // Keep the native frame at its full working height from launch. Opening a
  // chat or specialist then only changes an in-window layer, never bounds.
  const height = Math.min(UTILITY_HEIGHT, area.height);
  const x = clamp(anchor.x, area.x, area.x + area.width - width);

  // Reserve the full utility height even while compact. This keeps the
  // platform's screen coordinate stable when a utility panel opens; only
  // content below it grows.
  const reservedHeight = Math.min(UTILITY_HEIGHT, area.height);
  const y = clamp(anchor.y, area.y, area.y + area.height - reservedHeight);

  return {
    bounds: {
      x: Math.round(x),
      y: Math.round(y),
      width: Math.round(width),
      height: Math.round(height),
    },
    side: 'none',
    offset: 0,
    wingWidth: 0,
  };
}
function validPanelsRequest(value) {
  return !!value && typeof value === 'object' && !Array.isArray(value)
    && Object.keys(value).every(key => ['open', 'wide'].includes(key))
    && typeof value.open === 'boolean' && typeof value.wide === 'boolean'
    && (!value.wide || value.open);
}
module.exports = {widgetLayout, validPanelsRequest, WIDTH, COMPACT_HEIGHT, UTILITY_HEIGHT, CALENDAR_HEIGHT};

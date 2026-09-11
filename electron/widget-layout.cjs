'use strict';
// The companion always owns one fixed native window. The right column is the
// companion; specialists use a permanently reserved left column.
const WIDTH = 640, COMPACT_WIDTH = 260, COMPACT_HEIGHT = 470, UTILITY_HEIGHT = 820;
const CHAT_HEIGHT = UTILITY_HEIGHT, TOOLS_HEIGHT = UTILITY_HEIGHT;
const COMBINED_HEIGHT = UTILITY_HEIGHT, CALENDAR_HEIGHT = UTILITY_HEIGHT;
const clamp = (value, min, max) => Math.max(min, Math.min(value, Math.max(min, max)));

/**
 * A pure, testable layout function in Electron device-independent pixels.
 * anchor always describes the fixed companion shell. Specialists use its
 * reserved left column, so opening one cannot move the companion on the right.
 */
function widgetLayout(anchor, view, area) {
  const expanded = Boolean(view.tools || view.wide || view.calendar || view.menu);
  const width = Math.min(expanded ? WIDTH : COMPACT_WIDTH, area.width);
  const height = Math.min(expanded || view.chat ? UTILITY_HEIGHT : COMPACT_HEIGHT, area.height);
  const x = clamp(anchor.x + (expanded ? 0 : WIDTH - COMPACT_WIDTH), area.x, area.x + area.width - width);
  const y = clamp(anchor.y, area.y, area.y + area.height - height);

  return {
    bounds: {
      x: Math.round(x),
      y: Math.round(y),
      width: Math.round(width),
      height: Math.round(height),
    },
    side: 'none',
    offset: expanded ? 0 : COMPACT_WIDTH - WIDTH,
    wingWidth: 0,
  };
}
function validPanelsRequest(value) {
  return !!value && typeof value === 'object' && !Array.isArray(value)
    && Object.keys(value).every(key => ['open', 'wide'].includes(key))
    && typeof value.open === 'boolean' && typeof value.wide === 'boolean'
    && (!value.wide || value.open);
}
module.exports = {widgetLayout, validPanelsRequest, WIDTH, COMPACT_WIDTH, COMPACT_HEIGHT, UTILITY_HEIGHT, CALENDAR_HEIGHT};

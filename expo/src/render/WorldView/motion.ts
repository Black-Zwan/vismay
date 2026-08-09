// The prototype advances the road by 16 pixels every 105ms. Preserve that
// cadence so the 10fps authored walk cycle has enough ground response to read.
export const CHARACTER_WALK_FPS = 10;
export const ROAD_SCROLL_PX_PER_SECOND = 16 / 0.105;

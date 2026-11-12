/**
 * VAIURE PLATFORM — CENTRALIZED Z-INDEX & LAYERING TOKENS
 *
 * Consistent stacking hierarchy:
 * 1. Base content & canvas (z-0 to z-10)
 * 2. Sticky navigation & toolbars (z-30)
 * 3. Floating docks & bottom mobile nav (z-35)
 * 4. Floating slide switch & interactive triggers (z-40)
 * 5. Dropdown menus & contextual flyouts (z-45)
 * 6. Slide drawer overlays (z-50)
 * 7. Modals, dialogs & critical overlays (z-60)
 * 8. Screen-reader announcements & critical toasts (z-70)
 */

export const Z_LAYERS = {
  BASE_CONTENT: 'z-0',
  SLIDE_SURFACE: 'z-10',
  STICKY_NAVBAR: 'z-30',
  FLOATING_DOCK: 'z-35',
  NAV_SWITCHER: 'z-40',
  DROPDOWN_MENU: 'z-45',
  DRAWER_OVERLAY: 'z-50',
  MODAL_DIALOG: 'z-60',
  TOAST_CRITICAL: 'z-70',
} as const;

export const Z_INDEX_VALUES = {
  BASE_CONTENT: 0,
  SLIDE_SURFACE: 10,
  STICKY_NAVBAR: 30,
  FLOATING_DOCK: 35,
  NAV_SWITCHER: 40,
  DROPDOWN_MENU: 45,
  DRAWER_OVERLAY: 50,
  MODAL_DIALOG: 60,
  TOAST_CRITICAL: 70,
} as const;

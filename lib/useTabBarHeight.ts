// lib/useTabBarHeight.ts
import { useSafeAreaInsets } from "react-native-safe-area-context";

// Must match the tabBarStyle values in app/(app)/(tabs)/_layout.tsx exactly —
// the tab bar is position: "absolute", so it floats over screen content
// instead of pushing it up. Every scrollable screen needs to reserve this
// much space at the bottom itself, or its last item(s) end up hidden
// behind the bar. Keeping the numbers here (rather than re-guessing a
// paddingBottom per screen) means a future resize of the tab bar only
// needs to change one place.
export const TAB_BAR_HEIGHT = 72;
export const TAB_BAR_MIN_BOTTOM_OFFSET = 16;
// extra breathing room so content doesn't end flush against the bar
const SAFE_GAP = 16;

export function useTabBarSafeBottomPadding() {
  const insets = useSafeAreaInsets();
  const tabBarBottom = Math.max(insets.bottom, TAB_BAR_MIN_BOTTOM_OFFSET);
  return tabBarBottom + TAB_BAR_HEIGHT + SAFE_GAP;
}

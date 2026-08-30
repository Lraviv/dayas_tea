/** Styling helpers for Hebrew (RTL) text fields inside an otherwise
 * left-to-right app. We deliberately don't flip the whole app with
 * I18nManager -- the primary UI language is English and Hebrew only
 * appears in specific bilingual data fields. */

import type { TextStyle } from "react-native";

export const rtlTextStyle: TextStyle = {
  textAlign: "right",
  writingDirection: "rtl",
};

/** Returns true if the string contains any Hebrew characters, so callers
 * can decide whether to apply RTL styling to free-typed text. */
export function containsHebrew(text: string | null | undefined): boolean {
  if (!text) return false;
  return /[֐-׿]/.test(text);
}

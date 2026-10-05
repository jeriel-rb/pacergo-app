"use client";

import * as React from "react";

/**
 * Tracks whether a form's current values differ from what was last saved, so the
 * Save/Apply button can stay disabled while there is nothing to save.
 *
 * Pass every editable value as ONE object (or primitive) — the snapshot taken on
 * first render is the baseline. Call `markClean()` after a successful save to make
 * the just-saved values the new baseline (the button disables again). Values are
 * compared structurally, so editing a field back to its original value is clean.
 */
export function useFormDirty<T>(value: T): { dirty: boolean; markClean: () => void } {
  const [baseline, setBaseline] = React.useState<T>(value);
  const dirty = JSON.stringify(value) !== JSON.stringify(baseline);
  // Closes over the values at the render that created it, i.e. what was submitted —
  // anything typed while the save was in flight stays dirty.
  const markClean = React.useCallback(() => setBaseline(value), [value]);
  return { dirty, markClean };
}

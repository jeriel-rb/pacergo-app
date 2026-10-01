"use client";

import * as React from "react";
import { kgToLb, lbToKg } from "@pacergo/shared";

export type WeightUnit = "kg" | "lb";

const STORAGE_KEY = "pacergo.weightUnit";

/** The viewer's kg/lb choice for logging — a per-device display preference;
 *  weights are always saved in kg. */
export function useWeightUnit(): [WeightUnit, (unit: WeightUnit) => void] {
  const [unit, setUnitState] = React.useState<WeightUnit>("kg");
  React.useEffect(() => {
    try {
      if (window.localStorage.getItem(STORAGE_KEY) === "lb") setUnitState("lb");
    } catch {
      // Storage blocked — stay on kg.
    }
  }, []);
  const setUnit = React.useCallback((next: WeightUnit) => {
    setUnitState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Not remembered, still applied for this visit.
    }
  }, []);
  return [unit, setUnit];
}

/** kg → the number shown in `unit`, to one decimal. */
export function displayWeight(kg: number, unit: WeightUnit): number {
  return Math.round((unit === "lb" ? kgToLb(kg) : kg) * 10) / 10;
}

/** A typed number in `unit` → kg. */
export function toKg(value: number, unit: WeightUnit): number {
  return unit === "lb" ? lbToKg(value) : value;
}

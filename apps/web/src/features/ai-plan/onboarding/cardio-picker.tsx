"use client";

import { useTranslation } from "react-i18next";
import {
  CARDIO_CATALOG,
  CARDIO_CATEGORIES,
  type OnboardingCardioPlacement,
  type OnboardingCardioType,
} from "@pacergo/shared";
import { ListOptionGroup, ListOptionRow } from "@/shared/components/atoms/list-option-row";
import { CARDIO_ART } from "./equipment-images";

const PLACEMENTS: readonly OnboardingCardioPlacement[] = ["start", "end"];

/** Cardio placement + the cardio types grouped by category (gym cardio
 *  equipment / outdoor & bodyweight), each with its first-frame artwork. Not
 *  organised by gym type — that's only in the Equipment picker. Shared by the
 *  onboarding "Choose your cardio" step and the "Update preferences" cardio
 *  editor so the two can't drift apart. */
export function CardioPicker({
  placement,
  onPlacementChange,
  selected,
  onToggle,
}: {
  placement: OnboardingCardioPlacement;
  onPlacementChange: (placement: OnboardingCardioPlacement) => void;
  selected: readonly OnboardingCardioType[];
  onToggle: (cardio: OnboardingCardioType) => void;
}) {
  const { t } = useTranslation("onboarding");

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <p className="text-sm font-semibold text-muted-foreground">
          {t("gymEquipment.chooseCardio.placementLabel")}
        </p>
        <ListOptionGroup>
          {PLACEMENTS.map((p) => (
            <ListOptionRow
              key={p}
              title={t(`gymEquipment.chooseCardio.placement.${p}`)}
              selected={placement === p}
              onSelect={() => onPlacementChange(p)}
            />
          ))}
        </ListOptionGroup>
      </div>

      <div className="space-y-4">
        <div className="space-y-0.5">
          <p className="text-sm font-semibold text-muted-foreground">
            {t("gymEquipment.chooseCardio.selectLabel")}
          </p>
          <p className="text-xs text-muted-foreground" aria-live="polite">
            {selected.length === 0
              ? t("gymEquipment.chooseCardio.pickAtLeastOne")
              : t("gymEquipment.chooseCardio.selectedCount", { count: selected.length })}
          </p>
        </div>

        {CARDIO_CATEGORIES.map((category) => {
          const items = CARDIO_CATALOG.filter((c) => c.category === category);
          return (
            <div key={category} className="space-y-2">
              <p className="text-sm font-semibold text-muted-foreground">
                {t(`gymEquipment.chooseCardio.categories.${category}`)}
              </p>
              <ListOptionGroup>
                {items.map(({ id }) => (
                  <ListOptionRow
                    key={id}
                    multi
                    art={CARDIO_ART[id]}
                    title={t(`gymEquipment.chooseCardio.options.${id}`)}
                    selected={selected.includes(id)}
                    onSelect={() => onToggle(id)}
                  />
                ))}
              </ListOptionGroup>
            </div>
          );
        })}
      </div>
    </div>
  );
}

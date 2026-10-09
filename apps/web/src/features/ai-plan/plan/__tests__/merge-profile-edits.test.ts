import { describe, expect, it } from "vitest";
import {
  GYM_EQUIPMENT_DEFAULT,
  ONBOARDING_ANSWERS_DEFAULT,
  TRAINING_PREFERENCES_DEFAULT,
} from "@pacergo/shared";
import { profileAfterPlanEdit } from "../merge-profile-edits";

const current = {
  answers: { ...ONBOARDING_ANSWERS_DEFAULT, goal: "stay_healthy" as const, age: 30 },
  trainingPreferences: { ...TRAINING_PREFERENCES_DEFAULT, experience: "basic" as const, durationMin: 45 },
  gymEquipment: { ...GYM_EQUIPMENT_DEFAULT, gymType: "large_gym" as const },
};

describe("profileAfterPlanEdit", () => {
  it("copies only the fields that changed since the screen opened", () => {
    const edited = {
      ...current,
      answers: { ...current.answers, goal: "build_muscle" as const },
      trainingPreferences: { ...current.trainingPreferences, durationMin: 60, workoutSplit: "full_body" as const },
    };
    const next = profileAfterPlanEdit({
      current,
      edited,
      openedGoal: current.answers.goal,
      openedPreferences: current.trainingPreferences,
      openedGym: current.gymEquipment,
    });
    expect(next?.answers.goal).toBe("build_muscle");
    expect(next?.answers.age).toBe(30);
    expect(next?.trainingPreferences.durationMin).toBe(60);
    expect(next?.trainingPreferences.experience).toBe("basic");
    expect(next?.trainingPreferences.workoutSplit).toBeNull();
  });

  it("treats the same equipment in a different order as unchanged, and cardio order as a change", () => {
    const openedGym = {
      ...current.gymEquipment,
      equipment: ["dumbbells", "bench"] as ("dumbbells" | "bench")[],
      cardioTypes: ["rowing", "cycling"] as ("rowing" | "cycling")[],
    };
    const reorderedEquipment = profileAfterPlanEdit({
      current,
      edited: {
        ...current,
        gymEquipment: { ...openedGym, equipment: ["bench", "dumbbells"] },
      },
      openedGoal: current.answers.goal,
      openedPreferences: current.trainingPreferences,
      openedGym,
    });
    expect(reorderedEquipment).toBeNull();

    const reorderedCardio = profileAfterPlanEdit({
      current,
      edited: {
        ...current,
        gymEquipment: { ...openedGym, cardioTypes: ["cycling", "rowing"] },
      },
      openedGoal: current.answers.goal,
      openedPreferences: current.trainingPreferences,
      openedGym,
    });
    expect(reorderedCardio?.gymEquipment.cardioTypes).toEqual(["cycling", "rowing"]);
    expect(reorderedCardio?.gymEquipment.equipment).toEqual(current.gymEquipment.equipment);
  });

  it("returns null when the edit did not touch a profile field", () => {
    const edited = {
      ...current,
      trainingPreferences: { ...current.trainingPreferences, workoutSplit: "push_pull_legs" as const },
    };
    expect(
      profileAfterPlanEdit({
        current,
        edited,
        openedGoal: "stay_healthy",
        openedPreferences: current.trainingPreferences,
        openedGym: current.gymEquipment,
      }),
    ).toBeNull();
  });
});

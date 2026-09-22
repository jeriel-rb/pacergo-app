import { describe, expect, it } from "vitest";
import type { GeneratedExercise, GeneratedSession } from "@pacergo/shared";
import {
  EMPTY_PROGRESS,
  clockText,
  findExerciseSlot,
  isSetDone,
  nudgeRest,
  parseProgress,
  secondsLeft,
  sessionBlocks,
  sessionProgress,
  setKey,
  startRest,
  stopRest,
  toggleSet,
} from "../workout-progress";

const ex = (slug: string, sets: number, restSec = 90): GeneratedExercise => ({
  slug,
  name: { en: slug, zh: slug },
  sets,
  reps: "8-12",
  restSec,
});

const SESSION: GeneratedSession = {
  focus: "push",
  warmup: [ex("bodyweight-squat", 1)],
  main: [ex("bench-press", 3), ex("bodyweight-squat", 2)],
  cooldown: [ex("plank", 1)],
  cardio: { placement: "end", exercise: ex("running", 1) },
};

describe("ticking sets", () => {
  it("ticks and unticks one set", () => {
    const key = setKey("main", "bench-press");
    const ticked = toggleSet(EMPTY_PROGRESS, key, 1);
    expect(isSetDone(ticked, key, 1)).toBe(true);
    expect(isSetDone(ticked, key, 0)).toBe(false);
    expect(isSetDone(toggleSet(ticked, key, 1), key, 1)).toBe(false);
  });

  it("keeps the same exercise in different blocks apart", () => {
    const warm = toggleSet(EMPTY_PROGRESS, setKey("warmup", "bodyweight-squat"), 0);
    expect(isSetDone(warm, setKey("main", "bodyweight-squat"), 0)).toBe(false);
  });

  it("unticking a set cancels the rest that followed it", () => {
    const key = setKey("main", "bench-press");
    const resting = startRest(toggleSet(EMPTY_PROGRESS, key, 0), 90, 1000);
    expect(resting.rest).not.toBeNull();
    expect(toggleSet(resting, key, 0).rest).toBeNull();
    // Ticking another set leaves a running countdown alone.
    expect(toggleSet(resting, key, 1).rest).toEqual(resting.rest);
  });
});

describe("rest countdown", () => {
  it("runs from the exercise's rest time and counts down in whole seconds", () => {
    const p = startRest(EMPTY_PROGRESS, 90, 10_000);
    expect(secondsLeft(p.rest!, 10_000)).toBe(90);
    expect(secondsLeft(p.rest!, 10_001)).toBe(90); // rounded up
    expect(secondsLeft(p.rest!, 40_000)).toBe(60);
    expect(secondsLeft(p.rest!, 100_000)).toBe(0);
  });

  it("has no countdown for a rest of 0", () => {
    expect(startRest(EMPTY_PROGRESS, 0, 0).rest).toBeNull();
  });

  it("nudges by ±15 s without going below zero, and does nothing when idle", () => {
    const p = startRest(EMPTY_PROGRESS, 60, 0);
    expect(secondsLeft(nudgeRest(p, 15, 0).rest!, 0)).toBe(75);
    expect(secondsLeft(nudgeRest(p, -15, 0).rest!, 0)).toBe(45);
    expect(secondsLeft(nudgeRest(p, -15, 50_000).rest!, 50_000)).toBe(0);
    expect(nudgeRest(EMPTY_PROGRESS, 15, 0)).toBe(EMPTY_PROGRESS);
  });

  it("stops", () => {
    expect(stopRest(startRest(EMPTY_PROGRESS, 60, 0)).rest).toBeNull();
  });

  it("formats the clock as m:ss", () => {
    expect(clockText(0)).toBe("0:00");
    expect(clockText(9)).toBe("0:09");
    expect(clockText(75)).toBe("1:15");
    expect(clockText(300)).toBe("5:00");
  });
});

describe("session totals", () => {
  it("lists blocks in the order the day shows them, cardio last when placed at the end", () => {
    expect(sessionBlocks(SESSION).map((b) => b.group)).toEqual(["warmup", "main", "main", "cooldown", "cardio"]);
    const start = sessionBlocks({ ...SESSION, cardio: { placement: "start", exercise: ex("running", 1) } });
    expect(start[0]!.group).toBe("cardio");
  });

  it("counts ticked sets against every set in the session", () => {
    expect(sessionProgress(SESSION, EMPTY_PROGRESS)).toEqual({ done: 0, total: 8 });
    let p = toggleSet(EMPTY_PROGRESS, setKey("main", "bench-press"), 0);
    p = toggleSet(p, setKey("warmup", "bodyweight-squat"), 0);
    expect(sessionProgress(SESSION, p)).toEqual({ done: 2, total: 8 });
  });

  it("ignores ticks for sets the plan no longer has", () => {
    // e.g. the plan was refreshed and the exercise now has fewer sets.
    const p = toggleSet(EMPTY_PROGRESS, setKey("main", "bench-press"), 7);
    expect(sessionProgress(SESSION, p).done).toBe(0);
  });
});

describe("saved progress", () => {
  it("round-trips", () => {
    const saved = startRest(toggleSet(EMPTY_PROGRESS, setKey("main", "bench-press"), 0), 90, 5000);
    expect(parseProgress(JSON.stringify(saved))).toEqual(saved);
  });

  it("falls back to an empty workout for missing or broken data", () => {
    expect(parseProgress(null)).toEqual(EMPTY_PROGRESS);
    expect(parseProgress("not json")).toEqual(EMPTY_PROGRESS);
    expect(parseProgress('{"done":{"main:x":"nope"},"rest":{"endsAt":"soon"}}')).toEqual(EMPTY_PROGRESS);
    expect(parseProgress('{"done":{"main:x":[0,-1,1.5,2]}}').done["main:x"]).toEqual([0, 2]);
  });
});

describe("finding an exercise in a day", () => {
  it("returns its block, the exercise after it, and whether it's the last main lift", () => {
    const slot = findExerciseSlot(SESSION, "bodyweight-squat", "main")!;
    expect(slot.group).toBe("main");
    expect(slot.exercise.sets).toBe(2);
    expect(slot.isLastMain).toBe(true);
    expect(slot.next).toMatchObject({ group: "cooldown" });
    expect(findExerciseSlot(SESSION, "bench-press")!.isLastMain).toBe(false);
  });

  it("uses the link's block hint when the exercise appears twice, else prefers main", () => {
    expect(findExerciseSlot(SESSION, "bodyweight-squat", "warmup")!.group).toBe("warmup");
    expect(findExerciseSlot(SESSION, "bodyweight-squat")!.group).toBe("main");
    expect(findExerciseSlot(SESSION, "bodyweight-squat", "nonsense")!.group).toBe("main");
  });

  it("has nothing after the last block, and no slot for an exercise that isn't in the day", () => {
    expect(findExerciseSlot(SESSION, "running")!.next).toBeNull();
    expect(findExerciseSlot(SESSION, "deadlift")).toBeNull();
  });
});

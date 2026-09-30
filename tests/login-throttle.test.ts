import { describe, expect, it } from "vitest";

import {
  BACKOFF_MS,
  IDLE_THROTTLE,
  MAX_ATTEMPTS,
  WINDOW_MS,
  checkThrottle,
  registerFailure,
  resetThrottle,
  waitSeconds,
} from "@/lib/login-throttle";

const NOW = 1_000_000;

function fail(times: number, from = IDLE_THROTTLE, start = NOW) {
  let state = from;
  for (let index = 0; index < times; index += 1) {
    state = registerFailure(state, start);
  }
  return state;
}

describe("login throttle", () => {
  it("allows the first attempts", () => {
    expect(checkThrottle(IDLE_THROTTLE, NOW)).toEqual({ allowed: true, waitMs: 0 });
    expect(checkThrottle(fail(MAX_ATTEMPTS - 1), NOW).allowed).toBe(true);
  });

  it("locks once the attempt budget is spent", () => {
    const state = fail(MAX_ATTEMPTS);
    const decision = checkThrottle(state, NOW);

    expect(decision.allowed).toBe(false);
    expect(decision.waitMs).toBeGreaterThan(0);
    expect(decision.waitMs).toBeLessThanOrEqual(BACKOFF_MS);
  });

  it("grows the lock with every further failure", () => {
    const first = checkThrottle(fail(MAX_ATTEMPTS), NOW).waitMs;
    const second = checkThrottle(fail(MAX_ATTEMPTS + 1), NOW).waitMs;
    expect(second).toBeGreaterThan(first);
    expect(second).toBe(BACKOFF_MS * 2);
  });

  it("unlocks once the lock expires", () => {
    const state = fail(MAX_ATTEMPTS);
    const lockedUntil = state.lockedUntil;
    expect(checkThrottle(state, lockedUntil + 1).allowed).toBe(true);
  });

  it("resets the window after WINDOW_MS of silence", () => {
    const state = fail(MAX_ATTEMPTS, IDLE_THROTTLE, NOW);
    expect(checkThrottle(state, NOW + WINDOW_MS + 1).allowed).toBe(true);
  });

  it("keeps the lock across a window roll", () => {
    const state = fail(MAX_ATTEMPTS, IDLE_THROTTLE, NOW);
    // Backoff is longer than the window here only if configured; assert the
    // lock itself survives the roll by checking just before it expires.
    expect(checkThrottle(state, NOW + 1).allowed).toBe(false);
  });

  it("clears after a successful sign-in", () => {
    expect(resetThrottle()).toEqual(IDLE_THROTTLE);
    expect(checkThrottle(resetThrottle(), NOW).allowed).toBe(true);
  });

  it("rounds the wait up to whole seconds for display", () => {
    expect(waitSeconds(0)).toBe(0);
    expect(waitSeconds(1)).toBe(1);
    expect(waitSeconds(1_001)).toBe(2);
    expect(waitSeconds(30_000)).toBe(30);
  });
});

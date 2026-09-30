/**
 * Client-side throttle for the admin login form.
 *
 * This is NOT a security control — Supabase Auth already rate-limits on the
 * server. Its job is to stop a typo loop or a naive scripted attempt from
 * hammering the network from the browser, and to tell the user exactly how
 * long to wait.
 *
 * Pure functions over an injected clock so tests do not have to sleep.
 */

export const MAX_ATTEMPTS = 5;
export const WINDOW_MS = 60_000;
export const LOCK_MS = 30_000;
/** Lock grows by this factor per failed attempt beyond the limit. */
export const BACKOFF_MS = 30_000;

export type ThrottleState = {
  /** Attempts made inside the current window. */
  attempts: number;
  /** Epoch ms until which sign-in is refused; `0` when not locked. */
  lockedUntil: number;
  /** Epoch ms at which the attempt window started. */
  windowStart: number;
};

export const IDLE_THROTTLE: ThrottleState = { attempts: 0, lockedUntil: 0, windowStart: 0 };

export type ThrottleDecision = {
  allowed: boolean;
  /** Milliseconds the caller must wait before retrying. `0` when allowed. */
  waitMs: number;
};

function rollWindow(state: ThrottleState, now: number): ThrottleState {
  if (state.windowStart === 0 || now - state.windowStart > WINDOW_MS) {
    return { attempts: 0, lockedUntil: state.lockedUntil, windowStart: now };
  }
  return state;
}

/**
 * Once a lock has expired the admin starts from a clean budget instead of
 * being re-locked by the failures that produced it — that is the point of the
 * backoff: punish fast retries, then let a human through.
 */
function rollLock(state: ThrottleState, now: number): ThrottleState {
  if (state.lockedUntil > 0 && state.lockedUntil <= now) {
    return { attempts: 0, lockedUntil: 0, windowStart: now };
  }
  return state;
}

export function checkThrottle(
  state: ThrottleState,
  now: number,
  maxAttempts: number = MAX_ATTEMPTS,
): ThrottleDecision {
  const current = rollLock(rollWindow(state, now), now);

  if (current.lockedUntil > now) {
    return { allowed: false, waitMs: current.lockedUntil - now };
  }
  if (current.attempts >= maxAttempts) {
    return { allowed: false, waitMs: Math.max(0, current.windowStart + WINDOW_MS - now) };
  }
  return { allowed: true, waitMs: 0 };
}

/**
 * Record a failed attempt. Once `maxAttempts` is reached inside the window,
 * lock for `BACKOFF_MS * (attempts - maxAttempts + 1)`.
 */
export function registerFailure(
  state: ThrottleState,
  now: number,
  maxAttempts: number = MAX_ATTEMPTS,
): ThrottleState {
  const rolled = rollLock(rollWindow(state, now), now);
  const attempts = rolled.attempts + 1;

  if (attempts >= maxAttempts) {
    const over = attempts - maxAttempts + 1;
    return {
      attempts,
      windowStart: rolled.windowStart,
      lockedUntil: now + BACKOFF_MS * over,
    };
  }

  return { attempts, windowStart: rolled.windowStart, lockedUntil: rolled.lockedUntil };
}

/** Called after a successful sign-in (or when the user resets the form). */
export function resetThrottle(): ThrottleState {
  return { ...IDLE_THROTTLE };
}

/** Seconds to display to the user, rounded up so it never says 0 too early. */
export function waitSeconds(waitMs: number): number {
  return Math.ceil(waitMs / 1000);
}

/**
 * Lazy accessor for the Supabase client.
 *
 * Every module in `src/data/` goes through this file, and this file only ever
 * `import()`s the real client. That keeps `@supabase/supabase-js` (~50 kB gz)
 * out of the public entry chunk — it is fetched the first time the app actually
 * talks to the database, and never for a visitor who only reads the cached list.
 *
 * No component may import `@/integrations/supabase/client` directly; route
 * modules and UI must import from `src/data/*` instead.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/integrations/supabase/types";
import { DataError } from "@/data/errors";

export type DataClient = SupabaseClient<Database>;

let clientPromise: Promise<DataClient> | undefined;

export async function getSupabase(): Promise<DataClient> {
  if (!clientPromise) {
    clientPromise = import("@/integrations/supabase/client").then(
      (module) => module.supabase as DataClient,
    );
    // If construction failed (missing env), let the next caller retry instead of
    // caching a permanently rejected promise.
    clientPromise.catch(() => {
      clientPromise = undefined;
    });
  }
  try {
    return await clientPromise;
  } catch (error) {
    throw new DataError("config", "en", error);
  }
}

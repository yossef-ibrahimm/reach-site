#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

const EXPORT_VERSION = 1;
const TABLES = ["categories", "brands", "products"];

function usage(code) {
  const text = [
    "Restore an Eltawkol Fire admin export into Supabase.",
    "",
    "Usage:",
    "  node scripts/import-json.mjs <backup.json> [--dry-run]",
    "",
    "Environment (required):",
    "  SUPABASE_URL                e.g. https://xxxx.supabase.co",
    "  SUPABASE_SERVICE_ROLE_KEY   service role key (never the publishable key)",
    "  VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY are read as fallbacks for the URL only",
    "",
    "The script upserts in order: categories -> brands -> products.",
    "Existing rows are merged on their primary key (id).",
  ].join("\n");
  console.log(text);
  process.exit(code);
}

function fail(message) {
  console.error(`error: ${message}`);
  process.exit(1);
}

function isPlainObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isArrayOf(value, predicate) {
  return Array.isArray(value) && value.every(predicate);
}

function isCategory(row) {
  return (
    isPlainObject(row) &&
    typeof row.id === "string" &&
    row.id.length > 0 &&
    typeof row.name_ar === "string" &&
    typeof row.name_en === "string"
  );
}

function isBrand(row) {
  return (
    isPlainObject(row) &&
    typeof row.id === "string" &&
    row.id.length > 0 &&
    typeof row.name_ar === "string" &&
    typeof row.name_en === "string"
  );
}

function isProduct(row) {
  return (
    isPlainObject(row) &&
    typeof row.id === "number" &&
    Number.isInteger(row.id) &&
    typeof row.name_ar === "string" &&
    typeof row.name_en === "string" &&
    typeof row.category_id === "string"
  );
}

function isExportPayload(value) {
  if (!isPlainObject(value)) return false;
  if (value.version !== EXPORT_VERSION) return false;
  return (
    typeof value.exported_at === "string" &&
    isArrayOf(value.categories, isCategory) &&
    isArrayOf(value.brands, isBrand) &&
    isArrayOf(value.products, isProduct)
  );
}

function pick(row, keys) {
  const out = {};
  for (const key of keys) {
    if (row[key] !== undefined && row[key] !== null) out[key] = row[key];
  }
  return out;
}

async function rest(url, key, path, body) {
  const response = await fetch(`${url}/rest/v1/${path}`, {
    method: "POST",
    headers: {
      apikey: key,
      authorization: `Bearer ${key}`,
      "content-type": "application/json",
      prefer: "resolution=merge-duplicates,return=minimal",
    },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const detail = (await response.text().catch(() => "")).trim();
    throw new Error(`${path} -> HTTP ${response.status}${detail ? `\n${detail}` : ""}`);
  }
}

async function main() {
  const args = process.argv.slice(2);
  if (args.includes("--help") || args.includes("-h")) usage(0);

  const dryRun = args.includes("--dry-run");
  const file = args.find((arg) => !arg.startsWith("--"));
  if (!file) usage(1);

  const url = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "").replace(/\/+$/, "");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  if (!url) fail("SUPABASE_URL (or VITE_SUPABASE_URL) is not set.");
  if (!key)
    fail(
      "SUPABASE_SERVICE_ROLE_KEY is not set. Use the service role key, not the publishable key.",
    );
  if (key.startsWith("sb_publishable_"))
    fail("SUPABASE_SERVICE_ROLE_KEY looks like a publishable key.");

  let payload;
  try {
    payload = JSON.parse(await readFile(file, "utf8"));
  } catch (error) {
    fail(`cannot read ${file}: ${error.message}`);
  }

  if (!isExportPayload(payload)) {
    fail(
      `not a valid export (expected version ${EXPORT_VERSION} with categories[], brands[], products[]).`,
    );
  }

  const categoryIds = new Set(payload.categories.map((row) => row.id));
  const brandIds = new Set(payload.brands.map((row) => row.id));

  const orphanCategories = payload.products.filter((row) => !categoryIds.has(row.category_id));
  const orphanBrands = payload.products.filter(
    (row) => row.brand_id != null && row.brand_id !== "" && !brandIds.has(row.brand_id),
  );
  if (orphanCategories.length > 0 || orphanBrands.length > 0) {
    const sample = [...orphanCategories, ...orphanBrands].slice(0, 3).map((row) => row.id);
    fail(
      `${orphanCategories.length} product(s) reference a missing category and ` +
        `${orphanBrands.length} reference a missing brand (e.g. product id ${sample.join(", ")}).`,
    );
  }

  const categories = payload.categories.map((row) =>
    pick(row, ["id", "name_ar", "name_en", "sort"]),
  );
  const brands = payload.brands.map((row) => pick(row, ["id", "name_ar", "name_en"]));
  const products = payload.products.map((row) =>
    pick(row, [
      "id",
      "name_ar",
      "name_en",
      "category_id",
      "brand_id",
      "image_path",
      "description_ar",
      "description_en",
      "features_ar",
      "features_en",
      "specs",
      "created_at",
      "updated_at",
    ]),
  );

  console.log(
    `${file}: version ${payload.version}, exported ${payload.exported_at}\n` +
      `  categories ${categories.length}\n  brands ${brands.length}\n  products ${products.length}`,
  );

  if (dryRun) {
    console.log("dry run: nothing written.");
    return;
  }

  const batches = { categories, brands, products };
  for (const table of TABLES) {
    const rows = batches[table];
    if (rows.length === 0) continue;
    await rest(url, key, `${table}?on_conflict=id`, rows);
    console.log(`  upserted ${rows.length} into ${table}`);
  }
  console.log("done.");
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}

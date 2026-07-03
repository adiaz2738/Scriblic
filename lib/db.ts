import { neon, NeonQueryFunction } from "@neondatabase/serverless";

let cached: NeonQueryFunction<false, false> | null = null;

export function getSql() {
  if (!process.env.DATABASE_URL) {
    throw new Error(
      "DATABASE_URL is not set. Add it to your environment variables (see SETUP.md) and restart the dev server."
    );
  }
  if (!cached) {
    cached = neon(process.env.DATABASE_URL, { fetchOptions: { cache: "no-store" } });
  }
  return cached;
}

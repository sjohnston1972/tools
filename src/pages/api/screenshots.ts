import type { APIRoute } from "astro";
import { isValidSlug, listShots, jsonResponse } from "../../lib/admin";

export const prerender = false;

// Public: list the screenshots stored for a tool.
export const GET: APIRoute = async ({ url, locals }) => {
  const env = locals.runtime.env;
  const slug = url.searchParams.get("slug");
  if (!isValidSlug(slug)) {
    return jsonResponse({ message: "Unknown tool." }, 400);
  }
  if (!env.SCREENSHOTS) {
    return jsonResponse({ images: [] });
  }
  const images = await listShots(env, slug);
  return jsonResponse(
    { images },
    200,
    { "Cache-Control": "no-store" },
  );
};

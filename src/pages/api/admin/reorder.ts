import type { APIRoute } from "astro";
import {
  checkAdminPin,
  clientIp,
  isValidSlug,
  listShots,
  setOrder,
  jsonResponse,
  MAX_SHOTS_PER_TOOL,
} from "../../../lib/admin";

export const prerender = false;

// Admin: set the display order of a tool's screenshots. JSON body
// { slug, order: string[] } where order lists filenames in the desired order
// (index 0 = hero). PIN via x-admin-pin.
export const POST: APIRoute = async ({ request, locals, clientAddress }) => {
  const env = locals.runtime.env;
  const ip = clientIp(request, clientAddress);

  const pinCheck = await checkAdminPin(env, request.headers.get("x-admin-pin"), ip);
  if (!pinCheck.ok) {
    return jsonResponse({ message: pinCheck.message }, pinCheck.status);
  }

  if (!env.SCREENSHOTS) {
    return jsonResponse({ message: "Storage is not configured." }, 500);
  }

  let body: { slug?: unknown; order?: unknown };
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ message: "Invalid JSON body" }, 400);
  }

  const { slug, order } = body;
  if (!isValidSlug(slug)) {
    return jsonResponse({ message: "Unknown tool." }, 400);
  }
  if (
    !Array.isArray(order) ||
    order.length > MAX_SHOTS_PER_TOOL ||
    !order.every((f) => typeof f === "string" && f.length > 0 && !f.includes("/"))
  ) {
    return jsonResponse({ message: "Invalid order." }, 400);
  }

  await setOrder(env, slug, order as string[]);

  const images = await listShots(env, slug);
  return jsonResponse({ ok: true, images });
};

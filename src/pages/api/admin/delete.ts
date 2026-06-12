import type { APIRoute } from "astro";
import {
  checkAdminPin,
  clientIp,
  isValidSlug,
  listShots,
  jsonResponse,
} from "../../../lib/admin";

export const prerender = false;

// Admin: delete a screenshot. JSON body { slug, file }; PIN via x-admin-pin.
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

  let body: { slug?: unknown; file?: unknown };
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ message: "Invalid JSON body" }, 400);
  }

  const { slug, file } = body;
  if (!isValidSlug(slug)) {
    return jsonResponse({ message: "Unknown tool." }, 400);
  }
  if (typeof file !== "string" || !file || file.includes("/")) {
    return jsonResponse({ message: "Invalid file." }, 400);
  }

  await env.SCREENSHOTS.delete(`${slug}/${file}`);

  const images = await listShots(env, slug);
  return jsonResponse({ ok: true, images });
};

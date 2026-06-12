import type { APIRoute } from "astro";
import {
  checkAdminPin,
  clientIp,
  isValidSlug,
  listShots,
  jsonResponse,
  ALLOWED_TYPES,
  MAX_BYTES,
  MAX_SHOTS_PER_TOOL,
} from "../../../lib/admin";

export const prerender = false;

// Admin: upload a screenshot for a tool. multipart/form-data with fields
// `slug` and `file`; PIN supplied via the x-admin-pin header.
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

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return jsonResponse({ message: "Expected multipart form data." }, 400);
  }

  const slug = form.get("slug");
  const file = form.get("file");

  if (!isValidSlug(slug)) {
    return jsonResponse({ message: "Unknown tool." }, 400);
  }
  if (!(file instanceof File)) {
    return jsonResponse({ message: "No file provided." }, 400);
  }

  const ext = ALLOWED_TYPES[file.type];
  if (!ext) {
    return jsonResponse(
      { message: "Unsupported file type. Use PNG, JPEG, WebP, GIF, or AVIF." },
      415,
    );
  }
  if (file.size > MAX_BYTES) {
    return jsonResponse(
      { message: `File too large (max ${Math.round(MAX_BYTES / 1024 / 1024)} MB).` },
      413,
    );
  }

  const existing = await listShots(env, slug);
  if (existing.length >= MAX_SHOTS_PER_TOOL) {
    return jsonResponse(
      { message: `Limit reached (${MAX_SHOTS_PER_TOOL} screenshots per tool). Delete one first.` },
      409,
    );
  }

  // Timestamp prefix keeps natural sort = chronological order.
  const key = `${slug}/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`;
  await env.SCREENSHOTS.put(key, file.stream(), {
    httpMetadata: { contentType: file.type },
  });

  const images = await listShots(env, slug);
  return jsonResponse({ ok: true, images });
};

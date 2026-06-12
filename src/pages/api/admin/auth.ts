import type { APIRoute } from "astro";
import { checkAdminPin, clientIp, jsonResponse } from "../../../lib/admin";

export const prerender = false;

// Validate a PIN so the browser can enter admin mode. The PIN itself is still
// re-checked on every upload/delete; this endpoint is just for UX.
export const POST: APIRoute = async ({ request, locals, clientAddress }) => {
  const env = locals.runtime.env;
  let body: { pin?: unknown };
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ message: "Invalid JSON body" }, 400);
  }

  const result = await checkAdminPin(env, body.pin, clientIp(request, clientAddress));
  if (!result.ok) {
    return jsonResponse({ message: result.message }, result.status);
  }
  return jsonResponse({ ok: true });
};

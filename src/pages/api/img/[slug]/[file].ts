import type { APIRoute } from "astro";
import { isValidSlug } from "../../../../lib/admin";

export const prerender = false;

// Public: stream a screenshot object out of R2. Filenames are unique
// (timestamp-prefixed) so these are safe to cache hard.
export const GET: APIRoute = async ({ params, locals }) => {
  const env = locals.runtime.env;
  const { slug, file } = params;

  if (!isValidSlug(slug) || !file || file.includes("/")) {
    return new Response("Not found", { status: 404 });
  }
  if (!env.SCREENSHOTS) {
    return new Response("Not found", { status: 404 });
  }

  const obj = await env.SCREENSHOTS.get(`${slug}/${file}`);
  if (!obj) {
    return new Response("Not found", { status: 404 });
  }

  const headers = new Headers();
  obj.writeHttpMetadata(headers);
  headers.set("etag", obj.httpEtag);
  headers.set("Cache-Control", "public, max-age=86400");
  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "application/octet-stream");
  }

  return new Response(obj.body, { headers });
};

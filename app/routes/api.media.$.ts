import { type LoaderFunctionArgs } from "@remix-run/cloudflare";

export async function loader({ request, params, context }: LoaderFunctionArgs) {
  const { "*": path } = params;
  if (!path) {
    return new Response("Not Found", { status: 404 });
  }

  const bucket = context.cloudflare.env.BUCKET;
  const object = await bucket.get(path);

  if (object === null) {
    return new Response("Not Found", { status: 404 });
  }

  const headers = new Headers();
  if (object.httpMetadata?.contentType) {
    headers.set("Content-Type", object.httpMetadata.contentType);
  }
  headers.set("etag", object.httpEtag);
  // Cache aggressively
  headers.set("Cache-Control", "public, max-age=31536000, immutable");

  return new Response(object.body, {
    headers,
  });
}

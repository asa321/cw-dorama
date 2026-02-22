import { json, type LoaderFunctionArgs } from "@remix-run/cloudflare";
import { requireAdminSession } from "../utils/session.server";

export async function loader({ request, context }: LoaderFunctionArgs) {
  const db = context.cloudflare.env.DB;
  const bucket = context.cloudflare.env.BUCKET;

  await requireAdminSession(db, request);

  const url = new URL(request.url);
  const prefix = url.searchParams.get("prefix") || "uploads/";

  const listed = await bucket.list({ prefix });

  // ソート (新しい順)
  const sortedObjects = listed.objects.sort((a, b) => {
    return b.uploaded.getTime() - a.uploaded.getTime();
  });

  return json({
    media: sortedObjects.map(obj => ({
      key: obj.key,
      url: `/api/media/${obj.key}`,
      size: obj.size,
      uploadedAt: obj.uploaded,
      contentType: obj.httpMetadata?.contentType || "unknown"
    }))
  });
}

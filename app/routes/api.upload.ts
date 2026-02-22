import { json, type ActionFunctionArgs } from "@remix-run/cloudflare";
import { requireAdminSession } from "../utils/session.server";

export async function action({ request, context }: ActionFunctionArgs) {
  const db = context.cloudflare.env.DB;
  const bucket = context.cloudflare.env.BUCKET;

  await requireAdminSession(db, request);

  const formData = await request.formData();
  const file = formData.get("file") || formData.get("image");

  if (!file || !(file instanceof File)) {
    return json({ error: "ファイルが選択されていません。" }, { status: 400 });
  }

  // Basic validation
  if (!file.type.startsWith("image/")) {
    return json({ error: "画像ファイルのみアップロード可能です。" }, { status: 400 });
  }

  if (file.size > 5 * 1024 * 1024) { // 5MB limit
    return json({ error: "ファイルサイズは5MB以下にしてください。" }, { status: 400 });
  }

  try {
    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const uniqueFileName = `${Date.now()}-${crypto.randomUUID()}.${ext}`;
    const key = `uploads/${uniqueFileName}`;

    const arrayBuffer = await file.arrayBuffer();

    await bucket.put(key, arrayBuffer, {
      httpMetadata: {
        contentType: file.type,
      },
    });

    return json({
      success: true,
      key,
      url: `/api/media/${key}` // We will create this proxy route next
    });
  } catch (error) {
    console.error("Upload error:", error);
    return json({ error: "アップロードに失敗しました。" }, { status: 500 });
  }
}

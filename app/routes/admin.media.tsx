import { json, type ActionFunctionArgs, type LoaderFunctionArgs } from "@remix-run/cloudflare";
import { Link, useFetcher, useLoaderData } from "@remix-run/react";
import { requireAdminSession } from "../utils/session.server";

export async function loader({ request, context }: LoaderFunctionArgs) {
  const db = context.cloudflare.env.DB;
  const bucket = context.cloudflare.env.BUCKET;

  await requireAdminSession(db, request);

  // NOTE: R2のオブジェクト一覧を取得
  // prefixes を指定すればディレクトリごとの取得も可能だが、今回は uploads/ 配下をすべて取得
  const listed = await bucket.list({ prefix: "uploads/" });

  // オブジェクトの配列を新しいもの順にソート (uploadedはDateオブジェクト)
  const sortedObjects = listed.objects.sort((a, b) => {
    return b.uploaded.getTime() - a.uploaded.getTime();
  });

  // 使用中の画像をDBから取得して、削除不可にするためのチェック用
  const { results: usedImages } = await db.prepare(
    "SELECT hero_image_key FROM articles WHERE hero_image_key IS NOT NULL"
  ).all<{ hero_image_key: string }>();

  const usedImageKeys = new Set(usedImages.map(img => img.hero_image_key));

  return json({
    media: sortedObjects.map(obj => ({
      key: obj.key,
      size: obj.size,
      uploadedAt: obj.uploaded,
      contentType: obj.httpMetadata?.contentType || "unknown",
      isUsed: usedImageKeys.has(obj.key)
    }))
  });
}

export async function action({ request, context }: ActionFunctionArgs) {
  const db = context.cloudflare.env.DB;
  const bucket = context.cloudflare.env.BUCKET;

  await requireAdminSession(db, request);

  const formData = await request.formData();
  const intent = formData.get("_intent");
  const key = formData.get("key") as string;

  if (intent === "delete" && key) {
    // 記事で使用中の画像は削除できないように防御
    const isUsed = await db.prepare("SELECT 1 FROM articles WHERE hero_image_key = ?").bind(key).first();
    if (isUsed) {
      return json({ error: "この記事は使用中のため削除できません" }, { status: 400 });
    }

    try {
      await bucket.delete(key);
      return json({ success: true });
    } catch (error) {
      return json({ error: "削除に失敗しました" }, { status: 500 });
    }
  }

  return json({ error: "無効なリクエストです" }, { status: 400 });
}

export default function AdminMedia() {
  const { media } = useLoaderData<typeof loader>();

  // サイズ表示用のヘルパー
  const formatBytes = (bytes: number, decimals = 2) => {
    if (!+bytes) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 border-b-2 border-pink-500 pb-2 inline-block">メディア管理</h1>
          <p className="mt-2 text-sm text-gray-500">記事にアップロードされた画像（Cloudflare R2）の管理を行います。</p>
        </div>
        <Link
          to="/admin/articles/new"
          className="text-sm font-medium text-pink-600 bg-pink-50 hover:bg-pink-100 px-4 py-2 rounded-lg transition-colors border border-pink-100"
        >
          新しい記事でアップロード &rarr;
        </Link>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {media.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 p-6">
            {media.map((item) => (
              <MediaCard key={item.key} item={item} formatBytes={formatBytes} />
            ))}
          </div>
        ) : (
          <div className="p-16 text-center">
            <div className="text-5xl mb-4 text-gray-300">🖼️</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">メディアがありません</h3>
            <p className="text-gray-500 mb-6">記事を作成して画像をアップロードすると、ここに表示されます。</p>
          </div>
        )}
      </div>
    </div>
  );
}

function MediaCard({ item, formatBytes }: { item: any, formatBytes: (b: number) => string }) {
  const fetcher = useFetcher<typeof action>();
  const isDeleting = fetcher.state !== "idle" && fetcher.formData?.get("_intent") === "delete";
  const url = `/api/media/${item.key}`;

  const handleDelete = () => {
    if (confirm("本当にこの画像を削除しますか？")) {
      fetcher.submit(
        { _intent: "delete", key: item.key },
        { method: "post" }
      );
    }
  };

  if (isDeleting) return null; // 削除中（Optimistic UI）

  return (
    <div className="group bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-md transition-all flex flex-col relative">
      <div className="aspect-square bg-gray-50 relative overflow-hidden flex items-center justify-center">
        {/* 背景チェッカーボード（透過画像用） */}
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4IiBoZWlnaHQ9IjgiPgo8cmVjdCB3aWR0aD0iNCIgaGVpZ2h0PSI0IiBmaWxsPSIjZjBmMGYwIi8+CjxyZWN0IHk9IjQiIHdpZHRoPSI0IiBoZWlnaHQ9IjQiIGZpbGw9IiNmZmYiLz4KPHJlY3QgeD0iNCIgd2lkdGg9IjQiIGhlaWdodD0iNCIgZmlsbD0iI2ZmZiIvPgo8cmVjdCB4PSI0IiB5PSI0IiB3aWR0aD0iNCIgaGVpZ2h0PSI0IiBmaWxsPSIjZjBmMGYwIi8+Cjwvc3ZnPg==')] opacity-50 z-0"></div>

        <img
          src={url}
          alt={item.key}
          className="object-contain w-full h-full relative z-10 group-hover:scale-105 transition-transform duration-300"
          loading="lazy"
        />

        {/* Hover Actions Overlay */}
        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity z-20 flex items-center justify-center gap-2">
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 bg-white/20 hover:bg-white/40 rounded-full text-white backdrop-blur-sm transition-colors"
            title="プレビュー"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg>
          </a>

          {!item.isUsed && (
            <button
              onClick={handleDelete}
              className="p-2 bg-red-500/80 hover:bg-red-600 rounded-full text-white backdrop-blur-sm transition-colors"
              title="削除"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
            </button>
          )}
        </div>
      </div>

      <div className="p-3 flex-1 flex flex-col text-xs border-t border-gray-100">
        <div className="truncate font-mono text-gray-700 mb-1 font-medium" title={item.key.replace("uploads/", "")}>
          {item.key.replace("uploads/", "")}
        </div>
        <div className="flex justify-between items-center text-gray-500 mt-auto">
          <span>{formatBytes(item.size)}</span>
          {item.isUsed ? (
            <span className="px-1.5 py-0.5 bg-green-100 text-green-700 rounded text-[10px] font-bold">使用中</span>
          ) : (
            <span className="px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded text-[10px]">未使用</span>
          )}
        </div>
      </div>
    </div>
  );
}

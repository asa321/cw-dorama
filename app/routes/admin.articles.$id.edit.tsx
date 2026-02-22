import { json, redirect, type ActionFunctionArgs, type LoaderFunctionArgs, type LinksFunction } from "@remix-run/cloudflare";
import { Form, useActionData, useLoaderData, useNavigation, Link, useSubmit } from "@remix-run/react";
import { useState } from "react";
import { requireAdminSession } from "../utils/session.server";
import type { Article } from "../utils/db.server";
import { ClientOnly } from "../components/ClientOnly";
import MDEditor from "@uiw/react-md-editor";
import { getJapaneseCommands, getJapaneseExtraCommands } from "../utils/editorCommands";

import editorStyles from "@uiw/react-md-editor/markdown-editor.css?url";
import previewStyles from "@uiw/react-markdown-preview/markdown.css?url";

export const links: LinksFunction = () => [
  { rel: "stylesheet", href: editorStyles },
  { rel: "stylesheet", href: previewStyles },
];

export async function loader({ request, params, context }: LoaderFunctionArgs) {
  const { id } = params;
  const db = context.cloudflare.env.DB;
  await requireAdminSession(db, request);

  const article = await db.prepare("SELECT * FROM articles WHERE id = ?").bind(id).first<Article>();

  if (!article) {
    throw new Response("記事が見つかりません", { status: 404 });
  }

  const { results: tags } = await db.prepare("SELECT tag FROM article_tags WHERE article_id = ?").bind(id).all<{ tag: string }>();

  return json({
    article: { ...article, tagsStr: tags.map(t => t.tag).join(", ") }
  });
}

export async function action({ request, params, context }: ActionFunctionArgs) {
  const { id } = params;
  if (!id) return json({ error: "無効なIDです" }, { status: 400 });

  const db = context.cloudflare.env.DB;
  const session = await requireAdminSession(db, request);

  const formData = await request.formData();
  const intent = formData.get("_intent");

  if (intent === "delete") {
    await db.prepare("DELETE FROM articles WHERE id = ?").bind(id).run();
    return redirect("/admin/articles");
  }

  const title = formData.get("title") as string;
  const slug = formData.get("slug") as string;
  const excerpt = formData.get("excerpt") as string;
  const content = formData.get("content") as string;
  const tagsStr = formData.get("tags") as string;
  const status = formData.get("status") as string;
  const heroImageKey = formData.get("hero_image_key") as string || null;

  if (!title || !slug || !content) {
    return json({ error: "タイトル、スラッグ、本文は必須です。" }, { status: 400 });
  }

  // Check unique slug (excluding self)
  const existingArticle = await db.prepare("SELECT 1 FROM articles WHERE slug = ? AND id != ?").bind(slug, id).first();
  if (existingArticle) {
    return json({ error: "このスラッグは既に他の記事で使われています。" }, { status: 400 });
  }

  try {
    // 1. Log version history before updating (Audit feature)
    const oldArticle = await db.prepare("SELECT title, content FROM articles WHERE id = ?").bind(id).first<{ title: string, content: string }>();
    if (oldArticle) {
      await db.prepare(
        "INSERT INTO article_versions (article_id, title, content, edited_by) VALUES (?, ?, ?, ?)"
      ).bind(id, oldArticle.title, oldArticle.content, session.admin_id).run();
    }

    // 2. Update article
    await db.prepare(`
      UPDATE articles 
      SET title = ?, slug = ?, excerpt = ?, content = ?, status = ?, hero_image_key = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
  `).bind(title, slug, excerpt, content, status, heroImageKey, id).run();

    // 3. Update tags (Delete existing, insert new)
    await db.prepare("DELETE FROM article_tags WHERE article_id = ?").bind(id).run();
    if (tagsStr) {
      const tags = tagsStr.split(",").map(t => t.trim()).filter(Boolean);
      for (const tag of tags) {
        await db.prepare("INSERT INTO article_tags (article_id, tag) VALUES (?, ?)").bind(id, tag).run();
      }
    }

    return redirect("/admin/articles");
  } catch (err) {
    console.error(err);
    return json({ error: "記事の更新中にエラーが発生しました。" }, { status: 500 });
  }
}

export default function EditArticle() {
  const { article } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const submit = useSubmit();
  const isSubmitting = navigation.state === "submitting" && navigation.formData?.get("_intent") !== "delete";
  const isDeleting = navigation.state === "submitting" && navigation.formData?.get("_intent") === "delete";
  const [isUploading, setIsUploading] = useState(false);
  const [content, setContent] = useState(article.content || "");

  const handleDelete = () => {
    if (confirm("本当にこの記事を削除しますか？この操作は取り消せません。")) {
      const formData = new FormData();
      formData.set("_intent", "delete");
      submit(formData, { method: "post" });
    }
  };

  return (
    <div>
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 border-b-2 border-pink-500 pb-2 inline-block">記事の編集</h1>
          <p className="mt-2 text-sm text-gray-500">公開済みの記事や下書きを再編集します。</p>
        </div>

        <div className="flex gap-2 items-center text-sm font-medium">
          <Link
            to={`/articles/${article.slug}`}
            target="_blank"
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-white border border-gray-300 text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors"
          >
            プレビュー <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path></svg>
          </Link>
          <button
            type="button"
            onClick={handleDelete}
            disabled={isDeleting}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 transition-colors disabled:opacity-50"
          >
            {isDeleting ? "削除中..." : "削除"}
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 md:p-8">
        <Form method="post" className="space-y-8">
          <input type="hidden" name="_intent" value="update" />

          {actionData?.error && (
            <div className="p-4 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm font-medium">
              {actionData.error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="col-span-2">
              <label htmlFor="title" className="block text-sm font-bold text-gray-700 mb-1">
                タイトル <span className="text-red-500">*</span>
              </label>
              <input
                id="title"
                name="title"
                type="text"
                required
                defaultValue={article.title}
                className="w-full rounded-lg border-gray-300 border px-4 py-2.5 bg-white text-gray-900 focus:border-pink-500 focus:ring-pink-500 transition-colors"
              />
            </div>

            <div>
              <label htmlFor="slug" className="block text-sm font-bold text-gray-700 mb-1">
                URLスラッグ <span className="text-red-500">*</span>
              </label>
              <input
                id="slug"
                name="slug"
                type="text"
                required
                pattern="[a-zA-Z0-9-]+"
                defaultValue={article.slug}
                className="w-full rounded-lg border-gray-300 border px-4 py-2.5 text-gray-900 focus:border-pink-500 focus:ring-pink-500 transition-colors bg-gray-50 font-mono text-sm"
              />
              <p className="mt-1.5 text-xs text-gray-500">※URLの一部になります（例: /articles/slug-name）</p>
            </div>

            <div>
              <label htmlFor="status" className="block text-sm font-bold text-gray-700 mb-1">
                公開ステータス
              </label>
              <select
                id="status"
                name="status"
                defaultValue={article.status}
                className="w-full rounded-lg border-gray-300 border px-4 py-2.5 text-gray-900 focus:border-pink-500 focus:ring-pink-500 transition-colors bg-white"
              >
                <option value="draft">📝 下書き</option>
                <option value="published">🌐 公開する</option>
                <option value="archived">📦 アーカイブ</option>
              </select>
            </div>

            <div className="col-span-2">
              <label htmlFor="excerpt" className="block text-sm font-bold text-gray-700 mb-1">
                抜粋（概要）
              </label>
              <textarea
                id="excerpt"
                name="excerpt"
                rows={3}
                defaultValue={article.excerpt || ""}
                placeholder="記事の一覧ページなどに表示される簡単な説明文です。"
                className="w-full rounded-lg border-gray-300 border px-4 py-3 bg-white text-gray-900 focus:border-pink-500 focus:ring-pink-500 transition-colors resize-none"
              />
            </div>

            <div>
              <label htmlFor="tags" className="block text-sm font-bold text-gray-700 mb-1">
                タグ (カンマ区切り)
              </label>
              <input
                id="tags"
                name="tags"
                type="text"
                defaultValue={article.tagsStr || ""}
                placeholder="恋愛, Netflix, ヒョンビン"
                className="w-full rounded-lg border-gray-300 border px-4 py-2.5 bg-white text-gray-900 focus:border-pink-500 focus:ring-pink-500 transition-colors"
                onChange={(e) => {
                  e.target.value = e.target.value.replace(/、/g, ',');
                }}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-gray-100">
            <div className="col-span-2">
              <label className="block text-sm font-bold text-gray-700 mb-2">
                ヒーロー画像 (サムネイル)
              </label>

              <div className="flex items-start gap-6">
                <div className="flex-1">
                  <div className="flex items-center justify-center w-full">
                    <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-xl cursor-pointer bg-gray-50 hover:bg-gray-100 hover:border-pink-400 transition-colors relative overflow-hidden group">
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <svg className="w-8 h-8 text-gray-400 group-hover:text-pink-500 mb-2 transition-colors" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 16">
                          <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2" />
                        </svg>
                        <p className="mb-1 text-sm text-gray-500"><span className="font-semibold text-pink-600">クリックして変更</span></p>
                        <p className="text-xs text-gray-400">SVG, PNG, JPG, WEBP (最大. 5MB)</p>
                      </div>
                      <input
                        type="file"
                        className="hidden"
                        accept="image/*"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setIsUploading(true);
                            const formData = new FormData();
                            formData.append("image", file);

                            try {
                              const res = await fetch("/api/upload", {
                                method: "POST",
                                body: formData
                              });
                              const data = await res.json() as any;

                              if (data.success) {
                                (document.getElementById("hero_image_key") as HTMLInputElement).value = data.key || "";
                                const preview = document.getElementById("hero_preview") as HTMLImageElement;
                                if (preview) {
                                  preview.src = data.url;
                                  preview.classList.remove("hidden");
                                }
                                const placeholder = document.getElementById("preview_placeholder");
                                if (placeholder) placeholder.classList.add("hidden");
                              } else {
                                alert(data.error || "アップロードに失敗しました");
                              }
                            } catch (err) {
                              alert("エラーが発生しました");
                            } finally {
                              setIsUploading(false);
                            }
                          }
                        }}
                      />
                      {isUploading && (
                        <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
                          <div className="w-6 h-6 border-2 border-pink-500 border-t-transparent rounded-full animate-spin"></div>
                        </div>
                      )}
                    </label>
                  </div>
                  <input type="hidden" name="hero_image_key" id="hero_image_key" defaultValue={article.hero_image_key || ""} />
                </div>

                <div className="w-48 h-32 rounded-xl border border-gray-200 bg-gray-50 overflow-hidden flex-shrink-0 relative shadow-inner">
                  {article.hero_image_key ? (
                    <img id="hero_preview" src={`/api/media/${article.hero_image_key}`} alt="Preview" className="w-full h-full object-cover relative z-10" />
                  ) : (
                    <>
                      <div id="preview_placeholder" className="absolute inset-0 flex items-center justify-center text-gray-400 text-sm">
                        プレビュー
                      </div>
                      <img id="hero_preview" src="" alt="Preview" className="w-full h-full object-cover hidden relative z-10" />
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-gray-100">
            <label htmlFor="content" className="block text-sm font-bold text-gray-700 mb-2">
              本文 (Markdown) <span className="text-red-500">*</span>
            </label>
            <input type="hidden" name="content" value={content} />
            <div data-color-mode="light" className="rich-editor-container overflow-hidden rounded-lg shadow-sm">
              <ClientOnly fallback={<div className="h-96 w-full bg-gray-50 flex items-center justify-center text-gray-500 rounded-lg border border-gray-300 shadow-sm animate-pulse">エディタを読み込み中...</div>}>
                {() => (
                  <MDEditor
                    value={content}
                    onChange={(val) => setContent(val || "")}
                    height={600}
                    commands={getJapaneseCommands()}
                    extraCommands={getJapaneseExtraCommands()}
                    style={{ backgroundColor: 'white', color: '#1f2937' }}
                    textareaProps={{
                      placeholder: "マークダウンで記事を記述してください。ツールバーから画像やリンクの挿入も可能です。",
                      style: { color: '#1f2937' }
                    }}
                  />
                )}
              </ClientOnly>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-8 border-t border-gray-100 mt-8">
            <div className="text-sm text-gray-500">
              <p>作成: {new Date(article.created_at).toLocaleDateString('ja-JP')} • 更新: {new Date(article.updated_at).toLocaleDateString('ja-JP')}</p>
            </div>
            <div className="flex gap-4 w-full sm:w-auto">
              <Link
                to="/admin/articles"
                className="flex-1 sm:flex-none text-center px-6 py-2.5 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
              >
                キャンセル
              </Link>
              <button
                type="submit"
                disabled={isSubmitting || isUploading}
                className={`flex-1 sm:flex-none px-8 py-2.5 bg-pink-600 text-white font-bold rounded-lg shadow-sm hover:bg-pink-700 hover:shadow transition-all ${isSubmitting || isUploading ? "opacity-70 cursor-not-allowed" : ""
                  }`}
              >
                {isSubmitting ? "更新中..." : "変更を保存"}
              </button>
            </div>
          </div>
        </Form>
      </div>
    </div>
  );
}

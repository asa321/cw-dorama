import { json, redirect, type ActionFunctionArgs, type LoaderFunctionArgs, type LinksFunction } from "@remix-run/cloudflare";
import { Form, useActionData, useNavigation, Link } from "@remix-run/react";
import { useState } from "react";
import { requireAdminSession } from "../utils/session.server";
import { ClientOnly } from "../components/ClientOnly";
import { MediaSelectModal } from "../components/MediaSelectModal";
import MDEditor, { commands } from "@uiw/react-md-editor";
import { customAlphabet } from "nanoid";
import { getJapaneseCommands, getJapaneseExtraCommands } from "../utils/editorCommands";

const generateSlug = customAlphabet('0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ_', 16);

import editorStyles from "@uiw/react-md-editor/markdown-editor.css?url";
import previewStyles from "@uiw/react-markdown-preview/markdown.css?url";

export const links: LinksFunction = () => [
  { rel: "stylesheet", href: editorStyles },
  { rel: "stylesheet", href: previewStyles },
];

export async function loader({ request, context }: LoaderFunctionArgs) {
  const db = context.cloudflare.env.DB;
  await requireAdminSession(db, request);
  return json({});
}

export async function action({ request, context }: ActionFunctionArgs) {
  const db = context.cloudflare.env.DB;
  const admin = await requireAdminSession(db, request);

  const formData = await request.formData();
  const title = formData.get("title") as string;
  const slug = formData.get("slug") as string;
  const content = formData.get("content") as string;
  const excerpt = formData.get("excerpt") as string;
  const status = formData.get("status") as string;
  const heroImageKey = formData.get("hero_image_key") as string;
  const tagsStr = formData.get("tags") as string;

  if (!title || !slug || !content) {
    return json({ error: "必須項目を入力してください（タイトル、スラッグ、本文）" }, { status: 400 });
  }

  // check if slug exists
  const existing = await db.prepare("SELECT id FROM articles WHERE slug = ?").bind(slug).first();
  if (existing) {
    return json({ error: "このスラッグは既に使用されています" }, { status: 400 });
  }

  try {
    const result = await db.prepare(
      `INSERT INTO articles (title, slug, content, excerpt, status, author_id, hero_image_key) 
       VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING id`
    ).bind(title, slug, content, excerpt || null, status, admin.admin_id, heroImageKey || null).first<{ id: number }>();

    if (result && result.id && tagsStr) {
      const tags = tagsStr.split(",").map(t => t.trim()).filter(Boolean);
      for (const tag of tags) {
        await db.prepare("INSERT INTO article_tags (article_id, tag) VALUES (?, ?)").bind(result.id, tag).run();
      }
    }

    return redirect("/admin/articles");
  } catch (err) {
    console.error(err);
    return json({ error: "保存中にエラーが発生しました" }, { status: 500 });
  }
}

export default function NewArticle() {
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";
  const [mediaModalTarget, setMediaModalTarget] = useState<'editor' | 'hero' | null>(null);
  const [content, setContent] = useState("");
  const [heroImageKey, setHeroImageKey] = useState<string>("");
  const [defaultSlug] = useState(() => generateSlug());

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 border-b-2 border-pink-500 pb-2 inline-block">新規記事作成</h1>
          <p className="mt-2 text-sm text-gray-500">新しい作品のレビューや紹介記事を作成します。</p>
        </div>
        <Link
          to="/admin/articles"
          className="text-sm text-gray-600 hover:text-pink-600 font-medium px-4 py-2 border border-gray-300 rounded-lg hover:border-pink-300 transition-colors"
        >
          一覧へ戻る
        </Link>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 md:p-8">
        <Form method="post" className="space-y-8">
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
                type="text"
                name="title"
                id="title"
                required
                placeholder="魅惑の最新ドラマ「愛の不時着」を徹底解説..."
                className="w-full rounded-lg border-gray-300 border px-4 py-2.5 bg-white text-gray-900 focus:border-pink-500 focus:ring-pink-500 transition-colors"
              />
            </div>

            <div>
              <label htmlFor="slug" className="block text-sm font-bold text-gray-700 mb-1">
                URLスラッグ <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="slug"
                id="slug"
                required
                defaultValue={defaultSlug}
                placeholder="crash-landing-on-you"
                className="w-full rounded-lg border-gray-300 border px-4 py-2.5 text-gray-900 focus:border-pink-500 focus:ring-pink-500 transition-colors bg-gray-50"
              />
              <p className="mt-1.5 text-xs text-gray-500">※URLの一部になります（例: /articles/slug-name）</p>
            </div>

            <div>
              <label htmlFor="status" className="block text-sm font-bold text-gray-700 mb-1">
                公開ステータス
              </label>
              <select
                name="status"
                id="status"
                className="w-full rounded-lg border-gray-300 border px-4 py-2.5 text-gray-900 focus:border-pink-500 focus:ring-pink-500 transition-colors bg-white"
                defaultValue="draft"
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
                name="excerpt"
                id="excerpt"
                rows={3}
                placeholder="記事の一覧ページなどに表示される簡単な説明文です。"
                className="w-full rounded-lg border-gray-300 border px-4 py-3 bg-white text-gray-900 focus:border-pink-500 focus:ring-pink-500 transition-colors resize-none"
              />
            </div>

            <div>
              <label htmlFor="tags" className="block text-sm font-bold text-gray-700 mb-1">
                タグ (カンマ区切り)
              </label>
              <input
                type="text"
                name="tags"
                id="tags"
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
                    <button
                      type="button"
                      onClick={() => setMediaModalTarget('hero')}
                      className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-xl cursor-pointer bg-gray-50 hover:bg-gray-100 hover:border-pink-400 transition-colors relative overflow-hidden group"
                    >
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <svg className="w-8 h-8 text-gray-400 group-hover:text-pink-500 mb-2 transition-colors" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 16">
                          <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2" />
                        </svg>
                        <p className="mb-1 text-sm text-gray-500"><span className="font-semibold text-pink-600">クリックしてメディアを開く</span></p>
                        <p className="text-xs text-gray-400">画像を選択またはアップロード</p>
                      </div>
                    </button>
                  </div>
                  <input type="hidden" name="hero_image_key" value={heroImageKey} />
                </div>

                <div className="w-48 h-32 rounded-xl border border-gray-200 bg-gray-50 overflow-hidden flex-shrink-0 relative shadow-inner">
                  {heroImageKey ? (
                    <img
                      src={`/api/media/${heroImageKey}`}
                      className="w-full h-full object-cover relative z-10"
                      alt="Hero Preview"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-gray-400 text-sm">
                      プレビュー
                    </div>
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
                    commands={getJapaneseCommands(() => setMediaModalTarget('editor'))}
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

          <div className="pt-8 border-t border-gray-100 flex justify-end gap-4 mt-8">
            <Link
              to="/admin/articles"
              className="px-6 py-2.5 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
            >
              キャンセル
            </Link>
            <button
              type="submit"
              disabled={isSubmitting}
              className={`px-8 py-2.5 bg-pink-600 text-white font-bold rounded-lg shadow-sm hover:bg-pink-700 hover:shadow transition-all ${isSubmitting ? "opacity-70 cursor-not-allowed" : ""
                }`}
            >
              {isSubmitting ? "保存中..." : "記事を保存する"}
            </button>
          </div>
        </Form>
      </div>

      <MediaSelectModal
        isOpen={mediaModalTarget !== null}
        onClose={() => setMediaModalTarget(null)}
        onSelect={(url, alt) => {
          if (mediaModalTarget === 'editor') {
            // エディタに画像Markdownを挿入
            const textarea = document.querySelector('.w-md-editor-text-input') as HTMLTextAreaElement;
            if (textarea) {
              const start = textarea.selectionStart;
              const end = textarea.selectionEnd;
              const textToInsert = `![${alt}](${url})`;

              const newContent = content.substring(0, start) + textToInsert + content.substring(end);
              setContent(newContent);

              // カーソル位置を挿入した画像の後に移動 (非同期で少し待つ)
              setTimeout(() => {
                textarea.focus();
                textarea.setSelectionRange(start + textToInsert.length, start + textToInsert.length);
              }, 50);
            } else {
              // テキストエリアが見つからない場合のフォールバック
              setContent(prev => prev + `\n![${alt}](${url})\n`);
            }
          } else if (mediaModalTarget === 'hero') {
            // ヒーロー画像に設定
            const key = `uploads/${alt}`; // URLからではなくaltを使ってキーを組み立てる
            setHeroImageKey(key);
          }
          setMediaModalTarget(null);
        }}
      />
    </div>
  );
}

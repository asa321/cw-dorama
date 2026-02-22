import { json, type LoaderFunctionArgs } from "@remix-run/cloudflare";
import { Link, useLoaderData } from "@remix-run/react";
import { requireAdminSession } from "../utils/session.server";
import type { Article } from "../utils/db.server";

export async function loader({ request, context }: LoaderFunctionArgs) {
  const db = context.cloudflare.env.DB;
  await requireAdminSession(db, request);

  const { results: articles } = await db.prepare(
    "SELECT id, title, slug, status, created_at, updated_at FROM articles ORDER BY created_at DESC"
  ).all<Pick<Article, 'id' | 'title' | 'slug' | 'status' | 'created_at' | 'updated_at'>>();

  return json({ articles });
}

export default function AdminArticlesIndex() {
  const { articles } = useLoaderData<typeof loader>();

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">記事管理</h1>
        <Link
          to="/admin/articles/new"
          className="inline-flex items-center gap-2 px-4 py-2 bg-pink-600 text-white font-medium rounded-xl hover:bg-pink-700 hover:shadow-lg hover:shadow-pink-600/20 transition-all"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
          新規記事作成
        </Link>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {articles.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/3">タイトル</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ステータス</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">作成日</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">最終更新日</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {articles.map((article) => (
                  <tr key={article.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="text-sm font-bold text-gray-900 mb-1">{article.title}</div>
                      <div className="text-xs text-gray-500 font-mono">/{article.slug}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${article.status === 'published' ? 'bg-green-100 text-green-800' :
                        article.status === 'draft' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                        {article.status === 'published' ? '公開中' : article.status === 'draft' ? '下書き' : 'アーカイブ'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(article.created_at).toLocaleDateString('ja-JP')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(article.updated_at).toLocaleDateString('ja-JP')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <Link
                        to={`/admin/articles/${article.id}/edit`}
                        className="text-pink-600 hover:text-pink-900 hover:bg-pink-50 px-3 py-1.5 rounded-lg transition-colors mr-2"
                      >
                        編集
                      </Link>
                      <Link
                        to={`/articles/${article.slug}`}
                        target="_blank"
                        className="text-gray-500 hover:text-gray-900 hover:bg-gray-100 px-3 py-1.5 rounded-lg transition-colors inline-flex items-center gap-1"
                      >
                        確認 <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path></svg>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-16 text-center">
            <div className="text-5xl mb-4">📝</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">記事がありません</h3>
            <p className="text-gray-500 mb-6">最初の記事を作成して、サイトを盛り上げましょう！</p>
            <Link
              to="/admin/articles/new"
              className="inline-flex items-center gap-2 px-6 py-3 bg-pink-600 text-white font-medium rounded-xl hover:bg-pink-700 transition-colors"
            >
              新規記事を作成する
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

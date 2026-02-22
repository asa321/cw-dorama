import { json, type LoaderFunctionArgs } from "@remix-run/cloudflare";
import { Link } from "@remix-run/react";
import { requireAdminSession } from "../utils/session.server";
import type { Article } from "../utils/db.server";

export async function loader({ request, context }: LoaderFunctionArgs) {
  const db = context.cloudflare.env.DB;
  const session = await requireAdminSession(db, request);

  const [articlesCount, sessionsCount] = await Promise.all([
    db.prepare("SELECT COUNT(*) as count FROM articles").first<{ count: number }>(),
    db.prepare("SELECT COUNT(*) as count FROM sessions").first<{ count: number }>()
  ]);

  const { results: recentArticles } = await db.prepare(
    "SELECT id, title, slug, status, created_at FROM articles ORDER BY created_at DESC LIMIT 5"
  ).all<Pick<Article, 'id' | 'title' | 'slug' | 'status' | 'created_at'>>();

  return json({
    stats: {
      articles: articlesCount?.count || 0,
      sessions: sessionsCount?.count || 0,
    },
    recentArticles
  });
}

export default function AdminIndex() {
  const { stats, recentArticles } = useLoaderData<typeof loader>();

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">ダッシュボード</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-pink-100 text-pink-600 flex items-center justify-center text-xl">
            📄
          </div>
          <div>
            <div className="text-sm text-gray-500 font-medium">総記事数</div>
            <div className="text-2xl font-bold text-gray-900">{stats.articles}</div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center text-xl">
            🔑
          </div>
          <div>
            <div className="text-sm text-gray-500 font-medium">アクティブセッション</div>
            <div className="text-2xl font-bold text-gray-900">{stats.sessions}</div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
          <h2 className="text-lg font-bold text-gray-900">最近の記事</h2>
          <Link to="/admin/articles" className="text-sm font-medium text-pink-600 hover:text-pink-700">
            すべて見る &rarr;
          </Link>
        </div>

        {recentArticles.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">タイトル</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ステータス</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">作成日</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200 flex-1">
                {recentArticles.map((article) => (
                  <tr key={article.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {article.title}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${article.status === 'published' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                        }`}>
                        {article.status === 'published' ? '公開中' : '下書き'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(article.created_at).toLocaleDateString('ja-JP')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-10 text-center text-gray-500">
            記事がまだありません。
          </div>
        )}
      </div>
    </div>
  );
}

// Add useLoaderData since I forgot to import it above.
import { useLoaderData } from "@remix-run/react";

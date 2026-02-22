import { json, type LoaderFunctionArgs } from "@remix-run/cloudflare";
import { useLoaderData, useFetcher } from "@remix-run/react";
import { requireAdminSession } from "../utils/session.server";
import type { Session, Admin } from "../utils/db.server";

export async function loader({ request, context }: LoaderFunctionArgs) {
  const db = context.cloudflare.env.DB;
  const currentSession = await requireAdminSession(db, request);

  const { results: sessions } = await db.prepare(`
    SELECT s.*, a.username 
    FROM sessions s
    JOIN admins a ON s.admin_id = a.id
    ORDER BY s.created_at DESC
  `).all<Session & { username: string }>();

  return json({
    sessions,
    currentSessionId: currentSession.id
  });
}

export async function action({ request, context }: LoaderFunctionArgs) {
  const db = context.cloudflare.env.DB;
  await requireAdminSession(db, request); // Ensure user has right to revoke

  const formData = await request.formData();
  const sessionIdToRevoke = formData.get("sessionId");

  if (sessionIdToRevoke) {
    await db.prepare("DELETE FROM sessions WHERE id = ?").bind(sessionIdToRevoke).run();
  }

  return json({ success: true });
}

export default function AdminSessions() {
  const { sessions, currentSessionId } = useLoaderData<typeof loader>();
  const fetcher = useFetcher();

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">セッション管理</h1>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">管理者</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">IP / User Agent</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ログイン日時</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">アクション</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sessions.map((session) => (
                <tr key={session.id} className={session.id === currentSessionId ? "bg-pink-50/50" : ""}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <div className="text-sm font-medium text-gray-900">{session.username}</div>
                      {session.id === currentSessionId && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-pink-100 text-pink-600">
                          Current
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900 font-mono mb-1">{session.ip || "Unknown IP"}</div>
                    <div className="text-xs text-gray-500 max-w-xs truncate" title={session.user_agent || ""}>
                      {session.user_agent || "Unknown Browser"}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(session.created_at).toLocaleString('ja-JP')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    {session.id !== currentSessionId && (
                      <fetcher.Form method="post" className="inline">
                        <input type="hidden" name="sessionId" value={session.id} />
                        <button
                          type="submit"
                          className="text-red-600 hover:text-red-900 font-medium px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors"
                        >
                          強制無効化
                        </button>
                      </fetcher.Form>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

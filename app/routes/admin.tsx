import { json, type LoaderFunctionArgs } from "@remix-run/cloudflare";
import { useLoaderData, Outlet, Link, useLocation } from "@remix-run/react";
import { requireAdminSession } from "../utils/session.server";
import { destroyAdminSession } from "../utils/session.server";
import type { Admin } from "../utils/db.server";

export async function loader({ request, context }: LoaderFunctionArgs) {
  const db = context.cloudflare.env.DB;
  const url = new URL(request.url);

  // Skip auth for login page and setup page
  if (url.pathname === "/admin/login" || url.pathname === "/admin/setup") {
    return json({ admin: null });
  }

  const session = await requireAdminSession(db, request);
  const admin = await db.prepare("SELECT * FROM admins WHERE id = ?").bind(session.admin_id).first<Admin>();

  if (!admin) {
    throw new Response("Admin Not Found", { status: 404 });
  }

  return json({ admin });
}

export async function action({ request, context }: LoaderFunctionArgs) {
  const formData = await request.formData();
  if (formData.get("_action") === "logout") {
    const cookie = await destroyAdminSession(context.cloudflare.env.DB, request);
    return new Response(null, {
      status: 302,
      headers: {
        Location: "/admin/login",
        "Set-Cookie": cookie
      }
    });
  }
  return json({});
}

import { useState } from "react";

export default function AdminLayout() {
  const { admin } = useLoaderData<typeof loader>();
  const location = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(false);

  if (!admin) {
    return <Outlet />;
  }

  const navItems = [
    {
      name: "ダッシュボード",
      path: "/admin",
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"></path></svg>
    },
    {
      name: "記事管理",
      path: "/admin/articles",
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9.5L18.5 7H20M14 13h4m-4-4h4m-4 8h4"></path></svg>
    },
    {
      name: "メディア",
      path: "/admin/media",
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
    },
    {
      name: "セッション管理",
      path: "/admin/sessions",
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"></path></svg>
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row">
      <nav className={`bg-gray-900 text-white min-h-full flex flex-col shrink-0 transition-all duration-300 ease-in-out ${isCollapsed ? 'w-20' : 'w-full md:w-64'}`}>
        <div className={`p-6 flex ${isCollapsed ? 'justify-center' : 'items-center'} h-20`}>
          {!isCollapsed ? (
            <div>
              <Link to="/" className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-pink-400 to-rose-300 whitespace-nowrap">
                K-Drama Hub
              </Link>
              <div className="text-xs text-gray-400 mt-1">管理画面</div>
            </div>
          ) : (
            <Link to="/" className="text-xl font-bold text-pink-500 flex items-center justify-center">
              KH
            </Link>
          )}
        </div>

        <ul className="flex-1 px-4 py-6 space-y-2 overflow-y-auto overflow-x-hidden">
          {navItems.map((item) => (
            <li key={item.path}>
              <Link
                to={item.path}
                title={isCollapsed ? item.name : undefined}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-xl transition-colors ${location.pathname === item.path || (item.path !== '/admin' && location.pathname.startsWith(item.path))
                  ? "bg-pink-600 text-white shadow-md shadow-pink-900/50"
                  : "text-gray-300 hover:bg-gray-800 hover:text-white"
                  } ${isCollapsed ? 'justify-center px-0' : ''}`}
              >
                <div className="shrink-0">{item.icon}</div>
                {!isCollapsed && <span className="whitespace-nowrap">{item.name}</span>}
              </Link>
            </li>
          ))}
        </ul>

        <div className={`p-4 border-t border-gray-800 flex flex-col gap-4 ${isCollapsed ? 'items-center' : ''}`}>
          {!isCollapsed && (
            <div className="px-2 text-sm overflow-hidden">
              <div className="text-gray-400">ログイン中:</div>
              <div className="font-semibold truncate">{admin.display_name || admin.username}</div>
            </div>
          )}

          <form method="post" className="w-full">
            <button
              type="submit"
              name="_action"
              value="logout"
              title={isCollapsed ? "ログアウト" : undefined}
              className={`w-full text-sm text-gray-400 hover:text-white flex items-center transition-colors ${isCollapsed ? 'justify-center' : 'gap-2 px-2 text-left'}`}
            >
              <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>
              {!isCollapsed && <span>ログアウト</span>}
            </button>
          </form>

          {/* Collapse Toggle Button */}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            type="button"
            className="w-full mt-2 text-gray-500 hover:text-white flex items-center justify-center p-2 rounded-lg hover:bg-gray-800 transition-colors"
            title={isCollapsed ? "サイドバーを展開" : "サイドバーを折りたたむ"}
          >
            {isCollapsed ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 5l7 7-7 7M5 5l7 7-7 7"></path></svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 19l-7-7 7-7m8 14l-7-7 7-7"></path></svg>
            )}
          </button>
        </div>
      </nav>

      <main className="flex-1 p-6 md:p-10 overflow-auto w-full transition-all duration-300">
        <Outlet />
      </main>
    </div>
  );
}

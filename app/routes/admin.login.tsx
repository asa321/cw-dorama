import { json, redirect, type LoaderFunctionArgs } from "@remix-run/cloudflare";
import { Form, useActionData, useNavigation } from "@remix-run/react";
import bcrypt from "bcryptjs";
import { createAdminSession, requireAdminSession } from "../utils/session.server";
import type { Admin } from "../utils/db.server";

export async function loader({ request, context }: LoaderFunctionArgs) {
  const db = context.cloudflare.env.DB;

  // If already logged in, redirect to admin dashboard
  try {
    await requireAdminSession(db, request);
    return redirect("/admin");
  } catch (e) {
    // Not logged in, check if any admin exists
    const hasAdmin = await db.prepare("SELECT 1 FROM admins LIMIT 1").first();
    if (!hasAdmin) {
      // No admins exist, redirect to setup
      return redirect("/admin/setup");
    }
  }

  return json({});
}

export async function action({ request, context }: LoaderFunctionArgs) {
  const formData = await request.formData();
  const username = formData.get("username") as string;
  const password = formData.get("password") as string;

  if (!username || !password) {
    return json({ error: "ユーザー名とパスワードを入力してください。" }, { status: 400 });
  }

  const db = context.cloudflare.env.DB;
  const admin = await db.prepare("SELECT * FROM admins WHERE username = ?").bind(username).first<Admin>();

  if (!admin) {
    return json({ error: "ユーザー名またはパスワードが間違っています。" }, { status: 401 });
  }

  const isPasswordValid = await bcrypt.compare(password, admin.password_hash);

  if (!isPasswordValid) {
    return json({ error: "ユーザー名またはパスワードが間違っています。" }, { status: 401 });
  }

  // Get client details for session
  const userAgent = request.headers.get("User-Agent");
  const ip = request.headers.get("CF-Connecting-IP") || request.headers.get("X-Forwarded-For") || "Unknown";

  const cookie = await createAdminSession(db, admin.id, userAgent, ip);

  return redirect("/admin", {
    headers: {
      "Set-Cookie": cookie,
    },
  });
}

export default function Login() {
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-pink-500 to-rose-400">
            K-Drama Hub
          </span>
          <br />管理画面
        </h2>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 border border-gray-100">
          <Form method="post" className="space-y-6">
            {actionData?.error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md text-sm">
                {actionData.error}
              </div>
            )}

            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700">
                ユーザー名
              </label>
              <div className="mt-1">
                <input
                  id="username"
                  name="username"
                  type="text"
                  required
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-pink-500 focus:border-pink-500 sm:text-sm"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                パスワード
              </label>
              <div className="mt-1">
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-pink-500 focus:border-pink-500 sm:text-sm"
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={isSubmitting}
                className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-pink-600 hover:bg-pink-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500 transition-colors ${isSubmitting ? "opacity-70 cursor-not-allowed" : ""
                  }`}
              >
                {isSubmitting ? "ログイン中..." : "ログイン"}
              </button>
            </div>
          </Form>
        </div>
      </div>
    </div>
  );
}

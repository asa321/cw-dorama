import { json, redirect, type LoaderFunctionArgs } from "@remix-run/cloudflare";
import { Form, useActionData, useNavigation } from "@remix-run/react";
import bcrypt from "bcryptjs";
import { createAdminSession } from "../utils/session.server";

export async function loader({ context }: LoaderFunctionArgs) {
  const db = context.cloudflare.env.DB;

  // Check if any admin exists
  const hasAdmin = await db.prepare("SELECT 1 FROM admins LIMIT 1").first();
  if (hasAdmin) {
    // If admin already exists, redirect to login
    return redirect("/admin/login");
  }

  return json({});
}

export async function action({ request, context }: LoaderFunctionArgs) {
  const db = context.cloudflare.env.DB;

  // Double-check, prevent setup if admin exists
  const hasAdmin = await db.prepare("SELECT 1 FROM admins LIMIT 1").first();
  if (hasAdmin) {
    return redirect("/admin/login");
  }

  const formData = await request.formData();
  const username = formData.get("username") as string;
  const password = formData.get("password") as string;
  const displayName = formData.get("displayName") as string;
  const email = formData.get("email") as string;

  if (!username || !password || password.length < 8) {
    return json({ error: "ユーザー名と、8文字以上のパスワードが必要です。" }, { status: 400 });
  }

  try {
    const passwordHash = await bcrypt.hash(password, 12);

    // Create first admin
    const result = await db.prepare(
      "INSERT INTO admins (username, email, password_hash, display_name) VALUES (?, ?, ?, ?) RETURNING id"
    ).bind(username, email, passwordHash, displayName).first<{ id: number }>();

    if (!result || !result.id) {
      throw new Error("Failed to create admin");
    }

    // Auto log in after setup
    const userAgent = request.headers.get("User-Agent");
    const ip = request.headers.get("CF-Connecting-IP") || request.headers.get("X-Forwarded-For") || "Unknown";
    const cookie = await createAdminSession(db, result.id, userAgent, ip);

    return redirect("/admin", {
      headers: {
        "Set-Cookie": cookie,
      },
    });

  } catch (e: any) {
    console.error("Setup error", e);
    return json({ error: "セットアップ中にエラーが発生しました。" }, { status: 500 });
  }
}

export default function Setup() {
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
          <br />初回セットアップ
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          管理者のアカウントを作成してください。
        </p>
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
                ユーザー名 <span className="text-red-500">*</span>
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
              <label htmlFor="displayName" className="block text-sm font-medium text-gray-700">
                表示名
              </label>
              <div className="mt-1">
                <input
                  id="displayName"
                  name="displayName"
                  type="text"
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-pink-500 focus:border-pink-500 sm:text-sm"
                />
              </div>
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                メールアドレス
              </label>
              <div className="mt-1">
                <input
                  id="email"
                  name="email"
                  type="email"
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-pink-500 focus:border-pink-500 sm:text-sm"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                パスワード (8文字以上) <span className="text-red-500">*</span>
              </label>
              <div className="mt-1">
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  minLength={8}
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
                {isSubmitting ? "作成中..." : "アカウント作成"}
              </button>
            </div>
          </Form>
        </div>
      </div>
    </div>
  );
}

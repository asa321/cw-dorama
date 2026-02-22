import { json, type LoaderFunctionArgs, type MetaFunction } from "@remix-run/cloudflare";
import { useLoaderData, Link } from "@remix-run/react";
import { Header } from "../components/Header";
import type { Article } from "../utils/db.server";
import { marked } from "marked";

import { getAdminSession } from "../utils/session.server";

export const meta: MetaFunction<typeof loader> = ({ data }) => {
  if (!data?.article) {
    return [{ title: "記事が見つかりません | K-Drama Hub" }];
  }
  return [
    { title: `${data.article.title} | K-Drama Hub` },
    { name: "description", content: data.article.excerpt || `${data.article.title}についての記事` },
  ];
};

export async function loader({ request, params, context }: LoaderFunctionArgs) {
  const { slug } = params;
  if (!slug) {
    throw new Response("Not Found", { status: 404 });
  }

  const db = context.cloudflare.env.DB;
  const adminSession = await getAdminSession(db, request);

  let article;
  if (adminSession) {
    article = await db.prepare(
      "SELECT * FROM articles WHERE slug = ?"
    ).bind(slug).first<Article>();
  } else {
    article = await db.prepare(
      "SELECT * FROM articles WHERE slug = ? AND status = 'published'"
    ).bind(slug).first<Article>();
  }

  if (!article) {
    throw new Response("Not Found", { status: 404 });
  }

  const { results: tags } = await db.prepare(
    "SELECT tag FROM article_tags WHERE article_id = ?"
  ).bind(article.id).all<{ tag: string }>();

  // Convert markdown to HTML on the server
  const htmlContent = marked(article.content, { async: false });

  return json({
    article: {
      ...article,
      tags: tags.map(t => t.tag)
    },
    htmlContent: htmlContent as string
  });
}

export default function ArticleDetail() {
  const { article, htmlContent } = useLoaderData<typeof loader>();

  const formattedDate = new Intl.DateTimeFormat('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }).format(new Date(article.created_at));


  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 font-sans selection:bg-pink-100 selection:text-pink-900 pb-20">
      <Header />

      <article className="max-w-4xl mx-auto">
        {/* Article Header & Hero */}
        <header className="pt-12 md:pt-20 px-4 md:px-8 mb-10 text-center">
          <div className="flex flex-wrap items-center justify-center gap-2 mb-6">
            {article.tags?.map(tag => (
              <Link
                key={tag}
                to={`/?tag=${encodeURIComponent(tag)}`}
                className="text-sm font-medium px-3 py-1 bg-pink-50 dark:bg-pink-900/40 text-pink-600 dark:text-pink-400 hover:bg-pink-100 dark:hover:bg-pink-900/60 rounded-full transition-colors"
              >
                #{tag}
              </Link>
            ))}
          </div>

          <h1 className="text-3xl md:text-5xl lg:text-6xl font-extrabold text-gray-900 dark:text-white leading-tight mb-6">
            {article.title}
          </h1>

          <div className="flex items-center justify-center gap-4 text-gray-500 dark:text-gray-400 text-sm mb-10">
            <time dateTime={article.created_at} className="flex items-center gap-1.5">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
              {formattedDate}
            </time>
          </div>

        </header>

        {/* Article Body */}
        <div className="px-4 md:px-8 max-w-3xl mx-auto">
          {article.excerpt && (
            <p className="text-xl md:text-2xl text-gray-600 dark:text-gray-300 leading-relaxed font-medium mb-12 border-l-4 border-pink-400 pl-6 py-2 bg-gray-50/50 dark:bg-gray-900/50 rounded-r-xl">
              {article.excerpt}
            </p>
          )}

          <div
            className="prose prose-lg md:prose-xl prose-pink dark:prose-invert max-w-none 
                        prose-headings:font-bold prose-h2:text-3xl prose-h2:mb-6 prose-h2:mt-14 prose-h2:pb-2 prose-h2:border-b-2 prose-h2:border-gray-100 dark:prose-h2:border-gray-800
                        prose-a:text-pink-500 hover:prose-a:text-pink-600 dark:hover:prose-a:text-pink-400
                        prose-img:rounded-3xl prose-img:shadow-lg prose-img:border prose-img:border-gray-100 dark:prose-img:border-gray-800
                        prose-blockquote:border-l-pink-400 prose-blockquote:bg-gray-50 dark:prose-blockquote:bg-gray-900/50 prose-blockquote:py-2 prose-blockquote:px-6 prose-blockquote:rounded-r-xl prose-blockquote:not-italic"
            dangerouslySetInnerHTML={{ __html: htmlContent }}
          />
        </div>

        {/* Footer actions */}
        <div className="mt-20 px-4 md:px-8 max-w-3xl mx-auto border-t border-gray-100 dark:border-gray-800 pt-10">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-pink-500 hover:text-pink-600 font-medium group"
          >
            <svg className="w-5 h-5 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
            記事一覧へ戻る
          </Link>
        </div>
      </article>
    </div>
  );
}

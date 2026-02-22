import { Link } from "@remix-run/react";
import type { Article } from "../utils/db.server";

interface ArticleCardProps {
  article: Pick<Article, 'id' | 'slug' | 'title' | 'excerpt' | 'hero_image_key' | 'created_at'> & { tags?: string[] };
}

export function ArticleCard({ article }: ArticleCardProps) {
  const formattedDate = new Intl.DateTimeFormat('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }).format(new Date(article.created_at));

  // 仮の画像プレースホルダー。R2から取得するURLは後で統合する。
  const imageUrl = article.hero_image_key
    ? `/api/media/${article.hero_image_key}` // 将来実装する画像配信用ルート
    : "https://images.unsplash.com/photo-1596484552834-6a58f850e0a1?q=80&w=800&auto=format&fit=crop";
  // 韓国風カフェやドラマの雰囲気の代わりのダミー画像

  return (
    <Link
      to={`/articles/${article.slug}`}
      className="group flex flex-col bg-white dark:bg-gray-900 rounded-2xl overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border border-gray-100 dark:border-gray-800"
    >
      <div className="relative aspect-[4/3] overflow-hidden">
        <img
          src={imageUrl}
          alt={article.title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      </div>
      <div className="p-5 flex flex-col flex-grow">
        <div className="flex gap-2 mb-3 flex-wrap">
          {article.tags?.map(tag => (
            <span key={tag} className="text-xs font-medium px-2.5 py-1 bg-pink-50 dark:bg-pink-900/30 text-pink-600 dark:text-pink-400 rounded-full">
              {tag}
            </span>
          ))}
        </div>
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2 line-clamp-2 group-hover:text-pink-500 transition-colors">
          {article.title}
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-3 mb-4 flex-grow">
          {article.excerpt}
        </p>
        <div className="flex items-center text-xs text-gray-400 dark:text-gray-500 mt-auto pt-4 border-t border-gray-50 dark:border-gray-800">
          <time dateTime={article.created_at}>{formattedDate}</time>
        </div>
      </div>
    </Link>
  );
}

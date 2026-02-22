import { json, type LoaderFunctionArgs } from "@remix-run/cloudflare";
import { useLoaderData, useNavigation, useSearchParams } from "@remix-run/react";
import { Header } from "../components/Header";
import { ArticleCard } from "../components/ArticleCard";
import type { Article } from "../utils/db.server";

export async function loader({ request, context }: LoaderFunctionArgs) {
	const url = new URL(request.url);
	const q = url.searchParams.get("q") || "";
	const tag = url.searchParams.get("tag") || "";

	const db = context.cloudflare.env.DB;

	let query = `
    SELECT a.*
    FROM articles a
    WHERE a.status = 'published'
  `;
	const params: string[] = [];

	if (q) {
		query += ` AND (a.title LIKE ? OR a.content LIKE ?)`;
		params.push(`%${q}%`, `%${q}%`);
	}

	if (tag) {
		query += ` AND EXISTS (SELECT 1 FROM article_tags t WHERE t.article_id = a.id AND t.tag = ?)`;
		params.push(tag);
	}

	query += ` ORDER BY a.created_at DESC LIMIT 20`;

	let stmt = db.prepare(query);
	if (params.length > 0) {
		stmt = stmt.bind(...params);
	}

	const { results: articles } = await stmt.all<Article>();

	let mappedArticles = articles;
	if (articles.length > 0) {
		const placeholders = articles.map(() => '?').join(',');
		const ids = articles.map(a => a.id);
		const { results: tags } = await db.prepare(`SELECT article_id, tag FROM article_tags WHERE article_id IN (${placeholders})`)
			.bind(...ids)
			.all<{ article_id: number, tag: string }>();

		mappedArticles = articles.map(a => ({
			...a,
			tags: tags.filter(t => t.article_id === a.id).map(t => t.tag)
		}));
	}

	const { results: popularTags } = await db.prepare(`
    SELECT tag, COUNT(*) as count 
    FROM article_tags 
    JOIN articles a ON a.id = article_tags.article_id AND a.status = 'published'
    GROUP BY tag 
    ORDER BY count DESC 
    LIMIT 10
  `).all<{ tag: string, count: number }>();

	return json({ articles: mappedArticles, q, tag, popularTags });
}

export default function Index() {
	const { articles, q, tag, popularTags } = useLoaderData<typeof loader>();
	const navigation = useNavigation();
	const [searchParams, setSearchParams] = useSearchParams();

	const isSearching = navigation.state === "loading";

	const handleTagClick = (clickedTag: string) => {
		const newParams = new URLSearchParams(searchParams);
		if (newParams.get("tag") === clickedTag) {
			newParams.delete("tag");
		} else {
			newParams.set("tag", clickedTag);
		}
		setSearchParams(newParams);
	};

	return (
		<div className="min-h-screen bg-gray-50 dark:bg-gray-950 font-sans selection:bg-pink-100 selection:text-pink-900 overflow-x-hidden">
			<Header />

			{/* Hero Section */}
			{!q && !tag && (
				<section className="relative overflow-hidden bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800">
					<div className="absolute inset-0 bg-gradient-to-tr from-pink-500/5 via-transparent to-rose-400/5 mix-blend-overlay" />
					<div className="container mx-auto px-4 py-16 md:py-24 relative z-10 lg:text-center text-left">
						<h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-gray-900 dark:text-white mb-6">
							ドラマの感動を、共に。<br />
							<span className="bg-clip-text text-transparent bg-gradient-to-r from-pink-500 to-rose-400">
								韓国ドラマの奥深い世界へ
							</span>
						</h1>
						<p className="text-lg md:text-xl text-gray-600 dark:text-gray-300 max-w-2xl lg:mx-auto leading-relaxed">
							最新の話題作から、心を打つ名作まで。あなたにぴったりの韓国ドラマが見つかるレビュー＆コラムサイト。
						</p>
					</div>
				</section>
			)}

			{/* Main Content */}
			<main className="container mx-auto px-4 py-8 md:py-12 flex flex-col lg:flex-row gap-8 lg:gap-12 relative">
				<div className="flex-1 min-w-0">
					{q && (
						<div className="mb-8 p-5 bg-white dark:bg-gray-900 rounded-2xl border border-pink-100 dark:border-gray-800 shadow-sm flex items-center justify-between">
							<h2 className="text-lg md:text-xl font-bold text-gray-800 dark:text-gray-200">
								「<span className="text-pink-500">{q}</span>」の検索結果
								<span className="ml-2 text-sm font-normal text-gray-500 bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded-full">{articles.length}件</span>
							</h2>
							<button onClick={() => { searchParams.delete('q'); setSearchParams(searchParams); }} className="text-gray-400 hover:text-pink-500 text-sm">クリア ✕</button>
						</div>
					)}
					{tag && (
						<div className="mb-8 p-5 bg-white dark:bg-gray-900 rounded-2xl border border-pink-100 dark:border-gray-800 shadow-sm flex items-center justify-between">
							<div className="flex items-center gap-3">
								<span className="text-2xl bg-pink-50 dark:bg-pink-900/30 w-10 h-10 flex items-center justify-center rounded-xl text-pink-500">🏷️</span>
								<h2 className="text-lg md:text-xl font-bold text-gray-800 dark:text-gray-200">
									#{tag} の記事
								</h2>
							</div>
							<button onClick={() => { searchParams.delete('tag'); setSearchParams(searchParams); }} className="text-gray-400 hover:text-pink-500 text-sm">クリア ✕</button>
						</div>
					)}

					{isSearching ? (
						<div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
							{[...Array(6)].map((_, i) => (
								<div key={i} className="animate-pulse bg-white dark:bg-gray-900 rounded-2xl h-96 border border-gray-100 dark:border-gray-800 flex flex-col">
									<div className="h-48 bg-gray-100 dark:bg-gray-800 rounded-t-2xl" />
									<div className="p-5 flex flex-col gap-4 flex-1">
										<div className="flex gap-2"><div className="h-6 w-16 bg-gray-100 dark:bg-gray-800 rounded-full" /></div>
										<div className="h-6 bg-gray-100 dark:bg-gray-800 rounded w-full" />
										<div className="h-4 bg-gray-100 dark:bg-gray-800 rounded w-5/6" />
										<div className="h-4 bg-gray-100 dark:bg-gray-800 rounded w-2/3 mt-auto" />
									</div>
								</div>
							))}
						</div>
					) : articles.length > 0 ? (
						<div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
							{articles.map((article) => (
								<ArticleCard key={article.id} article={article as any} />
							))}
						</div>
					) : (
						<div className="text-center py-24 bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm">
							<div className="text-7xl mb-6 opacity-80 animate-bounce">🥲</div>
							<h3 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-3">記事が見つかりませんでした</h3>
							<p className="text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
								条件を変えて再検索するか、新しいトレンドタグをチェックしてみてください。
							</p>
							{(q || tag) && (
								<button
									onClick={() => setSearchParams({})}
									className="mt-6 px-6 py-2.5 bg-pink-50 text-pink-600 dark:bg-pink-900/40 dark:text-pink-400 hover:bg-pink-100 dark:hover:bg-pink-900/60 rounded-full font-medium transition-colors"
								>
									検索条件をクリア
								</button>
							)}
						</div>
					)}
				</div>

				{/* Sidebar */}
				<aside className="lg:w-80 w-full shrink-0">
					<div className="sticky top-24 bg-white dark:bg-gray-900 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800">
						<h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
							<span className="text-pink-500 shrink-0">🔥</span> 人気のタグ
						</h3>
						{popularTags.length > 0 ? (
							<div className="flex flex-wrap gap-2 text-left">
								{popularTags.map(pt => (
									<button
										key={pt.tag}
										onClick={() => handleTagClick(pt.tag)}
										className={`group px-3.5 py-2 rounded-full text-sm font-medium transition-all duration-300 ease-out border ${tag === pt.tag
												? 'bg-pink-500 text-white shadow-lg shadow-pink-500/25 border-transparent scale-105'
												: 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-pink-300 hover:text-pink-600 dark:hover:text-pink-400'
											}`}
									>
										#{pt.tag}
										<span className={`text-xs ml-1.5 px-1.5 py-0.5 rounded-md ${tag === pt.tag ? 'bg-white/20 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 group-hover:bg-pink-50 group-hover:text-pink-500'
											}`}>
											{pt.count}
										</span>
									</button>
								))}
							</div>
						) : (
							<p className="text-sm text-gray-500 dark:text-gray-400">タグがまだありません。</p>
						)}
					</div>
				</aside>
			</main>
		</div>
	);
}

import type { Metadata } from "next";
import { StoryStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { StoryCard } from "@/components/StoryCard";

export const metadata: Metadata = { title: "Stories" };
export const revalidate = 300;

export default async function StoriesPage({ searchParams }: {
  searchParams: Promise<{ q?: string; category?: string }>;
}) {
  const params = await searchParams;
  const q = params.q?.trim() ?? "";
  const category = params.category?.trim() ?? "";

  const [stories, categories] = await Promise.all([
    prisma.story.findMany({
      where: {
        status: StoryStatus.PUBLISHED,
        ...(category ? { category: { slug: category } } : {}),
        ...(q ? {
          OR: [
            { title: { contains: q, mode: "insensitive" } },
            { summary: { contains: q, mode: "insensitive" } },
            { content: { contains: q, mode: "insensitive" } }
          ]
        } : {})
      },
      orderBy: { publishedAt: "desc" },
      include: { author: { select: { name: true } }, category: { select: { name: true, slug: true } } }
    }),
    prisma.category.findMany({ orderBy: { name: "asc" } })
  ]);

  return (
    <section className="page-section">
      <div className="container">
        <p className="eyebrow">The library</p>
        <h1 className="page-title">Stories for every kind of sky</h1>
        <form className="filters">
          <input name="q" defaultValue={q} placeholder="Search titles, summaries, or story text" aria-label="Search stories" />
          <select name="category" defaultValue={category} aria-label="Filter by category">
            <option value="">All categories</option>
            {categories.map((item) => <option key={item.id} value={item.slug}>{item.name}</option>)}
          </select>
          <button className="button" type="submit">Search</button>
        </form>

        {stories.length ? (
          <div className="story-grid">{stories.map((story) => <StoryCard key={story.id} story={story} />)}</div>
        ) : (
          <div className="panel empty-state">No published stories match these filters.</div>
        )}
      </div>
    </section>
  );
}

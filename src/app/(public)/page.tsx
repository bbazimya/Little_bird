import Link from "next/link";
import { StoryStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { StoryCard } from "@/components/StoryCard";

export const revalidate = 300;

export default async function HomePage() {
  const [featured, latest, categories] = await Promise.all([
    prisma.story.findFirst({
      where: { status: StoryStatus.PUBLISHED, isFeatured: true },
      orderBy: { publishedAt: "desc" },
      include: { author: { select: { name: true } }, category: { select: { name: true, slug: true } } }
    }),
    prisma.story.findMany({
      where: { status: StoryStatus.PUBLISHED },
      orderBy: { publishedAt: "desc" },
      take: 6,
      include: { author: { select: { name: true } }, category: { select: { name: true, slug: true } } }
    }),
    prisma.category.findMany({ orderBy: { name: "asc" }, take: 10 })
  ]);

  return (
    <>
      <section className="hero">
        <div className="container hero-grid">
          <div>
            <p className="eyebrow" style={{ color: "#f8e8b9" }}>A moderated global story magazine</p>
            <h1>Every childhood has more than one kind of sky.</h1>
            <p>Read fiction that makes room for laughter, imagination, culture, courage, and the difficult circumstances children sometimes face.</p>
            <div className="hero-actions">
              <Link className="button" href="/stories">Explore stories</Link>
              <Link className="button secondary" href="/submit">Submit your writing</Link>
            </div>
          </div>
          <div className="hero-symbol" aria-hidden="true">🐦</div>
        </div>
      </section>

      {featured ? (
        <section className="page-section">
          <div className="container">
            <div className="section-heading">
              <div><p className="eyebrow">Featured story</p><h2>A story beneath today’s sky</h2></div>
            </div>
            <StoryCard story={featured} />
          </div>
        </section>
      ) : null}

      <section className="page-section section-muted">
        <div className="container">
          <div className="section-heading">
            <div><p className="eyebrow">Browse by collection</p><h2>Many moods. Many worlds.</h2></div>
            <Link href="/stories">View all stories →</Link>
          </div>
          <div className="category-grid">
            {categories.map((category) => (
              <Link className="category-card" key={category.id} href={`/stories?category=${category.slug}`}>
                <strong>{category.name}</strong>
                <p>{category.description ?? "Discover stories in this collection."}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="page-section">
        <div className="container">
          <div className="section-heading">
            <div><p className="eyebrow">Recently published</p><h2>New stories</h2></div>
          </div>
          {latest.length ? (
            <div className="story-grid">{latest.map((story) => <StoryCard key={story.id} story={story} />)}</div>
          ) : (
            <div className="panel empty-state">Stories will appear here after the editorial team publishes them.</div>
          )}
        </div>
      </section>
    </>
  );
}

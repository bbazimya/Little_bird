import type { Metadata } from "next";
import { StoryStatus } from "@prisma/client";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ageGroupLabel, formatDate } from "@/lib/utils";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const story = await prisma.story.findFirst({ where: { slug, status: StoryStatus.PUBLISHED }, select: { title: true, summary: true } });
  return story ? { title: story.title, description: story.summary } : { title: "Story not found" };
}

export default async function StoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const story = await prisma.story.findFirst({
    where: { slug, status: StoryStatus.PUBLISHED },
    include: { author: { select: { name: true, bio: true } }, category: true }
  });
  if (!story) notFound();

  return (
    <article className="story-page">
      <header className="story-header">
        <a className="eyebrow" href={`/stories?category=${story.category.slug}`}>{story.category.name}</a>
        <h1>{story.title}</h1>
        <p className="lead">{story.summary}</p>
        <div className="story-meta">
          <span>By {story.author.name}</span>
          <span>{story.readingTime} minute read</span>
          <span>{ageGroupLabel(story.ageGroup)}</span>
          <span>{formatDate(story.publishedAt)}</span>
        </div>
      </header>

      <div className="story-cover">
        {story.featuredImage ? <img src={story.featuredImage} alt="" /> : <span aria-hidden="true">🐦</span>}
      </div>

      {story.contentWarning ? <div className="content-note"><strong>Content note:</strong> {story.contentWarning}</div> : null}
      <div className="story-content">{story.content}</div>
      <div className="story-disclaimer">
        <strong>About this work</strong>
        <p>This is a work of fiction. Its characters and events were created for literary purposes. Where a story is inspired by real global issues, it should not be treated as a report about a specific identifiable child.</p>
      </div>
    </article>
  );
}

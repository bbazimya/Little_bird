"use server";

import { AgeGroup, ReviewDecision, Role, StoryStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireRole, requireUser, isEditorial } from "@/lib/authz";
import { calculateReadingTime, cleanText, slugify } from "@/lib/utils";
import { writeAuditLog } from "@/lib/audit";

const validAgeGroups = new Set(Object.values(AgeGroup));

function messageUrl(path: string, key: "message" | "error", message: string): string {
  return `${path}?${key}=${encodeURIComponent(message)}`;
}

async function uniqueSlug(title: string, storyId?: string) {
  const base = slugify(title) || `story-${Date.now()}`;
  let slug = base;
  let counter = 2;
  while (true) {
    const found = await prisma.story.findUnique({ where: { slug }, select: { id: true } });
    if (!found || found.id === storyId) return slug;
    slug = `${base}-${counter++}`;
  }
}

function parseStory(formData: FormData) {
  const title = cleanText(formData.get("title"));
  const summary = cleanText(formData.get("summary"));
  const content = cleanText(formData.get("content"));
  const categoryId = cleanText(formData.get("categoryId"));
  const featuredImage = cleanText(formData.get("featuredImage")) || null;
  const contentWarning = cleanText(formData.get("contentWarning")) || null;
  const rawAgeGroup = cleanText(formData.get("ageGroup")) as AgeGroup;
  const ageGroup = validAgeGroups.has(rawAgeGroup) ? rawAgeGroup : AgeGroup.ALL_AGES;

  if (title.length < 4) throw new Error("The title must contain at least 4 characters.");
  if (summary.length < 20) throw new Error("The summary must contain at least 20 characters.");
  if (content.length < 100) throw new Error("The story must contain at least 100 characters.");
  if (!categoryId) throw new Error("Choose a category.");
  if (featuredImage && !/^https?:\/\//i.test(featuredImage)) {
    throw new Error("The featured-image address must begin with http:// or https://.");
  }

  return {
    title,
    summary,
    content,
    categoryId,
    featuredImage,
    contentWarning,
    ageGroup,
    readingTime: calculateReadingTime(content)
  };
}

export async function createStory(formData: FormData) {
  const user = await requireUser();
  const intent = cleanText(formData.get("intent"));

  let data: ReturnType<typeof parseStory>;
  try {
    data = parseStory(formData);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to save the story.";
    redirect(messageUrl("/dashboard/stories/new", "error", message));
  }

  const category = await prisma.category.findUnique({ where: { id: data.categoryId } });
  if (!category) redirect(messageUrl("/dashboard/stories/new", "error", "The selected category does not exist."));

  const submitted = intent === "submit";
  const story = await prisma.story.create({
    data: {
      ...data,
      slug: await uniqueSlug(data.title),
      authorId: user.id,
      status: submitted ? StoryStatus.SUBMITTED : StoryStatus.DRAFT,
      submittedAt: submitted ? new Date() : null,
      revisions: {
        create: {
          summary: data.summary,
          content: data.content,
          editedById: user.id,
          version: 1
        }
      }
    }
  });

  await writeAuditLog({
    userId: user.id,
    action: submitted ? "STORY_SUBMITTED" : "STORY_CREATED",
    entityType: "STORY",
    entityId: story.id
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/stories");
  redirect(messageUrl("/dashboard/stories", "message", submitted ? "Story submitted for review." : "Draft saved."));
}

export async function updateStory(storyId: string, formData: FormData) {
  const user = await requireUser();
  const story = await prisma.story.findUnique({
    where: { id: storyId },
    include: { _count: { select: { revisions: true } } }
  });

  if (!story) redirect(messageUrl("/dashboard/stories", "error", "Story not found."));
  const editorial = isEditorial(user.role);
  const canEditOwn = story.authorId === user.id && [StoryStatus.DRAFT, StoryStatus.CHANGES_REQUESTED].includes(story.status);
  if (!editorial && !canEditOwn) redirect(messageUrl("/dashboard/stories", "error", "This story cannot be edited at its current stage."));

  let data: ReturnType<typeof parseStory>;
  try {
    data = parseStory(formData);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to update the story.";
    redirect(messageUrl(`/dashboard/stories/${storyId}/edit`, "error", message));
  }

  const intent = cleanText(formData.get("intent"));
  const submitted = intent === "submit";
  const nextStatus = submitted
    ? StoryStatus.SUBMITTED
    : editorial
      ? story.status
      : story.status === StoryStatus.CHANGES_REQUESTED
        ? StoryStatus.CHANGES_REQUESTED
        : StoryStatus.DRAFT;

  await prisma.$transaction([
    prisma.story.update({
      where: { id: storyId },
      data: {
        ...data,
        slug: await uniqueSlug(data.title, storyId),
        status: nextStatus,
        submittedAt: submitted ? new Date() : story.submittedAt,
        rejectionReason: submitted ? null : story.rejectionReason
      }
    }),
    prisma.storyRevision.create({
      data: {
        storyId,
        summary: data.summary,
        content: data.content,
        editedById: user.id,
        version: story._count.revisions + 1
      }
    })
  ]);

  await writeAuditLog({
    userId: user.id,
    action: submitted ? "STORY_RESUBMITTED" : "STORY_UPDATED",
    entityType: "STORY",
    entityId: storyId
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/stories");
  revalidatePath(`/dashboard/stories/${storyId}/edit`);
  redirect(messageUrl("/dashboard/stories", "message", submitted ? "Story submitted for review." : "Changes saved."));
}

export async function deleteStory(storyId: string) {
  const user = await requireUser();
  const story = await prisma.story.findUnique({ where: { id: storyId } });
  if (!story) redirect(messageUrl("/dashboard/stories", "error", "Story not found."));

  const canDelete = user.role === Role.ADMIN || (story.authorId === user.id && story.status === StoryStatus.DRAFT);
  if (!canDelete) redirect(messageUrl("/dashboard/stories", "error", "Only administrators or the author of a draft can delete this story."));

  await prisma.story.delete({ where: { id: storyId } });
  await writeAuditLog({ userId: user.id, action: "STORY_DELETED", entityType: "STORY", entityId: storyId });
  revalidatePath("/dashboard/stories");
  redirect(messageUrl("/dashboard/stories", "message", "Story deleted."));
}

export async function beginReview(storyId: string) {
  const user = await requireRole([Role.ADMIN, Role.EDITOR]);
  await prisma.story.updateMany({
    where: { id: storyId, status: StoryStatus.SUBMITTED },
    data: { status: StoryStatus.UNDER_REVIEW }
  });
  await writeAuditLog({ userId: user.id, action: "REVIEW_STARTED", entityType: "STORY", entityId: storyId });
  revalidatePath("/dashboard/review");
  redirect(`/dashboard/review/${storyId}`);
}

export async function reviewStory(storyId: string, formData: FormData) {
  const user = await requireRole([Role.ADMIN, Role.EDITOR]);
  const decision = cleanText(formData.get("decision")) as ReviewDecision;
  const comments = cleanText(formData.get("comments"));
  const allowed = new Set([ReviewDecision.CHANGES_REQUESTED, ReviewDecision.APPROVED, ReviewDecision.REJECTED]);

  if (!allowed.has(decision)) redirect(messageUrl(`/dashboard/review/${storyId}`, "error", "Choose a valid editorial decision."));
  if (comments.length < 5) redirect(messageUrl(`/dashboard/review/${storyId}`, "error", "Add a short editorial comment."));

  const story = await prisma.story.findUnique({ where: { id: storyId } });
  if (!story) redirect(messageUrl("/dashboard/review", "error", "Story not found."));

  const statusMap: Record<ReviewDecision, StoryStatus> = {
    COMMENT: story.status,
    CHANGES_REQUESTED: StoryStatus.CHANGES_REQUESTED,
    APPROVED: StoryStatus.APPROVED,
    REJECTED: StoryStatus.REJECTED
  };

  await prisma.$transaction([
    prisma.review.create({
      data: { storyId, reviewerId: user.id, decision, comments }
    }),
    prisma.story.update({
      where: { id: storyId },
      data: {
        status: statusMap[decision],
        editorNote: comments,
        approvedAt: decision === ReviewDecision.APPROVED ? new Date() : story.approvedAt,
        rejectionReason: decision === ReviewDecision.REJECTED ? comments : null
      }
    })
  ]);

  await writeAuditLog({
    userId: user.id,
    action: `REVIEW_${decision}`,
    entityType: "STORY",
    entityId: storyId
  });

  revalidatePath("/dashboard/review");
  revalidatePath(`/dashboard/review/${storyId}`);
  revalidatePath("/dashboard/stories");
  redirect(messageUrl("/dashboard/review", "message", `Editorial decision recorded: ${decision.toLowerCase().replaceAll("_", " ")}.`));
}

export async function publishStory(storyId: string) {
  const user = await requireRole([Role.ADMIN, Role.EDITOR]);
  const story = await prisma.story.findUnique({ where: { id: storyId } });
  if (!story || ![StoryStatus.APPROVED, StoryStatus.SCHEDULED].includes(story.status)) {
    redirect(messageUrl(`/dashboard/review/${storyId}`, "error", "Only approved or scheduled stories can be published."));
  }

  await prisma.story.update({
    where: { id: storyId },
    data: { status: StoryStatus.PUBLISHED, publishedAt: new Date(), scheduledAt: null }
  });
  await writeAuditLog({ userId: user.id, action: "STORY_PUBLISHED", entityType: "STORY", entityId: storyId });
  revalidatePath("/");
  revalidatePath("/stories");
  revalidatePath(`/stories/${story.slug}`);
  redirect(messageUrl(`/dashboard/review/${storyId}`, "message", "Story published."));
}

export async function scheduleStory(storyId: string, formData: FormData) {
  const user = await requireRole([Role.ADMIN, Role.EDITOR]);
  const value = cleanText(formData.get("scheduledAt"));
  const scheduledAt = new Date(value);

  if (!value || Number.isNaN(scheduledAt.getTime()) || scheduledAt <= new Date()) {
    redirect(messageUrl(`/dashboard/review/${storyId}`, "error", "Choose a valid future publication date and time."));
  }

  const story = await prisma.story.findUnique({ where: { id: storyId } });
  if (!story || story.status !== StoryStatus.APPROVED) {
    redirect(messageUrl(`/dashboard/review/${storyId}`, "error", "Approve the story before scheduling it."));
  }

  await prisma.story.update({
    where: { id: storyId },
    data: { status: StoryStatus.SCHEDULED, scheduledAt }
  });
  await writeAuditLog({
    userId: user.id,
    action: "STORY_SCHEDULED",
    entityType: "STORY",
    entityId: storyId,
    details: { scheduledAt: scheduledAt.toISOString() }
  });
  revalidatePath("/dashboard/review");
  redirect(messageUrl(`/dashboard/review/${storyId}`, "message", "Story scheduled. Times are interpreted by the server environment."));
}

export async function toggleFeaturedStory(storyId: string) {
  const user = await requireRole([Role.ADMIN, Role.EDITOR]);
  const story = await prisma.story.findUnique({ where: { id: storyId } });
  if (!story) redirect(messageUrl("/dashboard/stories", "error", "Story not found."));

  await prisma.story.update({ where: { id: storyId }, data: { isFeatured: !story.isFeatured } });
  await writeAuditLog({ userId: user.id, action: "STORY_FEATURE_TOGGLED", entityType: "STORY", entityId: storyId });
  revalidatePath("/");
  revalidatePath("/dashboard/stories");
  redirect(messageUrl("/dashboard/stories", "message", story.isFeatured ? "Story removed from featured section." : "Story featured on the homepage."));
}

import { AgeGroup, PrismaClient, Role, StoryStatus, UserStatus } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const adminEmail = process.env.ADMIN_EMAIL ?? "admin@littlebirdheavyskies.com";
  const adminPassword = process.env.ADMIN_PASSWORD ?? "Admin123!ChangeMe";

  const [adminHash, editorHash, writerHash] = await Promise.all([
    bcrypt.hash(adminPassword, 12),
    bcrypt.hash("Editor123!ChangeMe", 12),
    bcrypt.hash("Writer123!ChangeMe", 12)
  ]);

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: { role: Role.ADMIN, status: UserStatus.ACTIVE },
    create: {
      name: "Site Administrator",
      email: adminEmail,
      passwordHash: adminHash,
      role: Role.ADMIN,
      status: UserStatus.ACTIVE,
      isAdultConfirmed: true,
      termsAcceptedAt: new Date()
    }
  });

  const editor = await prisma.user.upsert({
    where: { email: "editor@littlebirdheavyskies.com" },
    update: { role: Role.EDITOR, status: UserStatus.ACTIVE },
    create: {
      name: "Editorial Team",
      email: "editor@littlebirdheavyskies.com",
      passwordHash: editorHash,
      role: Role.EDITOR,
      status: UserStatus.ACTIVE,
      isAdultConfirmed: true,
      termsAcceptedAt: new Date()
    }
  });

  const writer = await prisma.user.upsert({
    where: { email: "writer@example.com" },
    update: { role: Role.CONTRIBUTOR, status: UserStatus.ACTIVE },
    create: {
      name: "Demo Contributor",
      email: "writer@example.com",
      passwordHash: writerHash,
      role: Role.CONTRIBUTOR,
      status: UserStatus.ACTIVE,
      bio: "A sample contributor account for testing the editorial workflow.",
      isAdultConfirmed: true,
      termsAcceptedAt: new Date()
    }
  });

  const categories = [
    ["Under Sunny Skies", "under-sunny-skies", "Funny, joyful, and everyday childhood stories."],
    ["Under Heavy Skies", "under-heavy-skies", "Stories inspired by difficult circumstances and global challenges."],
    ["Wings of Hope", "wings-of-hope", "Stories of courage, support, healing, and positive change."],
    ["Beyond the Skies", "beyond-the-skies", "Fantasy, imagination, wonder, and adventure."],
    ["Around the World", "around-the-world", "Stories inspired by cultures and communities across the world."]
  ] as const;

  const categoryMap = new Map<string, string>();
  for (const [name, slug, description] of categories) {
    const category = await prisma.category.upsert({
      where: { slug },
      update: { name, description },
      create: { name, slug, description }
    });
    categoryMap.set(slug, category.id);
  }

  const storyOne = await prisma.story.upsert({
    where: { slug: "the-blue-schoolbag" },
    update: {},
    create: {
      title: "The Blue Schoolbag",
      slug: "the-blue-schoolbag",
      summary: "Malaika carries one schoolbag and two futures as drought changes the choices available to her family.",
      content: `The blue schoolbag was the brightest thing in Malaika's village. It hung from a wooden peg beside the door, shining like a piece of morning sky even when dust covered everything else.\n\nEvery day, Malaika touched its zipper before walking to the market with her mother. Inside were two notebooks, a short pencil, and a mathematics book she had borrowed from her teacher.\n\n"The river will return," her little brother said whenever he saw her looking toward the dry valley.\n\nMalaika wanted to believe him. She also wanted to return to school. Until then, she studied numbers by counting tomatoes, coins, and the steps between the market and home.\n\nOne afternoon, her teacher found her solving a division problem on the back of a paper bag. Instead of asking why she was absent, he sat beside her and listened. Together, they began a small evening class at the market for children whose days had become too full for school.\n\nThe river did not return that week. But every evening, the blue schoolbag grew heavier with borrowed books—and the circle of students around Malaika grew wider.`,
      authorId: admin.id,
      categoryId: categoryMap.get("under-heavy-skies")!,
      status: StoryStatus.PUBLISHED,
      ageGroup: AgeGroup.AGES_10_12,
      readingTime: 2,
      contentWarning: "References to drought and interrupted education.",
      isFeatured: true,
      submittedAt: new Date("2026-07-01T12:00:00Z"),
      approvedAt: new Date("2026-07-03T12:00:00Z"),
      publishedAt: new Date("2026-07-05T12:00:00Z")
    }
  });

  await prisma.storyRevision.upsert({
    where: { storyId_version: { storyId: storyOne.id, version: 1 } },
    update: {},
    create: {
      storyId: storyOne.id,
      summary: storyOne.summary,
      content: storyOne.content,
      editedById: admin.id,
      version: 1
    }
  });

  const storyTwo = await prisma.story.upsert({
    where: { slug: "the-day-the-goat-became-principal" },
    update: {},
    create: {
      title: "The Day the Goat Became Principal",
      slug: "the-day-the-goat-became-principal",
      summary: "A stubborn goat walks into school assembly and accidentally takes charge of the morning.",
      content: `Nobody invited Koko the goat to Monday assembly. Koko did not believe invitations were necessary.\n\nShe entered through the open gate, passed the surprised security guard, and climbed the three steps to the platform while the principal searched for his speech.\n\nKoko looked at five hundred students. Five hundred students looked at Koko.\n\nThen she ate the corner of the attendance sheet.\n\nThe youngest children laughed first. The teachers tried not to. The principal pointed toward the gate, but Koko stood beside the microphone as if waiting for silence.\n\n"Perhaps," the principal finally said, "our guest has an announcement."\n\nKoko answered with one powerful bleat.\n\nThe students applauded. By lunchtime, everyone agreed that Principal Koko's speech had been the shortest, clearest, and most popular address of the year.`,
      authorId: editor.id,
      categoryId: categoryMap.get("under-sunny-skies")!,
      status: StoryStatus.PUBLISHED,
      ageGroup: AgeGroup.ALL_AGES,
      readingTime: 1,
      isFeatured: false,
      submittedAt: new Date("2026-07-08T12:00:00Z"),
      approvedAt: new Date("2026-07-09T12:00:00Z"),
      publishedAt: new Date("2026-07-10T12:00:00Z")
    }
  });

  await prisma.storyRevision.upsert({
    where: { storyId_version: { storyId: storyTwo.id, version: 1 } },
    update: {},
    create: {
      storyId: storyTwo.id,
      summary: storyTwo.summary,
      content: storyTwo.content,
      editedById: editor.id,
      version: 1
    }
  });

  await prisma.story.upsert({
    where: { slug: "the-lantern-at-window-seven" },
    update: {},
    create: {
      title: "The Lantern at Window Seven",
      slug: "the-lantern-at-window-seven",
      summary: "A contributor draft ready to test the submission and review workflow.",
      content: `Every evening, a lantern appeared in Window Seven. Amara did not know who lit it, but she knew what it meant: someone else was awake, someone else remembered, and someone else was waiting for morning.\n\nThis seeded draft is intentionally short. Open it in the contributor dashboard, develop it into a complete story, and submit it to test the editorial workflow.`,
      authorId: writer.id,
      categoryId: categoryMap.get("wings-of-hope")!,
      status: StoryStatus.DRAFT,
      ageGroup: AgeGroup.AGES_13_17,
      readingTime: 1
    }
  });

  await prisma.auditLog.create({
    data: {
      userId: admin.id,
      action: "SEED_COMPLETED",
      entityType: "SYSTEM",
      details: { users: 3, categories: categories.length }
    }
  });

  console.log("Database seeded.");
  console.log(`Admin: ${adminEmail}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

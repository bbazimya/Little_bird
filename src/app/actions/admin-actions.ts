"use server";

import { Role, UserStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/authz";
import { cleanText, slugify } from "@/lib/utils";
import { writeAuditLog } from "@/lib/audit";

function go(path: string, key: "message" | "error", message: string) {
  redirect(`${path}?${key}=${encodeURIComponent(message)}`);
}

export async function createCategory(formData: FormData) {
  const user = await requireRole([Role.ADMIN]);
  const name = cleanText(formData.get("name"));
  const description = cleanText(formData.get("description")) || null;
  const slug = slugify(name);

  if (name.length < 3 || !slug) go("/dashboard/categories", "error", "Enter a valid category name.");
  const existing = await prisma.category.findUnique({ where: { slug } });
  if (existing) go("/dashboard/categories", "error", "A category with that name already exists.");

  const category = await prisma.category.create({ data: { name, slug, description } });
  await writeAuditLog({ userId: user.id, action: "CATEGORY_CREATED", entityType: "CATEGORY", entityId: category.id });
  revalidatePath("/dashboard/categories");
  revalidatePath("/stories");
  go("/dashboard/categories", "message", "Category created.");
}

export async function deleteCategory(categoryId: string) {
  const user = await requireRole([Role.ADMIN]);
  const storyCount = await prisma.story.count({ where: { categoryId } });
  if (storyCount > 0) go("/dashboard/categories", "error", "Move or delete the stories in this category first.");

  await prisma.category.delete({ where: { id: categoryId } });
  await writeAuditLog({ userId: user.id, action: "CATEGORY_DELETED", entityType: "CATEGORY", entityId: categoryId });
  revalidatePath("/dashboard/categories");
  go("/dashboard/categories", "message", "Category deleted.");
}

export async function changeUserRole(userId: string, formData: FormData) {
  const currentUser = await requireRole([Role.ADMIN]);
  const role = cleanText(formData.get("role")) as Role;
  if (!Object.values(Role).includes(role)) go("/dashboard/users", "error", "Invalid role.");
  if (userId === currentUser.id && role !== Role.ADMIN) go("/dashboard/users", "error", "You cannot remove your own administrator role.");

  await prisma.user.update({ where: { id: userId }, data: { role } });
  await writeAuditLog({ userId: currentUser.id, action: "USER_ROLE_CHANGED", entityType: "USER", entityId: userId, details: { role } });
  revalidatePath("/dashboard/users");
  go("/dashboard/users", "message", "User role updated.");
}

export async function toggleUserStatus(userId: string) {
  const currentUser = await requireRole([Role.ADMIN]);
  if (userId === currentUser.id) go("/dashboard/users", "error", "You cannot suspend your own account.");

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) go("/dashboard/users", "error", "User not found.");
  const status = user.status === UserStatus.ACTIVE ? UserStatus.SUSPENDED : UserStatus.ACTIVE;

  await prisma.user.update({ where: { id: userId }, data: { status } });
  await writeAuditLog({ userId: currentUser.id, action: "USER_STATUS_CHANGED", entityType: "USER", entityId: userId, details: { status } });
  revalidatePath("/dashboard/users");
  go("/dashboard/users", "message", `User status changed to ${status.toLowerCase()}.`);
}

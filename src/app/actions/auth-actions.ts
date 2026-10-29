"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { cleanText } from "@/lib/utils";
import { signOut } from "@/auth";
import { writeAuditLog } from "@/lib/audit";

export async function registerContributor(formData: FormData) {
  const name = cleanText(formData.get("name"));
  const email = cleanText(formData.get("email")).toLowerCase();
  const password = cleanText(formData.get("password"));
  const adultConfirmed = formData.get("adultConfirmed") === "on";
  const termsAccepted = formData.get("termsAccepted") === "on";

  if (name.length < 2) redirect("/register?error=Please+enter+your+full+name.");
  if (!/^\S+@\S+\.\S+$/.test(email)) redirect("/register?error=Please+enter+a+valid+email+address.");
  if (password.length < 10) redirect("/register?error=Password+must+contain+at+least+10+characters.");
  if (!adultConfirmed) redirect("/register?error=Contributors+must+confirm+that+they+are+at+least+18.");
  if (!termsAccepted) redirect("/register?error=You+must+accept+the+submission+terms.");

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) redirect("/register?error=An+account+already+uses+that+email.");

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: {
      name,
      email,
      passwordHash,
      isAdultConfirmed: true,
      termsAcceptedAt: new Date()
    }
  });

  await writeAuditLog({
    userId: user.id,
    action: "USER_REGISTERED",
    entityType: "USER",
    entityId: user.id
  });

  redirect("/login?message=Account+created.+You+can+now+sign+in.");
}

export async function logout() {
  await signOut({ redirectTo: "/" });
}

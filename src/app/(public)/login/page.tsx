import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { LoginForm } from "@/components/LoginForm";
import { queryMessage } from "@/lib/utils";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: {
  searchParams: Promise<{ message?: string | string[] }>;
}) {
  const session = await auth();
  if (session?.user) redirect("/dashboard");
  const params = await searchParams;
  const message = queryMessage(params.message);

  return (
    <section className="page-section">
      <div className="narrow" style={{ maxWidth: 520 }}>
        <p className="eyebrow">Contributor and editorial access</p>
        <h1 className="page-title">Sign in</h1>
        {message ? <p className="notice success">{message}</p> : null}
        <LoginForm />
        <p style={{ textAlign: "center" }}>New contributor? <Link href="/register"><strong>Create an account</strong></Link></p>
      </div>
    </section>
  );
}

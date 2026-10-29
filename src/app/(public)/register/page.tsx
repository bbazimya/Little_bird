import type { Metadata } from "next";
import Link from "next/link";
import { registerContributor } from "@/app/actions/auth-actions";
import { SubmitButton } from "@/components/SubmitButton";
import { queryMessage } from "@/lib/utils";

export const metadata: Metadata = { title: "Contributor registration" };

export default async function RegisterPage({ searchParams }: {
  searchParams: Promise<{ error?: string | string[] }>;
}) {
  const params = await searchParams;
  const error = queryMessage(params.error);
  return (
    <section className="page-section">
      <div className="narrow" style={{ maxWidth: 620 }}>
        <p className="eyebrow">Contributor account</p>
        <h1 className="page-title">Create your writing dashboard</h1>
        <p className="lead">Accounts are currently available to adults who want to submit original fiction for review.</p>
        {error ? <p className="notice error">{error}</p> : null}
        <form className="panel form-stack" action={registerContributor}>
          <label>Full name<input name="name" required minLength={2} autoComplete="name" /></label>
          <label>Email address<input name="email" type="email" required autoComplete="email" /></label>
          <label>Password<input name="password" type="password" minLength={10} required autoComplete="new-password" /><small>Use at least 10 characters.</small></label>
          <label style={{ display: "flex", gridTemplateColumns: "auto 1fr", alignItems: "start" }}>
            <input style={{ width: "auto", marginTop: 5 }} type="checkbox" name="adultConfirmed" required />
            <span>I confirm that I am at least 18 years old.</span>
          </label>
          <label style={{ display: "flex", gridTemplateColumns: "auto 1fr", alignItems: "start" }}>
            <input style={{ width: "auto", marginTop: 5 }} type="checkbox" name="termsAccepted" required />
            <span>I confirm that submitted work is original and agree to the editorial and submission requirements.</span>
          </label>
          <SubmitButton className="button primary full">Create account</SubmitButton>
        </form>
        <p style={{ textAlign: "center" }}>Already registered? <Link href="/login"><strong>Sign in</strong></Link></p>
      </div>
    </section>
  );
}

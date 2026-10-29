import Link from "next/link";
import type { Metadata } from "next";
import { auth } from "@/auth";

export const metadata: Metadata = { title: "Submit a Story" };

export default async function SubmitPage() {
  const session = await auth();
  return (
    <section className="page-section">
      <div className="narrow">
        <p className="eyebrow">For contributors</p>
        <h1 className="page-title">Submit fiction for editorial review</h1>
        <p className="lead">Contributors write in a private dashboard. Nothing appears publicly until an editor approves and publishes it.</p>
        <div className="panel" style={{ marginTop: 28 }}>
          <h2>Before submitting</h2>
          <ul>
            <li>You must be at least 18 years old to open a contributor account in this first release.</li>
            <li>The story must be your original work.</li>
            <li>Do not identify a vulnerable real child or reveal sensitive private information.</li>
            <li>You must own or have permission to use any image you provide.</li>
            <li>Submission does not guarantee publication.</li>
          </ul>
          {session?.user ? (
            <Link className="button" href="/dashboard/stories/new">Write a story</Link>
          ) : (
            <div className="form-actions">
              <Link className="button" href="/register">Create contributor account</Link>
              <Link className="button secondary" href="/login">Sign in</Link>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

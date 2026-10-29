# Architecture

## Application layers

- **Next.js App Router** serves the public website, dashboard, authentication pages, and API routes.
- **Auth.js** uses email/password credentials with encrypted JWT sessions.
- **Prisma ORM** provides typed access to PostgreSQL.
- **PostgreSQL** stores accounts, stories, revisions, reviews, categories, and audit logs.
- **Server Actions** handle story and administration forms without a separate Express server.

## Authorization

- `CONTRIBUTOR`: creates, edits, and submits personal drafts.
- `EDITOR`: reviews all submissions and manages publication.
- `ADMIN`: has editor capabilities plus category and user administration.

Every privileged page checks authorization on the server. Form actions repeat authorization checks instead of trusting the user interface.

## Story lifecycle

```text
DRAFT
  -> SUBMITTED
  -> UNDER_REVIEW
  -> CHANGES_REQUESTED -> SUBMITTED
  -> APPROVED -> PUBLISHED
              -> SCHEDULED -> PUBLISHED
  -> REJECTED
```

## Content rendering

Story content is stored and rendered as plain text. React escapes the content automatically, reducing cross-site-scripting risk. Line breaks are preserved with CSS. A future rich-text editor should sanitize stored HTML on the server.

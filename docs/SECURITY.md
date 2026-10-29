# Security checklist

Before a public launch:

- Replace all demonstration passwords.
- Use separate strong values for `AUTH_SECRET` and `CRON_SECRET`.
- Enable HTTPS only.
- Add rate limiting to login, registration, and story-submission actions.
- Add email verification and password reset.
- Add bot protection to registration.
- Store images in private managed object storage and validate file types.
- Configure database backups.
- Add error monitoring and audit-log review.
- Review account suspensions and editor permissions regularly.
- Keep Node.js and dependencies updated.
- Run accessibility, dependency, and penetration testing.

The project intentionally does not provide accounts to children. Registration requires an adult confirmation. Obtain professional legal guidance before collecting information directly from children.

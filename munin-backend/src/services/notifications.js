// Pluggable notification service. Today this only logs — there is no email
// provider wired up yet. Swap the body of `sendPasswordResetNotice` for an
// AWS SES `SendEmailCommand` call (or similar) later without touching any
// caller; every call site already only depends on this function's signature.
async function sendPasswordResetNotice({ email, tempPassword }) {
  // TODO(SES): replace this with an actual email send once an SES sender
  // identity/domain is verified, e.g.:
  //   const ses = new SESClient({ region: process.env.AWS_REGION });
  //   await ses.send(new SendEmailCommand({ ... }));
  console.log(
    `[notifications] (stub) would email ${email}: your account was created — temporary password: ${tempPassword}. You must set a new password on first login.`
  );
}

module.exports = { sendPasswordResetNotice };

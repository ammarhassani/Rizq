# Contract — Server-action failure shape

Applies to the server actions behind forms the freelancer fills in: onboarding step saves and
client creation/update first, and the same shape for any form corrected later.

## The distinction that matters

| Kind | Meaning | What the user is told | Retry advice |
|---|---|---|---|
| **Validation** | The submitted value cannot be accepted, ever, as typed | Which field, and what is wrong with it | **No** |
| **Transient** | The save might succeed if attempted again (network, server, timeout) | Something went wrong | **Yes** |
| **Session** | The session is gone | Sign in again | Not applicable |

Today both of the first two render the same "try again" copy, which is why a permanent
validation failure sends the user round a loop that can never succeed.

## Failure result

A failed action returns, in addition to its existing failure code:

- the **field** that failed, as a key the form can map to an input, and
- a **reason** the form can translate into Arabic and English — not a raw library message.

When several fields fail, the first is enough to unblock the user; returning all of them is
allowed and preferred where the form can show them together.

## Rules

1. A validation failure MUST name a field. If an action cannot say which field failed, it is
   reported as transient — and that is a bug to fix, not a shape to rely on.
2. Reasons are enumerated and translated in the message catalogue. No English-only library
   text reaches the screen.
3. The user's other input survives a failed submit.
4. **A value the server discards MUST NOT be reported as saved.** If an input is dropped
   (unsupported URL scheme, unknown enum), the action reports it as rejected with its field.
5. Retry copy is reserved for the transient kind.

## Verification

1. Onboarding platforms step, one malformed URL among valid ones → the error names that field,
   the valid fields keep their values, no retry wording.
2. New client form, invalid email → error under the email field.
3. Onboarding platforms step, a `javascript:` URL → reported as rejected, not saved silently.
4. Server unreachable → retry wording appears, and retrying works once the server returns.

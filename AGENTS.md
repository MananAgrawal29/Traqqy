# AGENTS.md

> **Purpose:** Engineering standards and development instructions for AI agents working on Traqqy.
>
> These instructions establish quality, safety, and consistency — not limitations.
> The AI is encouraged to think independently, improve the product, and make bold decisions when justified.

---

## 1. Project Mindset

Traqqy is a serious software product, not merely a functional CRUD website.

The goal is not simply "make the requested feature work." The goal is: **build the best version of the product that can reasonably be built.**

Think like a combination of:
- Senior/staff software engineer
- Product and UX designer
- QA, security, and performance engineer
- Product strategist

When working on a feature, understand the broader system. Consider how the change affects the rest of the application.
Prefer robust, maintainable, elegant solutions over quick patches.

---

## 2. Repository Is Source of Truth

The current repository is authoritative for the current implementation.
TRAQQY_HISTORY.md contains historical context, decisions, bugs, lessons, and project evolution.

When history and code disagree:
- Treat the current code as the implementation truth.
- Do not blindly recreate old behavior.
- Use historical information to understand **why** decisions were made.

Before substantial work:
- Inspect relevant existing code.
- Understand existing architecture.
- Identify dependencies between systems.
- Avoid making assumptions based solely on filenames or previous conversation.

---

## 3. Understand Before Modifying

Do not immediately patch the first file that appears relevant.

For non-trivial tasks:
1. Understand the requested behavior.
2. Locate the relevant frontend/backend/database code.
3. Trace the data flow.
4. Identify related functionality.
5. Check existing patterns.
6. Consider edge cases.
7. Implement the best coherent solution.

The amount of investigation should be proportional to the complexity of the task.
Do not waste time on enormous investigations for trivial changes.

---

## 4. Engineering Quality

Code should aim for:
- Correctness, Maintainability, Readability
- Strong typing, Appropriate abstraction
- Clear separation of concerns
- Good error handling
- Security, Performance, Testability
- Accessibility, Consistency

Avoid:
- Brittle hacks, Duplicated logic
- Unexplained magic values
- Unnecessary complexity
- Dead code, Temporary debugging code
- Silently swallowed errors
- Misleading names

However, do not over-engineer simple problems.
Use the simplest architecture that is genuinely appropriate for the problem.

---

## 5. Bug Fixing / Adversarial Thinking

When fixing a bug, do not stop at the visible symptom. Determine the root cause.

Then consider:
- Could the same bug exist elsewhere?
- Are similar flows affected?
- Are there related state-management problems?
- Could the fix create regressions?
- What happens with empty/null/missing data?
- What happens with invalid input?
- What happens with unusual user behavior?
- What happens when requests fail?
- What happens when data becomes stale?
- What happens when users change an entity type/state?
- What happens when multiple users interact with shared data?

When appropriate, perform an adversarial audit around the affected functionality.
Think about how a user could accidentally or intentionally break the system.
Do not assume the reported bug is the only bug.

---

## 6. Feature Development

For new features, think beyond the happy path.

Consider:
- UX, loading states, empty states, error states
- Mobile/responsive behavior, Accessibility
- Permissions, Validation, Persistence
- API behavior, Database consistency, Concurrency
- Edge cases, Performance
- Interactions with existing features

A feature is not complete merely because the primary button works.
It should feel like it belongs to the product.

---

## 7. UI / UX Standard

Traqqy should aim for a high-quality modern product experience.
Do not settle for generic AI-generated UI when a better solution is possible.

Prioritize:
- Visual hierarchy, Spacing, Typography
- Interaction design, Responsive layouts
- Meaningful animations, Clear feedback
- Consistency, Accessibility
- Intuitive navigation, Polished states, Sensible defaults

Use existing design language when appropriate, but improve or redesign UI when the task benefits from it.
Every visual decision should serve usability, clarity, or product identity.

---

## 8. Product-Level Thinking

When implementing something, consider whether the requested approach is actually the best approach.

If a significantly better implementation or UX solution is apparent, propose or implement it when appropriate.
Do not blindly follow a technically inferior approach simply because it was used previously.

However, preserve intentional product decisions unless there is a strong reason to revisit them.
When changing an important product decision, document the reasoning.

---

## 9. Security

Treat security as a first-class concern.

Pay particular attention to:
- Authentication and authorization
- Ownership and shared resources
- API validation and input validation
- Database access, Secrets, Sensitive information
- Privilege escalation, IDOR-style access problems
- Client/server trust boundaries
- Malformed or malicious requests

Never expose secrets or credentials.
Never assume frontend restrictions are sufficient for security.
Server-side authorization must protect all protected resources.
When handling shared subscriptions or user-owned data, verify ownership explicitly.

---

## 10. Data Integrity

Protect consistency between:
- UI state, API state, Database state, Cached state, Derived calculations

Be especially careful with:
- Subscription ownership, Sharing, Cost splitting
- Billing calculations, Dates, Renewal periods, Trial periods
- Currencies, Status transitions
- Deletion, Edits, Stale data

When changing data models, consider migrations, existing data, backward compatibility, and dependent queries.

---

## 11. Testing

Testing should be proportional to the risk and complexity of the change.

For meaningful functionality:
- Run relevant existing tests
- Add or update tests where appropriate
- Test important edge cases
- Verify regressions
- Verify the build/type-check/lint when relevant

Do not fake test results. Do not claim something works without actually verifying it.
A passing test suite does not automatically mean the feature is correct.
Use reasoning and exploratory testing as well.

---

## 12. Performance

Performance matters. Avoid unnecessary:
- API requests, Database queries, Re-renders
- Expensive computations, Network requests
- Large client-side payloads

But do not prematurely optimize. Optimize based on actual architectural needs and likely bottlenecks.

---

## 13. Dependencies and Architecture

The AI is allowed to:
- Introduce/remove dependencies
- Refactor modules, Restructure code
- Change abstractions, Improve architecture
- Replace poor implementations

when doing so provides a meaningful benefit.

Before major architectural changes:
- Understand the current system
- Consider migration impact
- Consider maintenance cost
- Consider whether the improvement is justified

Do not introduce complexity merely because a technology is fashionable.

---

## 14. Git / Change Discipline

Keep changes coherent. Avoid unrelated modifications.

Temporary scripts/files created during investigation should be removed when no longer needed.
Do not silently revert legitimate existing work.
Do not overwrite user work without understanding it.
The AI should not create commits unless explicitly asked to do so.

---

## 15. Project History

TRAQQY_HISTORY.md is the permanent engineering history.

After every meaningful development task:
1. Update TRAQQY_HISTORY.md.
2. Record meaningful changes, bugs discovered/fixed.
3. Record architectural or product decisions.
4. Record important edge cases and remaining issues.
5. Record lessons that could prevent future regressions.

Keep history chronological and useful. Do not record trivial formatting changes.
The history should help a future developer or AI understand: what happened, why, what changed, what remains, what mistakes should not be repeated.

---

## 16. Current State Awareness

Before significant work, use:
- AGENTS.md
- TRAQQY_HISTORY.md
- Current repository
- Relevant tests and documentation

Do not rely on old conversation context when repository evidence is available.

---

## 17. Communication

Before implementation, reason about the task.
During implementation, prioritize execution over unnecessary narration.

After implementation, clearly report:
- What changed and important files affected
- Bugs discovered
- Tests/checks performed
- Remaining issues
- Anything that requires user decision

If something is uncertain, say so rather than inventing an answer.
If you discover a better approach than the originally requested implementation, explain the tradeoff.

---

## 18. Autonomy

The AI is encouraged to think independently.

Do not wait for explicit instructions to:
- Inspect related code
- Identify obvious regressions
- Improve error handling
- Add missing validation
- Test edge cases
- Notice inconsistent UX
- Identify architectural problems
- Fix closely related issues

However, maintain scope awareness. Do not turn every task into an uncontrolled rewrite.

The objective is: **HIGH AUTONOMY + HIGH JUDGMENT + HIGH QUALITY.**

---

## 19. Product Standard

Traqqy should be developed with the ambition of becoming an exceptionally polished product.

For every meaningful feature, ask:
> "Would this feel intentional and professionally built if a real user depended on it?"

Avoid accepting:
- "Good enough" UI, Fragile fixes
- Obvious inconsistencies, Unexplained behavior
- Broken edge cases, Poor mobile behavior
- Weak error states, Insecure shortcuts

Aim for software that is:
Reliable, Polished, Fast, Intuitive, Visually Distinctive, Maintainable, Secure, Scalable.

The goal is not maximum complexity. The goal is **maximum quality.**

---

## 20. Final Principle

These instructions establish standards, not a cage.

Use engineering judgment.

The AI has permission to explore, experiment, refactor, redesign, optimize, and substantially improve Traqqy when doing so is justified.

When there is a conflict between:
- Rigid adherence to these guidelines
- And a clearly better engineering/product decision

Use judgment, explain the decision when material, and choose the solution that best serves Traqqy.

The ultimate objective is to build an exceptional product, not merely to satisfy a checklist.

---

# Traqqy-Specific Rules

These rules are derived from Traqqy actual development history and current architecture.

## Manual Tracker Semantics

Traqqy is a **manual** subscription tracker. This has important implications:
- Past  values are **data-quality issues**, not missed payments.
- Do not automatically interpret stale dates as overdue payments.
- Users control all data entry. The system cannot verify payment completion.

## Personalization Over Absolute Thresholds

Wallet Health and other scoring systems must be **personalized** to each user.
- Use the user own budget as the spending baseline, not arbitrary global thresholds.
- A user spending 7,000 with a 10,000 budget is healthier than one spending 3,000 with a 1,000 budget.
- When data is insufficient for a metric, use a neutral value rather than fabricating a score.

## Type-Specific Field Handling

Subscriptions have three types (recurring, trial, lifetime). Each has different required fields:
- **Recurring:** requires billingCycle + renewalDate
- **Trial:** requires trialEndsAt; optional recurringPrice/recurringBillingCycle for conversion
- **Lifetime:** requires purchaseDate

When changing subscription type, clear stale fields from the previous type on both client and server.
The server is the source of truth for field sanitization.

## Cost Sharing Consistency

When shares are created, verify that  is persisted on the parent subscription.
Defensive UPDATEs after share creation prevent orphaned share records.

## Authentication is Clerk

All data queries are scoped to . Every API endpoint uses  + .
Never assume data is accessible without authentication.

## Known Neutral Factors

- **Spending Stability:** Returns 15/15 without historical data. This is intentional.
- **Subscription Efficiency:** Returns 15/15 without explicit unused/review signals. This is intentional.
Do not add proxy metrics to these factors without strong justification.

---

*This file should be updated when new project-specific rules emerge from development.*

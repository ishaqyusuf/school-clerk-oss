# ADR-0043: Retire unverified legacy auth surfaces

Date: 2026-09-08
Status: Accepted for implementation; verification deferred.

## Decision

The legacy `/sign-up/success` route no longer treats query values as an account-creation receipt or renders caller-supplied navigation URLs. It composes a neutral, responsive notice with a fixed local signup link, sign-in/inbox guidance and no-index/no-referrer metadata. The authoritative signup completion UI remains the current action-response-driven form. No query-input migration or fabricated success fallback is introduced.

Remove unused `packages/auth/src/utils.ts`. It was unmodified in the checkout, absent from package exports, and repository searches found no external caller of its legacy login/token/password-bypass functions or permission placeholders. It contained a fake-session result, master-password exceptions, non-consuming token login, reversed expiry calculation and unscoped tenant selection. Do not redirect these legacy interfaces to guessed compatibility behavior. Supported auth remains Better Auth plus the dedicated validated services.

## Limits

This deletes only a Git-tracked source file, recoverable from Git. No stored users, sessions, EmailTokenLogin rows or environment variables are changed. No schema/dependency/lockfile change is needed. Outside-repository private source imports are unsupported and need migration if discovered.

Midday's compositional route and provider-owned auth boundaries guide this cleanup. No query, table, sheet, form mutation or replacement auth subsystem is necessary. Full generic-auth endpoint coverage is not proven; tests/typechecks/builds/browser/mobile verification remain deferred.

Legacy FTD records are a separate unresolved domain boundary: global post dataset `firstTerm-1446-1447-prod` lacks school ownership. Do not infer a tenant or migrate records without the user's ownership/retirement decision. Search/aggregate and other independent enforcement work continues meanwhile.

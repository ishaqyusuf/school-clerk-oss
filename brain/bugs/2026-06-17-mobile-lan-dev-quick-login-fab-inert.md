# Mobile LAN Dev Quick Login FAB Inert

## Bug ID and Title
- Date discovered: 2026-06-17
- Date resolved: 2026-06-17
- Severity: Medium

## Symptoms
When opening the dashboard login page from a phone or the in-app browser over a LAN URL such as `http://192.168.18.3:2200/daarulhadith/login`, the page renders and reaches the tenant login screen, but interactive login controls can behave as if inert. The quick-login FAB initially did not open; after that was fixed, the quick-login row and Sign in button still did not run React handlers. The same flow works when testing from desktop `localhost`.

## Root Cause
The failing environment is a mobile/in-app browser on an insecure LAN origin, not the normal desktop localhost origin. The exact browser restriction can vary by device/browser, but the important product lesson is that unauthenticated login helpers used for mobile LAN testing should not depend exclusively on React/Radix client event handling. Browser testing showed the page could render scripts without hydrating the login controls: native `<details>` opened, but React click handlers and `onSubmit` did not run.

The original quick-login FAB used a Radix dropdown trigger. A first fix replaced that with React state and native buttons, but that still depended on hydrated React click handlers. The more resilient pattern is to make the menu open with browser-native HTML semantics and make quick-fill use plain links/query parameters. On the login screen, quick login must remain a form filler only; it should not submit the form, prepare credentials, reset passwords, or navigate away.

## Fix Implemented
The dev quick-login FAB now uses native `details`/`summary` to open the menu without relying on React state. On the login screen, user rows are plain links to the same login page with quick-fill query parameters; the page applies those query values to email, password, and remember-me without auto-submitting. The login form now declares a server-action `POST` fallback so non-hydrated sessions submit through the server instead of performing a native `GET` that exposes credentials in the URL. Outside the login page, the global development FAB can still provide real links to the tenant-aware `/dev-quick-login` route.

## Prevention
- Dev-only controls that exist specifically to support mobile LAN testing should have a native HTML fallback for their first interaction.
- Avoid Radix dropdown/popover-only implementations for unauthenticated local dev helpers that must work from insecure LAN origins.
- Keep login-screen quick-login behavior limited to filling visible form fields; the user should explicitly submit the form.
- Login forms must not rely solely on client-side `onSubmit`; provide a POST/server fallback for unauthenticated mobile LAN testing.
- Keep heavier account preparation/sign-in behavior isolated to the standalone `/dev-quick-login` route or other clearly named dev-only flows.
- When debugging mobile LAN behavior, distinguish these cases separately: route reaches login, FAB renders, FAB opens, quick-fill applies to fields, and Sign in submits. A working redirect or native disclosure open does not prove React event handling is healthy.

## Related Files
- `apps/dashboard/src/components/dev-tenant-quick-login-fab.tsx`
- `apps/dashboard/src/app/[domain]/(auth)/login/client.tsx`
- `apps/dashboard/src/app/[domain]/(auth)/dev-quick-login/page.tsx`
- `apps/dashboard/src/app/[domain]/(auth)/login/actions.ts`
- `brain/api/permissions.md`

## Related Tests
- `git diff --check -- apps/dashboard/src/components/dev-tenant-quick-login-fab.tsx 'apps/dashboard/src/app/[domain]/(auth)/login/client.tsx' 'apps/dashboard/src/app/[domain]/(auth)/login/page.tsx' 'apps/dashboard/src/app/[domain]/(auth)/login/actions.ts' brain/api/permissions.md brain/bugs/2026-06-17-mobile-lan-dev-quick-login-fab-inert.md` passed.
- In-app browser verification on `http://192.168.18.3:2200/daarulhadith/login` confirmed the native FAB opens, quick-fill populates `ishaqyusuf024@gmail.com` plus `lorem-ipsum`, and Sign in reaches a server-rendered `Invalid email or password` response instead of performing a native GET.
- Manual mobile verification should use the phone-accessible LAN URL and confirm opening the FAB, selecting a quick-login user, and submitting with known-valid credentials.

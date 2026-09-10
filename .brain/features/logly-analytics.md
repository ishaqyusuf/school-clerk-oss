# Logly dashboard analytics release

Isolated from verified production revision caea67e. Dashboard provider and same-origin proxy target schoolclerk-web with privacy projection and trusted country metadata. No database schema or native changes. Validation and deployment pending. Marketing uses a different production base and is released separately.

Validation: eight analytics tests / 33 assertions and events-package typecheck pass. Next production build passes after explicitly declaring existing locked Tailwind/PostCSS 4.1.17 dependencies. The unchanged baseline skips build-time TypeScript; a separate check exposed two existing undeclared Radix imports, now declared at locked dropdown-menu 2.1.16 and primitive 2.1.3. Full typecheck rerun pending. These dependency declarations preserve existing resolved versions and introduce no UI behavior or database schema change.

Separate full dashboard TypeScript validation now passes. Deployment preparation is authorized; production runtime acceptance remains deferred by the owner.

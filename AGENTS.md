# Project Guidance

## User Preferences

- Antarmuka berbahasa Indonesia
- Absensi wajib menyertakan GPS
- Absensi wajib menyertakan selfie kamera
- Mencatat jam masuk dan jam keluar

## Verified Commands

- **typecheck**: `pnpm typecheck`
- **fix**: `pnpm fix`
- **build**: `pnpm build`

## Learnings

- Motoko has no triple-quoted string syntax; a multi-line text literal uses a single " delimiter spanning lines, otherwise M0097 'expected function type, but expression produces type Text'.
- Semantic color tokens (success/warning/info) must be registered in tailwind.config.js theme.extend.colors or their utilities silently emit no CSS.
- Generated Candid bindings type UserId as Principal; a string cast `as unknown as UserId` throws at encode time — always Principal.fromText() before passing a principal to an actor method.
- With check-limit=1, fold all migration changes into the single earliest pending migration file; two pending migration files fail the stable-compatibility check.
- mo:core/Float (64-bit) has no sin/cos/sqrt/atan2; use mo:core/Float32 trig with conversions for haversine distance.
- Selfie images are uploaded to object storage and stored as Storage.ExternalBlob references, rendered via ExternalBlob.getDirectURL().
- There is no geolocation extension; use navigator.geolocation directly and normalize into the backend GpsPosition shape.
- The generated backend exposes only role methods (getCallerUserRole/isCallerAdmin/assignCallerUserRole) — no profile endpoints — so display names are UI-only local state.
- OQL manual .payload return types need their top-level <Type>Value imports; optional fields should return a Text sentinel.
- A getApiDoc mixin must be a bare top-level `mixin () { ... };` returning the Markdown literal directly from the function body.

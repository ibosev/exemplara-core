# Changelog

## 0.1.1 — 2026-10-10

Architecture review follow-up for the Svelte and Solid wrappers. Recorded on 2026-10-11 from the implementation, regression tests, and release verification logs.

### Plugin and view lifetimes

Core now owns registration cleanup for both portable plugins and attached views. This fixes callbacks retaining resources from an old view and portable behavior being disposed when only a view unmounts.

- `session.extensions.install(plugin)` and `api.installCore(plugin)` install portable behavior once per plugin ID for the session. This includes fallback installation requested by a wrapper. Session hooks and returned disposers follow that lifetime.
- `session.extensions.attach(...extensions)` installs view contributions and returns a detach function. Detaching removes those registrations; a new attachment supplies fresh callbacks.
- Failed setup rolls back managed registrations and newly installed portable plugins, preserves previously installed plugins, and restores the previous view's registrations so setup can be retried.
- Registration scopes track overwritten values. Removing an older view preserves later portable overrides and does not restore registrations whose owners have already been disposed.
- Teardown attempts all registered cleanup functions even when one throws, and reports the errors together. Session destruction stops registry subscriptions before removing registrations.
- Composition accepts `metadataOnly` entries so wrappers can declare view-plugin metadata without marking portable behavior as already installed.

Implementation: [extension registry](src/editor/extensions.ts), [registration scopes](src/editor/registration-scope.ts), and [session lifecycle](src/editor/session.ts). The terms used here are defined in the [glossary](GLOSSARY.md).

### Other changes included

Added optional `Page.guides` / `LayoutGuide` authoring metadata. Guides use millimetres, validate IDs, axes, and finite positions, and survive page duplication. The renderer ignores them; existing documents without guides remain valid. See [document types](src/core/types.ts), [validation](src/core/serialization.ts), and [guide tests](tests/layout-guides.test.mjs).

### Compatibility and migration

- The matching Svelte release is `exemplara-svelte@0.3.3`, which requires Core `^0.1.1`. Publish/install Core before the wrapper; older Core versions lack the attachment API.
- Existing documents need no migration for these changes. Ordinary callers of the action registration methods can continue ignoring their return values. Custom implementations of `EditorActionRegistry` must now return a removal function from `addCommand`, `addMenuItem`, and `addKeybinding`.
- With a host-owned session, legacy view commands are available only while their view is attached. Put behavior that must survive detach in a portable plugin. Portable plugins must not capture a particular wrapper's DOM resources.
- Registry rollback covers registrations made through its API and disposers that setup returned. A plugin must release external resources acquired before its own setup throws.

### Verification completed

Release validation on 2026-10-10 passed Core build/typechecking and all **27 tests**, including **8 attachment regressions** covering remounts, failed setup/retry, fallback installation, interleaved overrides, and teardown errors. See [attachment tests](tests/attachment.test.mjs).

The paired wrapper passed 231 Svelte tests, browser checks, and isolated package certification, including headless declarations without Svelte installed and Chromium PDF generation. The Solid wrapper passed 9 browser regression cases. Published Core and Svelte `dist/` contents were compared with the tested builds and matched byte for byte.

Shablonix was updated to the published pair and deployed; demo editor and invoice-PDF checks passed. Its subsequent `€NaN` and duplicate formatter-insertion fixes were in Shablonix's expression engine and formatting panel. The currency failure also reproduced with Core 0.1.0; those fixes required no additional Core release.

These are historical validation results, not checks rerun when this record was written. The broader state-ownership audit still had existing findings, and authenticated production account workflows were not retested.

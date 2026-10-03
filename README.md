# Exemplara Core

MIT-licensed, framework-independent document model, command engine, HTML/CSS renderer, shared authoring utilities, and editor sessions backed by Nano Stores. No Svelte runtime or types are required by `exemplara-core`, `/core`, `/renderer`, `/shared`, or `/editor`.

```ts
import { EditorSession, createFullEditorPreset } from 'exemplara-core/editor';
import { render } from 'exemplara-core/renderer';

const editor = new EditorSession({ composition: createFullEditorPreset() });
const stop = editor.stores.selectedNode.subscribe(node => console.log(node?.id));
editor.addComponent('text', editor.activePage!.regions.body.id);
const output = render(editor.snapshot());
stop();
editor.destroy();
```

Each session owns its document engine, history, selection, clipboard, tabs, zoom, previews, drag state, component registry, render runtime, capability policy, and plugin services. The engine's canonical `store` owns document/history state; the session exposes that same store. `session.ui` owns typed Nano Store models for all component and private-feature state: drafts, filters, confirmations, sidebar geometry, ruler/toolbar placement, preview measurements, disclosures, upload/import progress, and version-history progress/counters. Use one session per editor/request. Subscribe to the read-only store API and change state through session methods. Store values remain the existing document model: make edits through commands rather than mutating document objects. `snapshot()` returns an independent clone.

A synchronous editing action batches store notifications and reconciles selection. Replacing a document increments `documentEpoch`, resets history, clears editing/drag targets, and fences pending persistence results. `destroy()` is idempotent and stops subscriptions and plugin hooks. Detaching a view does not destroy an externally owned session. A view may register reveal/viewport callbacks and inline caret insertion; the core does not retain DOM nodes.

Component models are scoped by profile and optional node/source/path identity:

```ts
const model = editor.ui.get('data');
model.set('query', 'invoice');
const stopDraft = model.store.subscribe(draft => console.log(draft.pasteText));
const textDraft = editor.ui.get('richText', nodeId);
textDraft.set('draftHtml', '<strong>Pending edit</strong>');
editor.ui.commitRichText(nodeId);
stopDraft();
```

Detaching a view preserves drafts/preferences and clears view scheduling/drag handles. Replacing a document resets its UI models and invalidates pending imports/uploads/clipboard work. Capture a model's `capture()` before awaiting a platform operation; `begin(channel)` also fences older intent on that channel. Use immutable replacements for nested fields. DOM elements, observers, animation frame/timer handles, caret ranges, and view registrations remain platform resources.

`EditorApplication` owns the host application's view mode, settings, feature flags, session lifetime, and computed document/JSON/statistics. Supply composition and seed-document factories; feature changes validate the replacement before disposing the previous session. This owner can run without any view mounted.

Portable plugins use `composeEditor({ plugins, services, policy })`; their `setup(api)` registers commands, menus, keybindings, block factories, renderers, transforms, style fields, autocomplete providers, and framework-independent panel metadata. `api.onSession(session => disposer)` starts a service once, after initialization. Core presets provide the structural metadata and editing commands. Proprietary features remain in the separate `exemplara-plugins/core` package.

The shared barrel contains pure utilities. Browser utilities such as `/shared/html-import`, `/shared/preview`, `/shared/dom`, and measurement helpers are explicit opt-in leaves and require their platform APIs when called. PDF execution belongs to `exemplara-plugins/pdf` and Node/Chromium, not this package.

Development from the sibling checkouts:

```sh
pnpm install
pnpm build
pnpm check
pnpm test:run
```

The Svelte package's `pnpm check:state` audits the complete wrapper/private-plugin/playground source graph and rejects application Rune state, local component state, state constructors outside core, and disclosures without a core owner. `pnpm test:packages` builds and packs all three packages, installs isolated consumers, checks headless declarations and browser bundles, builds and runs two isolated Svelte editors, and generates a PDF from the headless tarballs. `pnpm test:browser` verifies editing and view reattachment in the sibling playground. Both certification scripts require Chrome (`/usr/bin/google-chrome` or `EXEMPLARA_CHROMIUM_PATH`). Publish `exemplara-core@0.1.0` before `exemplara-svelte@0.2.1`; the private plugins depend on the public core but are never re-exported from it.

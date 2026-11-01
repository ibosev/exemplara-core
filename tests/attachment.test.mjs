import test from "node:test";
import assert from "node:assert/strict";
import { EditorSession } from "../dist/editor/index.js";

test("view commands use fresh resources on remount and are unavailable while detached", async () => {
  const editor = new EditorSession();
  let starts = 0,
    stops = 0;
  const setup = (api) => {
    let active = true;
    starts++;
    api.addCommand({
      id: "view.command",
      label: "View",
      execute: () => active,
    });
    return () => {
      active = false;
      stops++;
    };
  };
  const detach = editor.extensions.attach(setup);
  assert.equal(await editor.runCommand("view.command"), true);
  detach();
  detach();
  assert.equal(await editor.runCommand("view.command"), false);
  const detachAgain = editor.extensions.attach(setup);
  assert.equal(await editor.runCommand("view.command"), true);
  assert.equal(starts, 2);
  assert.equal(stops, 1);
  editor.destroy();
  detachAgain();
  assert.equal(stops, 2);
});

test("failed view setup rolls back every managed registration and remains retryable", () => {
  const editor = new EditorSession(),
    registry = editor.extensions;
  const text = editor.registry.get("text");
  const renderer = editor.renderRuntime.renderers.get("text");
  const formatter = registry.formatters.find(
    (entry) => entry.name === "uppercase",
  );
  const originalTransform = (value) => value;
  editor.renderRuntime.transforms.register("example", originalTransform);
  let fail = true;
  const setup = (api) => {
    api.addCommand({ id: "view.command", label: "View", execute: () => true });
    api.addMenuItem({
      id: "view.menu",
      commandId: "view.command",
      location: "node.context",
    });
    api.addKeybinding({ id: "view.key", commandId: "view.command", key: "v" });
    api.addPanel({ id: "view.panel", label: "View", placement: "left" });
    api.addInspectorSection({ id: "view.section" });
    api.addToolbarCluster({ id: "view.toolbar" });
    api.addCanvasDecoration({ id: "view.decoration", placement: "overlay" });
    api.addBlock({ id: "view.block", label: "View", category: "Test" });
    api.addOutlineAction({
      id: "view.outline",
      label: "View",
      placement: "both",
      execute: () => true,
    });
    api.addAutocompleteProvider({ id: "view.autocomplete", suggest: () => [] });
    api.addStyleField({ id: "view.style" });
    api.addFormatter({ ...formatter, name: "view.formatter" });
    api.replaceFormatter({ ...formatter, format: () => "view" });
    api.setExpressionEvaluator(() => "view");
    api.addComponent({ ...text, label: "View text" }, () => "<p>view</p>");
    api.addComponent(
      { ...text, label: "Updated view text" },
      () => "<p>updated</p>",
    );
    api.addBindingTransform("example", () => "view");
    // Populate sorted caches before rolling back, as an installed plugin may do.
    assert.equal(registry.panels.length, 1);
    if (fail) throw Error("setup failed");
  };
  const assertRestored = () => {
    assert.deepEqual(registry.commands, []);
    assert.deepEqual(registry.menuDefinitions, []);
    assert.deepEqual(registry.keybindingDefinitions, []);
    assert.deepEqual(registry.panels, []);
    assert.deepEqual(registry.inspectorSections(editor, {}), []);
    assert.deepEqual(registry.toolbarClusters(editor), []);
    assert.deepEqual(registry.canvasDecorations(editor, "overlay"), []);
    assert.deepEqual(registry.blocks, []);
    assert.deepEqual(registry.outlineActions, []);
    assert.deepEqual(registry.autocompleteProviders, []);
    assert.deepEqual(registry.styleFieldsFor(editor, {}), []);
    assert.equal(
      registry.formatters.find((entry) => entry.name === "view.formatter"),
      undefined,
    );
    assert.equal(
      registry.formatters.find((entry) => entry.name === "uppercase"),
      formatter,
    );
    assert.equal(registry.expressionRuntime.evaluator, undefined);
    assert.equal(editor.registry.get("text"), text);
    assert.deepEqual(editor.renderRuntime.renderers.get("text"), renderer);
    assert.equal(
      editor.renderRuntime.transforms.get("example"),
      originalTransform,
    );
  };
  assert.throws(() => registry.attach(setup), /setup failed/);
  assertRestored();
  fail = false;
  const detach = registry.attach(setup);
  assert.equal(registry.command("view.command").label, "View");
  assert.equal(
    registry.formatters.find((entry) => entry.name === "uppercase").format(),
    "view",
  );
  detach();
  assertRestored();
  editor.destroy();
});

test("portable installation requested by a view survives detach and starts only once", async () => {
  const editor = new EditorSession(),
    events = [];
  const plugin = {
    id: "portable",
    version: "1",
    setup(api) {
      events.push("setup");
      api.addCommand({
        id: "portable.command",
        label: "Portable",
        execute: () => true,
      });
      api.onSession(() => {
        events.push("start");
        return () => events.push("stop");
      });
      return () => events.push("dispose");
    },
  };
  const first = editor.extensions.attach((api) => api.installCore(plugin));
  first();
  assert.equal(await editor.runCommand("portable.command"), true);
  const second = editor.extensions.attach((api) => api.installCore(plugin));
  second();
  assert.deepEqual(events, ["setup", "start"]);
  editor.destroy();
  assert.deepEqual(events, ["setup", "start", "stop", "dispose"]);
});

test("a failed replacement keeps the previous view and old detach cannot remove a newer view", async () => {
  const editor = new EditorSession(),
    stops = [];
  const setup = (name) => (api) => {
    api.addCommand({ id: "view.command", label: name, execute: () => true });
    return () => stops.push(name);
  };
  const first = editor.extensions.attach(setup("first"));
  assert.throws(
    () =>
      editor.extensions.attach((api) => {
        setup("failed")(api);
        throw Error("failed");
      }),
    /failed/,
  );
  assert.equal(editor.extensions.command("view.command").label, "first");
  assert.deepEqual(stops, []);
  const second = editor.extensions.attach(setup("second"));
  first();
  assert.equal(editor.extensions.command("view.command").label, "second");
  assert.equal(await editor.runCommand("view.command"), true);
  second();
  assert.deepEqual(stops, ["first", "second"]);
  editor.destroy();
});

test("failed portable installation and session hooks can be retried without leaked registrations", () => {
  const editor = new EditorSession(),
    events = [];
  let fail = true;
  const plugin = {
    id: "portable",
    version: "1",
    setup(api) {
      api.addCommand({
        id: "portable.command",
        label: "Portable",
        execute: () => true,
      });
      api.onSession(() => {
        if (fail) throw Error("start failed");
        events.push("start");
      });
      return () => events.push("dispose");
    },
  };
  assert.throws(
    () => editor.extensions.attach((api) => api.installCore(plugin)),
    /start failed/,
  );
  assert.equal(editor.extensions.command("portable.command"), undefined);
  fail = false;
  const detach = editor.extensions.attach((api) => api.installCore(plugin));
  detach();
  assert.deepEqual(events, ["dispose", "start"]);
  editor.destroy();
  assert.deepEqual(events, ["dispose", "start", "dispose"]);
});

test("failed attachment removes new portable installations but preserves existing plugins", async () => {
  const editor = new EditorSession(),
    events = [];
  const plugin = (id) => ({
    id,
    version: "1",
    setup(api) {
      api.addCommand({ id, label: id, execute: () => true });
      return () => events.push(id);
    },
  });
  editor.extensions.install(plugin("existing"));
  assert.throws(
    () =>
      editor.extensions.attach((api) => {
        api.installCore(plugin("existing"));
        api.installCore(plugin("new"));
        throw Error("later setup failed");
      }),
    /later setup failed/,
  );
  assert.deepEqual(events, ["new"]);
  assert.equal(await editor.runCommand("existing"), true);
  assert.equal(await editor.runCommand("new"), false);
  editor.extensions.attach((api) => api.installCore(plugin("new")))();
  assert.equal(await editor.runCommand("new"), true);
  editor.destroy();
  assert.deepEqual(events, ["new", "new", "existing"]);
});

test("interleaved view and portable overrides restore only registrations that are still active", () => {
  const editor = new EditorSession();
  const original = editor.registry.get("text");
  const portable = { ...original, label: "Portable text" };
  const plugin = {
    id: "portable.override",
    version: "1",
    setup(api) {
      api.addComponent(portable);
    },
  };
  const setup = (api) => {
    api.addComponent({ ...original, label: "View text" });
    api.installCore(plugin);
  };
  assert.throws(
    () =>
      editor.extensions.attach((api) => {
        setup(api);
        throw Error("later setup failed");
      }),
    /later setup failed/,
  );
  assert.equal(editor.registry.get("text"), original);

  const detach = editor.extensions.attach(setup);
  detach();
  assert.equal(editor.registry.get("text"), portable);
  editor.destroy();
  assert.equal(editor.registry.get("text"), original);
});

test("session destruction cleans attached component registrations and continues after a disposer throws", () => {
  const editor = new EditorSession(),
    events = [];
  const detach = editor.extensions.attach(
    (api) => {
      api.addComponent({ ...editor.registry.get("text"), type: "view.custom" });
      return () => events.push("first");
    },
    () => () => {
      events.push("second");
      throw Error("cleanup failed");
    },
  );
  assert.throws(() => editor.destroy(), AggregateError);
  assert.equal(editor.registry.get("view.custom"), undefined);
  assert.deepEqual(events, ["second", "first"]);
  assert.equal(editor.destroyed, true);
  detach();
  editor.destroy();
});

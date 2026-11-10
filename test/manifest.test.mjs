// SPDX-License-Identifier: Apache-2.0
// The extension's promise is how little it can do. These tests fail if a
// change widens that.
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { test } from "node:test";
import { COMMANDS } from "../extension/lib.js";

const dir = new URL("../extension/", import.meta.url);
const manifest = JSON.parse(readFileSync(new URL("manifest.json", dir), "utf8"));

test("the extension asks for no permissions at all", () => {
  for (const key of ["permissions", "host_permissions", "optional_permissions",
    "optional_host_permissions", "content_scripts", "externally_connectable",
    "web_accessible_resources", "content_security_policy"]) {
    assert.equal(manifest[key], undefined, `manifest has ${key}`);
  }
});

test("no code reaches the network or evaluates strings", () => {
  // Every file Chrome could load from the extension, in subfolders too.
  const files = readdirSync(dir, { recursive: true })
    .filter((f) => /\.(m?js|html|css|svg)$/i.test(f))
    .map((f) => [f, readFileSync(new URL(f, dir), "utf8")]);
  assert.ok(files.some(([f]) => /\.js$/.test(f)) && files.some(([f]) => /\.css$/.test(f)));
  for (const [file, text] of files) {
    const bad = [/\bfetch\s*\(/, /XMLHttpRequest/, /WebSocket/, /EventSource/,
      /sendBeacon/, /\beval\s*\(/, /new Function\b/, /https?:\/\//i, /importScripts/,
      // A protocol-relative address in a string: "//host/x".
      /["'`]\s*\/\/(?![\s/])/];
    // A stylesheet can load a URL with @import or url(...); only data:
    // URLs are allowed.
    if (/\.(css|html|svg)$/i.test(file)) bad.push(/@import/i, /url\s*\((?!\s*["']?\s*data:)/i);
    for (const pattern of bad) assert.doesNotMatch(text, pattern, `${file} matches ${pattern}`);
  }
});

test("no code reads tab addresses, titles or page content", () => {
  for (const f of readdirSync(dir).filter((f) => /\.js$/.test(f))) {
    const text = readFileSync(new URL(f, dir), "utf8");
    for (const pattern of [/\.url\b/, /\.title\b/, /\.favIconUrl\b/, /chrome\.scripting/,
      /executeScript/, /chrome\.storage/, /chrome\.history/, /chrome\.cookies/]) {
      assert.doesNotMatch(text, pattern, `${f} matches ${pattern}`);
    }
  }
});

test("the commands in the manifest are the ones the code and popup handle", () => {
  assert.deepEqual(Object.keys(manifest.commands), COMMANDS);
  const popup = readFileSync(new URL("popup.html", dir), "utf8");
  for (const command of COMMANDS) {
    assert.match(popup, new RegExp(`data-command="${command}"`), command);
  }
  // Chrome sets suggested keys for at most four commands.
  const suggested = Object.values(manifest.commands).filter((c) => c.suggested_key);
  assert.ok(suggested.length <= 4);
});

test("the name says whose extension it is", () => {
  const name = "filmil's Tab Shortcuts";
  assert.equal(manifest.name, name);
  assert.equal(manifest.action.default_title, name);
  const popup = readFileSync(new URL("popup.html", dir), "utf8");
  assert.match(popup, new RegExp(`<title>${name}</title>`));
  assert.match(popup, new RegExp(`<h1>${name}</h1>`));
  assert.ok(manifest.description.length <= 132, "Chrome allows 132 characters");
});

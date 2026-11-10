// SPDX-License-Identifier: Apache-2.0
// Loads the extension into a real Chrome (Chrome for Testing, from
// Puppeteer), opens a window of local test tabs, and uses the popup's
// buttons as a person would: they run the same code as the shortcuts,
// which a test cannot press. Then it checks which tabs are left, and
// which are pinned.
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { resolve } from "node:path";
import { after, before, beforeEach, test } from "node:test";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer";

// The source folder, or E2E_EXTENSION_DIR: the release sets it to its
// unzipped zip, so the test runs what it publishes.
const extensionDir = process.env.E2E_EXTENSION_DIR
  ? resolve(process.env.E2E_EXTENSION_DIR)
  : fileURLToPath(new URL("../extension", import.meta.url));

let browser, server, extension, worker, base;

before(async () => {
  server = createServer((req, res) => {
    res.setHeader("Content-Type", "text/html");
    res.end(`<!doctype html><title>${req.url}</title><p>${req.url}</p>`);
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  base = `http://127.0.0.1:${server.address().port}`;
  browser = await puppeteer.launch({
    headless: true,
    pipe: true,
    enableExtensions: true,
    // Only for hosts where Chrome's sandbox cannot start (Ubuntu 23.10+
    // restricts the user namespaces it needs). The test pages are local.
    args: process.env.E2E_NO_SANDBOX ? ["--no-sandbox"] : [],
  });
  const id = await browser.installExtension(extensionDir);
  extension = (await browser.extensions()).get(id);
  assert.equal(extension?.name, "filmil's Tab Shortcuts");
  const target = await browser.waitForTarget(
    (t) => t.type() === "service_worker" && t.url().startsWith(`chrome-extension://${id}/`));
  worker = await target.worker();
});

after(async () => {
  await browser?.close();
  server?.close();
});

// Each test starts from six tabs, /1 to /6, with /1 and /2 pinned.
let pages = [];
beforeEach(async () => {
  for (const p of await browser.pages()) {
    if (p.url().startsWith(base)) await p.close();
  }
  pages = [];
  for (let i = 1; i <= 6; i++) {
    const p = await browser.newPage();
    await p.goto(`${base}/${i}`);
    pages.push(p);
  }
  for (const n of [1, 2]) await setPinned(n, true);
});

// The extension sees tabs by id, position and pinned state only, so the
// test finds a tab's id by bringing it to the front.
async function activeTab() {
  return worker.evaluate(async () => {
    const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    return { id: tab.id, pinned: tab.pinned };
  });
}

async function setPinned(n, pinned) {
  await pages[n - 1].bringToFront();
  const { id } = await activeTab();
  await worker.evaluate((id, pinned) => chrome.tabs.update(id, { pinned }), id, pinned);
}

// The test pages still open, by number, in tab order.
async function open() {
  const left = [];
  for (const p of await browser.pages()) {
    if (p.url().startsWith(base) && !p.isClosed()) left.push(Number(new URL(p.url()).pathname.slice(1)));
  }
  return left.sort((a, b) => a - b);
}

// Clicks the extension's icon on tab /n, and a button in its popup.
async function press(n, command) {
  const page = pages[n - 1];
  await page.bringToFront();
  const opened = browser.waitForTarget((t) => t.url().endsWith("/popup.html"));
  await page.triggerExtensionAction(extension);
  const popup = await (await opened).asPage();
  await popup.waitForSelector(`[data-command="${command}"]`);
  const closed = new Promise((r) => popup.once("close", r));
  await popup.click(`[data-command="${command}"]`);
  await closed;
}

async function until(check, what) {
  const deadline = Date.now() + 5_000;
  while (Date.now() < deadline) {
    if (await check()) return;
    await new Promise((r) => setTimeout(r, 100));
  }
  assert.fail(`timed out waiting for ${what}`);
}

test("close tabs to the left keeps pinned tabs", { timeout: 60_000 }, async () => {
  await press(5, "close-left");
  await until(async () => (await open()).length === 4, "the tabs to close");
  assert.deepEqual(await open(), [1, 2, 5, 6]);
});

test("close tabs to the right", { timeout: 60_000 }, async () => {
  await press(4, "close-right");
  await until(async () => (await open()).length === 4, "the tabs to close");
  assert.deepEqual(await open(), [1, 2, 3, 4]);
});

test("close other tabs keeps the active and the pinned tabs", { timeout: 60_000 }, async () => {
  await press(3, "close-others");
  await until(async () => (await open()).length === 3, "the tabs to close");
  assert.deepEqual(await open(), [1, 2, 3]);
});

test("pin and unpin the tab", { timeout: 60_000 }, async () => {
  await press(6, "toggle-pin");
  await pages[5].bringToFront();
  await until(async () => (await activeTab()).pinned, "the tab to be pinned");
  await press(6, "toggle-pin");
  await pages[5].bringToFront();
  await until(async () => !(await activeTab()).pinned, "the tab to be unpinned");
  assert.deepEqual(await open(), [1, 2, 3, 4, 5, 6]);
});

test("the popup shows the default keys", { timeout: 60_000 }, async () => {
  await pages[0].bringToFront();
  const opened = browser.waitForTarget((t) => t.url().endsWith("/popup.html"));
  await pages[0].triggerExtensionAction(extension);
  const popup = await (await opened).asPage();
  await popup.waitForFunction(() =>
    [...document.querySelectorAll("kbd")].every((k) => k.textContent !== ""));
  const keys = await popup.$$eval("kbd", (ks) => ks.map((k) => k.textContent));
  assert.equal(keys.length, 4);
  for (const key of keys) assert.match(key, /Alt|not set/);
  await popup.close();
});

// SPDX-License-Identifier: Apache-2.0
import assert from "node:assert/strict";
import { test } from "node:test";
import { COMMANDS, tabsToClose } from "../extension/lib.js";

// A window of six tabs, the first two pinned; the active one is in the middle.
const tabs = [
  { id: 10, index: 0, pinned: true },
  { id: 11, index: 1, pinned: true },
  { id: 12, index: 2, pinned: false },
  { id: 13, index: 3, pinned: false },
  { id: 14, index: 4, pinned: false },
  { id: 15, index: 5, pinned: false },
];
const active = tabs[3];

test("close-left closes the unpinned tabs before the active one", () => {
  assert.deepEqual(tabsToClose("close-left", tabs, active), [12]);
});

test("close-right closes the tabs after the active one", () => {
  assert.deepEqual(tabsToClose("close-right", tabs, active), [14, 15]);
});

test("close-others closes every unpinned tab but the active one", () => {
  assert.deepEqual(tabsToClose("close-others", tabs, active), [12, 14, 15]);
});

test("pinned tabs are never closed, even when they are not on the left", () => {
  const mixed = [
    { id: 1, index: 0, pinned: false },
    { id: 2, index: 1, pinned: true },
    { id: 3, index: 2, pinned: false },
  ];
  assert.deepEqual(tabsToClose("close-others", mixed, mixed[0]), [3]);
  assert.deepEqual(tabsToClose("close-right", mixed, mixed[0]), [3]);
});

test("a pinned active tab closes the same neighbours", () => {
  assert.deepEqual(tabsToClose("close-right", tabs, tabs[1]), [12, 13, 14, 15]);
  assert.deepEqual(tabsToClose("close-left", tabs, tabs[1]), []);
});

test("nothing to close at the edges, or for other commands", () => {
  assert.deepEqual(tabsToClose("close-left", tabs, tabs[2]), []);
  assert.deepEqual(tabsToClose("close-right", tabs, tabs[5]), []);
  assert.deepEqual(tabsToClose("toggle-pin", tabs, active), []);
  assert.deepEqual(tabsToClose("no-such-command", tabs, active), []);
});

test("the commands are the four the extension offers", () => {
  assert.deepEqual(COMMANDS, ["close-left", "close-right", "close-others", "toggle-pin"]);
});

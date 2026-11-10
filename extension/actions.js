// SPDX-License-Identifier: Apache-2.0
// Carries out a command on the tab it acts from, in that tab's window.
// The shortcuts (background.js) and the popup's buttons both use it.
//
// It needs no permission: tab ids, positions and pinned state are open to
// every extension. It never reads a tab's address, title or content.
import { tabsToClose } from "./lib.js";

export async function run(command, tab) {
  const active = tab ?? (await chrome.tabs.query({ active: true, currentWindow: true }))[0];
  if (!active) return;
  if (command === "toggle-pin") {
    await chrome.tabs.update(active.id, { pinned: !active.pinned });
    return;
  }
  const tabs = await chrome.tabs.query({ windowId: active.windowId });
  const ids = tabsToClose(command, tabs, active);
  if (ids.length) await chrome.tabs.remove(ids);
}

// SPDX-License-Identifier: Apache-2.0
// Pure helpers, unit-tested in Node. Nothing here touches the chrome.* APIs.

// The commands, in the order the popup shows them.
export const COMMANDS = ["close-left", "close-right", "close-others", "toggle-pin"];

// The ids of the tabs that `command` closes, from the tabs of one window,
// when `active` is the tab it acts from. Pinned tabs are never closed:
// they are the ones a person keeps on purpose.
export function tabsToClose(command, tabs, active) {
  const keep = (tab) => tab.id === active.id || tab.pinned;
  const pick = {
    "close-left": (tab) => tab.index < active.index,
    "close-right": (tab) => tab.index > active.index,
    "close-others": () => true,
  }[command];
  if (!pick) return [];
  return tabs.filter((tab) => !keep(tab) && pick(tab)).map((tab) => tab.id);
}

// SPDX-License-Identifier: Apache-2.0
// Runs a command when its keyboard shortcut is pressed. The shortcuts are
// set at chrome://extensions/shortcuts.
import { run } from "./actions.js";

chrome.commands.onCommand.addListener((command, tab) => {
  run(command, tab).catch((error) => console.error(`${command}: ${error.message}`));
});

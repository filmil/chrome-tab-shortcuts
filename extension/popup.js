// SPDX-License-Identifier: Apache-2.0
import { run } from "./actions.js";

const $ = (id) => document.getElementById(id);

for (const button of document.querySelectorAll("[data-command]")) {
  button.addEventListener("click", async () => {
    try {
      await run(button.dataset.command);
      window.close();
    } catch (error) {
      $("error").textContent = error.message;
    }
  });
}

// Shows each command's current keys, or "not set".
chrome.commands.getAll().then((commands) => {
  for (const { name, shortcut } of commands) {
    const kbd = document.querySelector(`[data-command="${name}"] kbd`);
    if (kbd) kbd.textContent = shortcut || "not set";
  }
});

// An extension can open its browser's shortcuts page; a plain link cannot.
$("shortcuts").addEventListener("click", () => {
  chrome.tabs.create({ url: "chrome://extensions/shortcuts" });
  window.close();
});

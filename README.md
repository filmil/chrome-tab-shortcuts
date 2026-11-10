[![test](https://github.com/filmil/chrome-tab-shortcuts/actions/workflows/test.yml/badge.svg)](https://github.com/filmil/chrome-tab-shortcuts/actions/workflows/test.yml)
[![release](https://github.com/filmil/chrome-tab-shortcuts/actions/workflows/release.yml/badge.svg)](https://github.com/filmil/chrome-tab-shortcuts/actions/workflows/release.yml)

# filmil's Tab Shortcuts

A Chrome extension with keyboard shortcuts to close tabs to the left,
close tabs to the right, close the other tabs, and pin or unpin the
current tab. It is meant to be small enough to read in a few minutes, so
that you can trust it without taking anyone's word for it. It is not on
the Chrome Web Store: each release is a zip file you load yourself.

## What it can and cannot do

- **No permissions.** The manifest asks for none, so Chrome shows no
  permission warning. Closing, pinning and listing tabs by position need
  no permission in Chrome. The extension never reads a tab's address,
  title or content, and a test fails if its code mentions any of them.
- **No network.** It makes no requests and loads no remote code. A test
  fails if any of its files names `fetch`, `XMLHttpRequest`, `WebSocket`,
  `eval`, or a URL.
- **Keeps nothing.** It stores no settings and no data.
- **Small.** About 75 lines of JavaScript, plus a popup, in
  [`extension/`](extension/), with no dependencies and no build step:
  the release zip is that folder, with the version filled in.

## Use

| Shortcut (default) | What it does |
|---|---|
| Alt+Shift+, (comma) | Close the tabs to the left of this one |
| Alt+Shift+. (period) | Close the tabs to the right of this one |
| Alt+Shift+O | Close the other tabs in this window |
| Alt+Shift+P | Pin or unpin this tab |

Pinned tabs are never closed. The commands act on the current window
only.

Clicking the extension's icon shows the same four actions as buttons,
with their current keys. To change the keys, or to make a shortcut work
when Chrome is not the focused app, open `chrome://extensions/shortcuts`
(the popup has a link to it). Each command there has a key and a scope:
**In Chrome**, the default, or **Global**, which Chrome allows only for
Ctrl+Shift+0 to 9. If Chrome or another extension already uses a
default key, Chrome leaves that command without a key, and you can pick
one there.

## Install

From a [release](https://github.com/filmil/chrome-tab-shortcuts/releases):
download `tab-shortcuts-<version>.zip`, check it against the `.sha256`
file beside it, and unzip it. In Chrome, open `chrome://extensions`, turn
on **Developer mode**, choose **Load unpacked**, and pick the unzipped
folder.

Or from source: clone this repository and load its `extension/` folder
the same way.

Chrome 120 or later.

## Releases

[`release.yml`](.github/workflows/release.yml) runs every day. If
`extension/` changed since the last release, it runs the tests, builds
the zip with Bazel, tests that zip in Chrome, and publishes a release
named after the date (for example `v2026.11.10`). It can also be run by
hand from the Actions tab, with **force** to release without changes.

## Development

[Bazel](https://bazel.build) builds the release zip and runs the unit
tests. Use [Bazelisk](https://github.com/bazelbuild/bazelisk), which runs
the version in `.bazelversion`. Bazel downloads Node by itself, so the
machine needs no Node for these.

```sh
bazel test //...                          # unit tests, and the permission and network checks
bazel build //:zip --//:version=1.2.3     # bazel-bin/tab-shortcuts-1.2.3.zip
```

The same source and version build the same zip, byte for byte.

The end-to-end test needs Node 22 and npm, since Puppeteer downloads its
own Chrome:

```sh
npm ci
npm run test:e2e    # loads the extension into Chrome for Testing
```

It opens six local test tabs with two of them pinned, uses each of the
popup's buttons as a person would (they run the same code as the
shortcuts, which a test cannot press), and checks which tabs are left
and which are pinned. On Ubuntu 23.10 and later, Chrome's sandbox cannot
start without user namespaces; run it with `E2E_NO_SANDBOX=1`. It loads
`extension/` unless `E2E_EXTENSION_DIR` names another folder; the release
points it at the unzipped zip.

## License

Apache 2.0; see [LICENSE](LICENSE).

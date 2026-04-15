# YouTube Privacy Guard

YouTube Privacy Guard is a Chrome extension that blurs sensitive content on YouTube pages, including thumbnails, video titles, active videos, Shorts previews, profile images, and optional search suggestions.

## Features

- Master on/off toggle for all protections.
- Separate toggles for each blur type.
- Smooth hover-to-reveal behavior for thumbnails, titles, profile pictures, and search text.
- Watch-page video blur with an overlay button (`👁 Reveal Video` / `🙈 Hide Video`).
- SPA-safe behavior via `MutationObserver` so changes persist while navigating YouTube.
- Settings are synced with `chrome.storage.sync` across signed-in Chrome devices.

## Project Structure

```text
youtube-privacy-guard/
├── manifest.json
├── background.js
├── content.css
├── content.js
├── popup.html
├── popup.css
├── popup.js
├── generate-icons.js
└── icons/
    ├── icon16.png
    ├── icon32.png
    ├── icon48.png
    └── icon128.png
```

## Load in Chrome (Unpacked)

1. Open `chrome://extensions/`.
2. Enable **Developer mode** (top-right).
3. Click **Load unpacked**.
4. Select the `youtube-privacy-guard` folder.
5. Pin the extension and open YouTube.

## Generate Icons

The extension includes a Node script that draws shield/eye icons.

1. In the extension folder, install dependency:
   - `npm install canvas`
2. Run:
   - `node generate-icons.js`
3. Confirm these files exist in `icons/`:
   - `icon16.png`, `icon32.png`, `icon48.png`, `icon128.png`

If you want custom branding, replace those files with your own PNG icons while keeping the same filenames.

## Updating YouTube Selectors

YouTube frequently changes internal markup. If blur stops working for specific areas:

1. Open `content.js`.
2. Locate the selector mapping block at the top (`SELECTOR_MAP` and comment header).
3. Update the relevant selectors for the failing target.
4. Reload the extension from `chrome://extensions/` and retest.

Tip: use DevTools selector checks like:

```js
document.querySelectorAll("YOUR_SELECTOR_HERE")
```

## Known Limitations

- YouTube DOM changes can break selectors until updated.
- Some delayed/lazy-rendered elements may blur a moment after they appear.
- The reveal/hide player button is designed for the standard player area and may need tweaking for future YouTube layout changes.
- Search suggestion selectors vary by experiment flags and account state.

## Debugging

All scripts log with a `[YPG]` prefix. Useful places:

- Service worker logs (`background.js`) from the extension details page.
- Content logs on YouTube pages via DevTools console.
- Popup logs via popup DevTools (`Inspect popup`).

# Google Photos Cleaner

This Chrome/Edge extension injects a content script into Google Photos (photos.google.com) and listens to popup actions. The current action replaces the displayed photo with the extension icon to verify DOM access and messaging reliability.

 
## Quick Setup
 
1. Open Chrome/Edge.
2. Navigate to `chrome://extensions/` or `edge://extensions/`.
3. Enable **Developer mode**.
4. Click **Load unpacked** and select this folder: `photo-deletor-extension`.

 
 
## Targeted Testing Steps
Follow these steps to validate injection, messaging, and SPA resilience.

### A. Injection & Permissions
 
- Open `https://photos.google.com/` and sign in.
- Confirm the extension icon appears in the toolbar.
- Open DevTools (F12) on the Photos tab and select the **Console**.
- Expect logs from `content.js` (e.g., startup messages and observer hooks).

### B. Popup → Content Messaging
 
- In Google Photos, open a single photo view.
- Click the extension icon to open the popup.
- Click the button (currently triggers `REPLACE_IMAGE`).
- In Console, verify logs like:
  - `Received message: REPLACE_IMAGE`
  - Selector checks for the main image (FOUND/MISS)
  - `replaceCurrentImage: success` or failure details
- Visual: the main photo should visually change to the extension icon (`icons/icon128.png`).

### C. SPA Navigation Resilience
 
- Use the left/right navigation arrows or press arrow keys to move to another photo.
- Watch Console logs for history hooks and MutationObserver activity:
  - `pushState/replaceState/popstate` messages
  - `MutationObserver triggered` and subsequent image checks
- Trigger the popup action again to confirm the new photo is found and replaced.

### D. Multi-Layout Coverage
 
- Test from different views:
  - Single photo detail view
  - Lightbox modal (if present)
  - Slideshow or keyboard navigation
- Confirm selectors still locate the main image; note any missed cases.

### E. Edge Browser Check
 
- Load unpacked on Edge (`edge://extensions/`).
- Repeat A–D on Edge using the same account.

 
 
## Quick Troubleshooting
- No logs in Console:
  - Ensure `manifest.json` has `content_scripts` matching `https://photos.google.com/*`.
  - Reload the extension and refresh the Photos tab.
- Popup says "Couldn’t find content script":
  - The tab must match `photos.google.com` and have the content script injected.
  - Try reloading the Photos tab or navigating into a single photo.
- Works on first photo but not after navigation:
  - Confirm history hook and mutation logs appear when moving between photos.
  - If logs show repeated `img not found`, the Google Photos DOM may have changed; broaden selectors.
- Icon path errors:
  - Verify resource URLs point to `icons/icon128.png` (relative to extension root).
- Interference from other extensions:
  - Temporarily disable other content-injecting or ad-blocking extensions and retry.

 
 
## Known Limitations
- Google Photos is a dynamic SPA and may change class names/structure. Selectors may need updates over time.
- Current action is image replacement for verification. Deleting to trash would require additional robust UI detection and confirmation handling.

 
## Next Steps (Optional)
- Add a toast UI in `content.js` to show success/failure without DevTools.
- Expand selector strategy and consider shadow DOM traversal if Google Photos encapsulates key nodes.
- Reintroduce a safe "Delete to Trash" action behind a separate popup control with double-confirm.

 
## Development Notes
- Files of interest:
  - `manifest.json`: MV3 configuration, content script injection
  - `popup.js`: Sends actions to the active tab
  - `content.js`: Handles messages, finds main photo, replaces the image, observes navigation/DOM changes
  - `background.js`: Optional injection path (currently not used by the popup)
- Use the Console logs to trace behavior across navigation and DOM changes.


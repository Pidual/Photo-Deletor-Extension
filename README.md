# Photo Deleter for Google Photos

A Chrome/Edge extension that cleans up your Google Photos library with a neural network that runs **entirely in your browser**. It walks through your photos one by one, keeps the ones worth remembering (friends, parties, trips) and moves the clutter (memes, screenshots, junk) to the Trash.

No cloud, no API calls, no accounts: your photos never leave your computer.

<img width="1172" height="820" alt="Photo Deleter popup in Google Photos" src="https://github.com/user-attachments/assets/bb758bdd-3b3e-4009-80c9-d4e48d0c3439" />

> [!NOTE]
> This repository contains only the extension, which hosts the trained model. The model was trained in a separate repository: **[Photo-Deletor-Model-Training](https://github.com/Pidual/Photo-Deletor-Model-Training)**.

## Demo

https://github.com/user-attachments/assets/0e008300-4f26-4b62-9c40-f941e50bbda1

![Watch the full demo on YouTube](https://youtu.be/rt3Lrnmz_Lc)

## Features

- **Local AI:** a fine-tuned ResNet50 model runs on-device through ONNX Runtime Web (WebAssembly).
- **Keeps running when the popup closes:** the cleanup runs in the background, so you can close the popup and reopen it later to check progress.
- **You choose how cautious it is:** only delete when the AI is at least X% sure (80% by default).
- **See what it decides:** each photo's verdict is shown in bold (**KEEP** / **DELETE**) next to a thumbnail of the exact image the AI scored.
- **"Deleted this run" gallery** so you can review everything that went to the Trash.
- **Test mode:** check what the AI thinks of a photo without deleting anything.
- **Safe by design:** photos go to the Google Photos Trash (restorable). Videos are skipped, and the run stops with a clear message if anything on the page doesn't behave as expected.
- **English and Spanish** interface.

## Installation

The extension isn't on the Chrome Web Store yet, so install it in developer mode:

1. Clone or download this repository.
2. Open `chrome://extensions/` (or `edge://extensions/`).
3. Turn on **Developer mode**.
4. Click **Load unpacked** and select the repository folder.
5. Pin the extension to the toolbar.

> The model file is ~94 MB. If you clone with Git, make sure `model/resnet50_fine_tunned_classifier.onnx` downloaded completely.

## How to use

1. Open [Google Photos](https://photos.google.com/) and click the extension icon.
2. Open the photo you want to start from, or click **Start from newest photo**. Cleaning moves forward from there.
3. *(Optional)* Click **Test on this photo** to see what the AI would do, without deleting anything.
4. Choose **how many photos to check** and **how sure** the AI must be before deleting.
5. Click **Start cleaning**. You can close the popup; click **Stop** at any time.
6. When it's done, review the **Deleted this run** thumbnails. Anything you want back can be restored from the Google Photos Trash.

The first run takes a few seconds while the model loads.

## How it works

```
popup (controls & status)
   │  start / stop / test
   ▼
background service worker ──── drives the Google Photos tab (find photo, trash, next)
   │  classify this image
   ▼
offscreen document ─────────── ONNX Runtime + ResNet50 → keep / delete + thumbnail
```

- **`popup.*`, `ui.js`, `i18n.js`**: the interface. It only sends commands and shows the job state, so it can be closed and reopened mid-run.
- **`background.js`**: the cleanup loop. For each photo it reads the image on screen, asks the model for a verdict, then clicks Trash → Confirm, or Next. Each delete is verified by checking that the photo actually left the screen.
- **`offscreen.html` / `offscreen.js` / `model.js`**: a hidden page that hosts the model, because service workers have no canvas. Images are resized to 512×512, normalized with ImageNet statistics and classified as *memorable* or *forgettable*.
- **`ort/`**: ONNX Runtime Web 1.17.
- **`model/`**: the fine-tuned ResNet50 classifier, trained in [Photo-Deletor-Model-Training](https://github.com/Pidual/Photo-Deletor-Model-Training).

## Privacy

All processing happens locally in your browser. No images, URLs, results or any other data are sent anywhere. See the [privacy policy](privacy-policy.html).

## Troubleshooting

| Problem | Fix |
| --- | --- |
| Changes don't seem to apply | Click the reload ↻ icon on the extension card in `chrome://extensions`, then refresh the Google Photos tab. |
| "Couldn't find the Trash button" | Google Photos may have changed its layout or uses a language that isn't supported yet. Right-click the trash icon → **Inspect**, and add its `aria-label` to `SELECTORS.trashLabels` in `background.js`. |
| "Couldn't find a photo on the page" | Make sure a single photo is open (not the grid), then try again. |
| Want to see what's happening | Open **Details** at the bottom of the popup, or click **service worker** on the extension card for the full log. |

## Limitations

- Google Photos changes its page structure from time to time; button detection may need updates.
- Button labels are recognized in English and Spanish.
- The model is large (~94 MB) and runs on the CPU, so each photo takes a moment.
- The AI judges each photo on its own; it doesn't detect duplicates.

## Roadmap

- Smaller, faster model (MobileNet / EfficientNet, quantized).
- Review mode: scan first, then confirm which photos to delete.
- More interface languages.

## Disclaimer

This project is not affiliated with, endorsed by, or sponsored by Google. It automates the Google Photos website the way a person would, and it deletes photos, so **use it at your own risk**: try it on a few photos first and use a high confidence setting. Deleted photos stay in the Google Photos Trash, where you can restore them.

## Author

Made with effort and passion by [@Pidual](https://github.com/Pidual).

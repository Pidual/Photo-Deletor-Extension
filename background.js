// =============================================================================
// BACKGROUND.JS - Runs the classify/delete loop independently of the popup
// =============================================================================
// The popup closes as soon as it loses focus, so it only sends commands and
// renders state. The loop lives here, and inference runs in an offscreen
// document (service workers have no canvas to decode images).
// =============================================================================

// --- Configuration -----------------------------------------------------------
const OFFSCREEN_URL = "offscreen.html";
const KEEPALIVE_INTERVAL = 20000; // Service worker idles out after 30s
const MAX_LOG_LINES = 200;

const DELAYS = {
    poll: 300,           // Between page checks while waiting for something
    afterConfirm: 300    // Let Google Photos start its delete animation
};

const RETRY = {
    findPhoto: 12,       // ~3.6s for a photo to load
    navigation: 15,      // ~4.5s for the URL to change
    trashButton: 3,
    confirmDialog: 8,
    maxSkips: 10         // Max consecutive skipped items before stopping
};

/** Google Photos single photo view (also inside albums) */
const PHOTO_VIEW_PATTERN = /^https:\/\/photos\.google\.com\/(.*\/)?photo\/.+/;

// --- Selectors (Google Photos) -----------------------------------------------
// Class names are obfuscated and change, so buttons are matched by their
// accessible labels in every supported UI language.
const SELECTORS = {
    image: 'img.BiCYpc',
    confirmDelete: 'button[data-mdc-dialog-action="EBS5u"]',
    trashLabels: [
        "Move to trash", "Move to bin", "Delete",
        "Mover a la papelera", "Mover a papelera", "Eliminar", "Borrar"
    ],
    // Fallback: a button with this text inside the confirmation dialog
    confirmText: "trash|bin|delete|papelera|eliminar|borrar",
    nextLabels: [
        "View next photo", "Next photo", "Next",
        "Ver la foto siguiente", "Ver siguiente foto", "Foto siguiente", "Siguiente"
    ]
};

// --- State -------------------------------------------------------------------
// Mirrored to the popup on every change so it can be reopened mid-job
const state = {
    running: false,
    stopRequested: false,
    mode: null,          // "test" | "clean"
    status: null,        // { key, params, kind: "busy" | "done" | "error" }
    current: 0,
    total: 0,
    kept: 0,
    deleted: 0,
    skipped: 0,
    previewSrc: null,
    lastResult: null,
    log: []
};

let modelReady = false;

/**
 * An expected failure, shown to the user as a translated message
 */
class JobError extends Error {
    constructor(key) {
        super(key);
        this.key = key;
    }
}

// =============================================================================
// POPUP COMMUNICATION
// =============================================================================

/**
 * Sends a message to the popup, ignoring the error when it is closed
 */
function notifyPopup(message) {
    chrome.runtime.sendMessage({ target: "popup", ...message }).catch(() => {});
}

function publishState() {
    const { log, ...rest } = state;
    notifyPopup({ type: "STATE", state: rest });
}

/**
 * Sets the user-facing status line (a translation key for the popup)
 */
function setStatus(key, params = {}, kind = "busy") {
    state.status = { key, params, kind };
    publishState();
}

/**
 * Logs a message to the console, the log buffer and the popup
 * @param {string} msg - Message to log
 */
function debugLog(msg) {
    console.log(msg);
    state.log.push(msg);
    if (state.log.length > MAX_LOG_LINES) state.log.shift();
    notifyPopup({ type: "LOG", msg });
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.target !== "background") return false;

    switch (request.type) {
        case "GET_STATE":
            sendResponse(state);
            break;
        case "LOG":
            debugLog(request.msg);
            break;
        case "CLASSIFY_CURRENT":
            if (!state.running) runExclusive("test", () => testCurrentPhoto(request.tabId, request.threshold));
            break;
        case "START":
            if (!state.running) runExclusive("clean", () => cleanPhotos(request.tabId, request.count, request.threshold));
            break;
        case "STOP":
            if (state.running && !state.stopRequested) {
                state.stopRequested = true;
                debugLog("[Stop] Stopping after current photo...");
                setStatus("statusStopping");
            }
            break;
    }
    return false;
});

// =============================================================================
// JOB LIFECYCLE
// =============================================================================

/**
 * Runs a job while keeping the service worker alive, one job at a time
 * @param {string} mode - "test" or "clean"
 * @param {Function} job - Async job to run
 */
async function runExclusive(mode, job) {
    Object.assign(state, {
        running: true,
        stopRequested: false,
        mode,
        current: 0,
        total: 0,
        kept: 0,
        deleted: 0,
        skipped: 0,
        previewSrc: null,
        lastResult: null
    });
    setStatus("statusFinding");

    // Extension API calls reset the idle timer; this covers long model loads
    const keepAlive = setInterval(chrome.runtime.getPlatformInfo, KEEPALIVE_INTERVAL);
    try {
        await job();
    } catch (err) {
        debugLog(`[Error] ${err.message}`);
        if (err instanceof JobError) {
            state.status = { key: err.key, params: {}, kind: "error" };
        } else if (/no tab with id|cannot access|tab was closed/i.test(err.message)) {
            state.status = { key: "errTabClosed", params: {}, kind: "error" };
        } else {
            state.status = { key: "errGeneric", params: { msg: err.message }, kind: "error" };
        }
    } finally {
        clearInterval(keepAlive);
        state.running = false;
        state.stopRequested = false;
        publishState();
    }
}

// =============================================================================
// INFERENCE (OFFSCREEN DOCUMENT)
// =============================================================================

let creatingOffscreen = null;

/**
 * Creates the offscreen document that hosts the model, if it doesn't exist
 */
async function ensureOffscreenDocument() {
    if (await chrome.offscreen.hasDocument()) return;

    modelReady = false;
    if (!creatingOffscreen) {
        creatingOffscreen = chrome.offscreen.createDocument({
            url: OFFSCREEN_URL,
            reasons: ["DOM_SCRAPING"],
            justification: "Decode photos on a canvas and run the local ONNX classifier"
        }).finally(() => { creatingOffscreen = null; });
    }
    await creatingOffscreen;
}

/**
 * Sends a request to the offscreen document and unwraps its response
 */
async function askOffscreen(message) {
    await ensureOffscreenDocument();

    const response = await chrome.runtime.sendMessage({ target: "offscreen", ...message });
    if (!response?.success) {
        throw new Error(response?.error || "No response from model");
    }
    return response.data;
}

/**
 * Classifies an image, loading the model first if needed
 * @param {string} imageSrc - Image source URL
 * @returns {Promise<Object>} Classification result
 */
async function classifyImage(imageSrc) {
    await ensureOffscreenDocument();

    if (!modelReady) {
        const previousStatus = state.status;
        setStatus("statusLoadingModel");
        await askOffscreen({ type: "LOAD" });
        modelReady = true;
        state.status = previousStatus;
        publishState();
    }

    return askOffscreen({ type: "CLASSIFY", imageSrc });
}

/**
 * Decides whether a photo should be deleted at the given confidence threshold
 */
function decide(result, threshold) {
    const willDelete = result.probOlvidable >= threshold;
    return {
        isMemborable: result.isMemborable,
        confidence: result.confidence,
        probOlvidable: result.probOlvidable,
        willDelete
    };
}

// =============================================================================
// PAGE INSPECTION
// =============================================================================

/**
 * Reads the photo currently shown in the tab
 * @returns {Promise<{url: string, src: string|null, isVideo: boolean}>}
 */
async function readPhoto(tabId) {
    const [{ result }] = await chrome.scripting.executeScript({
        target: { tabId },
        func: (imageSelector) => {
            const isVisible = (el) => {
                const rect = el.getBoundingClientRect();
                const style = window.getComputedStyle(el);
                return (
                    rect.width > 0 &&
                    rect.height > 0 &&
                    style.display !== "none" &&
                    style.visibility !== "hidden" &&
                    style.opacity !== "0" &&
                    rect.bottom > 0 &&
                    rect.right > 0 &&
                    rect.top < window.innerHeight &&
                    rect.left < window.innerWidth
                );
            };
            const video = Array.from(document.querySelectorAll("video")).find(isVisible);
            const img = Array.from(document.querySelectorAll(imageSelector)).find(isVisible);
            return { url: location.href, src: img ? img.src : null, isVideo: !!video };
        },
        args: [SELECTORS.image]
    });
    return result;
}

/**
 * Waits until a photo (different from previousSrc) or a video is showing
 * @param {number} tabId - Chrome tab ID
 * @param {string|null} previousSrc - Image that was showing before navigating
 * @returns {Promise<Object>} The last page reading, ready or not
 */
async function waitForPhoto(tabId, previousSrc = null) {
    let photo;
    for (let attempt = 1; attempt <= RETRY.findPhoto; attempt++) {
        photo = await readPhoto(tabId);
        const isNewImage = photo.src && photo.src !== previousSrc;
        if (photo.isVideo || isNewImage || !PHOTO_VIEW_PATTERN.test(photo.url)) {
            return photo;
        }
        await wait(DELAYS.poll);
    }
    debugLog(`[Warning] Photo didn't load in time`);
    return photo;
}

/**
 * Waits for the tab to move away from a URL
 * @returns {Promise<string|null>} The new URL, or null if it never changed
 */
async function waitForUrlChange(tabId, previousUrl) {
    for (let attempt = 1; attempt <= RETRY.navigation; attempt++) {
        await wait(DELAYS.poll);
        const tab = await chrome.tabs.get(tabId);
        if (tab.url !== previousUrl) return tab.url;
    }
    return null;
}

// =============================================================================
// PAGE ACTIONS
// =============================================================================

/**
 * Clicks the first visible button whose aria-label matches one of labels
 * @returns {Promise<boolean>} Whether a button was clicked
 */
async function clickByLabel(tabId, labels) {
    const [{ result }] = await chrome.scripting.executeScript({
        target: { tabId },
        func: (labels) => {
            const wanted = labels.map(label => label.toLowerCase());
            const btn = Array.from(document.querySelectorAll('button[aria-label], [role="button"][aria-label]'))
                .find(el => {
                    const rect = el.getBoundingClientRect();
                    const label = el.getAttribute("aria-label").trim().toLowerCase();
                    return rect.width > 0 && rect.height > 0 && wanted.includes(label);
                });
            if (btn) btn.click();
            return !!btn;
        },
        args: [labels]
    });
    return result;
}

/**
 * Clicks the confirm button in the "Move to trash" dialog
 * @returns {Promise<boolean>} Whether a button was clicked
 */
async function clickConfirmDelete(tabId) {
    const [{ result }] = await chrome.scripting.executeScript({
        target: { tabId },
        func: (selector, textPattern) => {
            const isVisible = (el) => {
                const rect = el.getBoundingClientRect();
                return rect.width > 0 && rect.height > 0;
            };

            let btn = Array.from(document.querySelectorAll(selector)).find(isVisible);
            if (!btn) {
                const matchesText = new RegExp(textPattern, "i");
                const dialogs = document.querySelectorAll('[role="dialog"], [role="alertdialog"]');
                for (const dialog of dialogs) {
                    if (!isVisible(dialog)) continue;
                    btn = Array.from(dialog.querySelectorAll("button"))
                        .find(b => isVisible(b) && matchesText.test(b.textContent));
                    if (btn) break;
                }
            }
            if (btn) btn.click();
            return !!btn;
        },
        args: [SELECTORS.confirmDelete, SELECTORS.confirmText]
    });
    return result;
}

/**
 * Repeats an action until it returns true
 */
async function retry(action, attempts) {
    for (let attempt = 1; attempt <= attempts; attempt++) {
        if (await action()) return true;
        if (attempt < attempts) await wait(DELAYS.poll);
    }
    return false;
}

/**
 * Moves the current photo to trash, failing loudly if any step doesn't happen
 */
async function deleteCurrentPhoto(tabId) {
    if (!await retry(() => clickByLabel(tabId, SELECTORS.trashLabels), RETRY.trashButton)) {
        throw new JobError("errTrashButton");
    }
    if (!await retry(() => clickConfirmDelete(tabId), RETRY.confirmDialog)) {
        throw new JobError("errConfirm");
    }
    await wait(DELAYS.afterConfirm);
}

/**
 * Goes to the next photo
 * @returns {Promise<string|null>} The new URL, or null at the end of the library
 */
async function goToNextPhoto(tabId, currentUrl) {
    const clicked = await clickByLabel(tabId, SELECTORS.nextLabels);
    if (!clicked) {
        // No next button: try the keyboard shortcut before giving up
        await chrome.scripting.executeScript({
            target: { tabId },
            func: () => {
                const event = { key: "ArrowRight", code: "ArrowRight", keyCode: 39, bubbles: true };
                document.activeElement.dispatchEvent(new KeyboardEvent("keydown", event));
            }
        });
    }
    return waitForUrlChange(tabId, currentUrl);
}

/**
 * Utility: wait for specified milliseconds
 */
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// =============================================================================
// MAIN HANDLERS
// =============================================================================

/**
 * Classifies the currently visible photo without deleting anything
 */
async function testCurrentPhoto(tabId, threshold) {
    debugLog("Testing current photo...");

    const photo = await waitForPhoto(tabId);
    if (photo.isVideo || !photo.src) throw new JobError("errNoImage");

    state.previewSrc = photo.src;
    setStatus("statusTesting");

    const result = decide(await classifyImage(photo.src), threshold);
    state.lastResult = result;
    debugLog(`Result: ${result.willDelete ? "DELETE" : "KEEP"} (forgettable ${(result.probOlvidable * 100).toFixed(1)}%)`);

    const pct = (result.confidence * 100).toFixed(0);
    if (result.willDelete) {
        setStatus("statusTestDelete", { pct }, "done");
    } else if (result.isMemborable) {
        setStatus("statusTestKeep", { pct }, "done");
    } else {
        setStatus("statusTestUnsure", { pct, threshold: Math.round(threshold * 100) }, "done");
    }
}

/**
 * Walks forward through photos, deleting the ones the model is sure about
 */
async function cleanPhotos(tabId, count, threshold) {
    debugLog(`=== Starting: ${count} photos, delete at >= ${Math.round(threshold * 100)}% ===`);
    state.total = count;

    let photo = await waitForPhoto(tabId);
    if (!PHOTO_VIEW_PATTERN.test(photo.url) || (!photo.isVideo && !photo.src)) {
        throw new JobError("errNoImage");
    }

    let consecutiveSkips = 0;
    let endKey = "statusDone";

    for (let i = 0; i < count; i++) {
        if (state.stopRequested) {
            endKey = "statusStopped";
            break;
        }

        state.current = i + 1;
        setStatus("statusChecking", { current: state.current, total: count });
        debugLog(`--- Photo ${i + 1}/${count} ---`);

        if (photo.isVideo || !photo.src) {
            // Videos (and photos that never loaded) are left alone
            state.skipped++;
            consecutiveSkips++;
            debugLog(photo.isVideo ? "-> Video, skipping" : "-> Photo didn't load, skipping");
            if (consecutiveSkips >= RETRY.maxSkips) throw new JobError("errTooManySkips");
        } else {
            consecutiveSkips = 0;
            state.previewSrc = photo.src;
            state.lastResult = null;
            publishState();

            const result = decide(await classifyImage(photo.src), threshold);
            state.lastResult = result;
            const pct = (result.probOlvidable * 100).toFixed(1);

            if (result.willDelete) {
                debugLog(`-> Forgettable (${pct}%), deleting`);
                await deleteCurrentPhoto(tabId);

                // Google Photos shows the next photo by itself after a delete
                const nextUrl = await waitForUrlChange(tabId, photo.url);
                if (!nextUrl) throw new JobError("errDeleteFailed");

                state.deleted++;
                publishState();

                if (!PHOTO_VIEW_PATTERN.test(nextUrl)) {
                    endKey = "statusEnd";
                    break;
                }
                photo = await waitForPhoto(tabId, photo.src);
                continue;
            }

            debugLog(`-> Keeping (forgettable ${pct}%)`);
            state.kept++;
            publishState();
        }

        // Move on, also after the last photo so the next run starts fresh
        const nextUrl = await goToNextPhoto(tabId, photo.url);
        if (!nextUrl || !PHOTO_VIEW_PATTERN.test(nextUrl)) {
            endKey = "statusEnd";
            break;
        }
        photo = await waitForPhoto(tabId, photo.src);
    }

    const summary = { deleted: state.deleted, kept: state.kept };
    debugLog(`=== Finished: ${state.deleted} deleted, ${state.kept} kept, ${state.skipped} skipped ===`);
    setStatus(endKey, summary, "done");
}

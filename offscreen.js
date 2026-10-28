// =============================================================================
// OFFSCREEN.JS - Hosts the model so inference survives the popup closing
// =============================================================================

// --- Configuration -----------------------------------------------------------
ort.env.wasm.numThreads = 1;
ort.env.wasm.proxy = false;

/**
 * Forwards model logs to the background, which relays them to the popup
 * @param {string} msg - Message to log
 */
function debugLog(msg) {
    console.log(msg);
    chrome.runtime.sendMessage({ target: "background", type: "LOG", msg }).catch(() => {});
}

// Handle classification requests from the background
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.target !== "offscreen") return false;

    if (request.type === "LOAD") {
        loadModel()
            .then(() => sendResponse({ success: true }))
            .catch(err => sendResponse({ success: false, error: err.message }));
        return true;
    }

    if (request.type === "CLASSIFY") {
        classifyImage(request.imageSrc)
            .then(result => sendResponse({ success: true, data: result }))
            .catch(err => sendResponse({ success: false, error: err.message }));
        return true; // Keep channel open for async response
    }
    return false;
});

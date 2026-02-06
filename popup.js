// =============================================================================
// POPUP.JS - Main Extension Controller
// =============================================================================

// --- Configuration -----------------------------------------------------------
ort.env.wasm.numThreads = 1;
ort.env.wasm.proxy = false;

const MODEL_URL = chrome.runtime.getURL('model/resnet50_classifier.onnx');
const DELAYS = {
    confirmDialog: 500,
    afterAction: 1000
};

// --- State -------------------------------------------------------------------
let model = null;

// --- Selectors (Google Photos) -----------------------------------------------
const SELECTORS = {
    image: 'img.BiCYpc',
    deleteButton: '[aria-label="Mover a la papelera"]',
    confirmDelete: 'button[data-mdc-dialog-action="EBS5u"]',
    nextButtons: [
        '[aria-label="Ver la foto siguiente"]',
        '[aria-label="Ver siguiente foto"]',
        '[aria-label="View next photo"]',
        '[aria-label="Siguiente"]',
        '[aria-label="Next"]'
    ]
};

// --- Event Listeners ---------------------------------------------------------
document.getElementById("classifyBtn").addEventListener("click", classifyCurrentImage);
document.getElementById("sequentialBtn").addEventListener("click", classifyAndDeleteSequentially);

// =============================================================================
// IMAGE DETECTION
// =============================================================================

/**
 * Gets the visible image src from the active tab
 * @param {number} tabId - Chrome tab ID
 * @returns {Promise<string|null>} Image source URL or null
 */
async function getCurrentImageSrc(tabId) {
    const [{ result: imageSrc }] = await chrome.scripting.executeScript({
        target: { tabId },
        func: () => {
            const isVisible = (img) => {
                const rect = img.getBoundingClientRect();
                const style = window.getComputedStyle(img);
                return (
                    rect.width > 0 &&
                    rect.height > 0 &&
                    style.display !== "none" &&
                    style.visibility !== "hidden" &&
                    style.opacity !== "0" &&
                    rect.bottom > 0 &&
                    rect.right > 0 &&
                    rect.top < (window.innerHeight || document.documentElement.clientHeight) &&
                    rect.left < (window.innerWidth || document.documentElement.clientWidth)
                );
            };
            const img = Array.from(document.querySelectorAll('img.BiCYpc')).find(isVisible);
            return img ? img.src : null;
        }
    });

    if (!imageSrc) {
        debugLog("No se encontró imagen visible");
    }

    return imageSrc;
}

// =============================================================================
// PAGE ACTIONS
// =============================================================================

/**
 * Clicks the delete button on the current photo
 */
async function clickDeleteButton(tabId) {
    await chrome.scripting.executeScript({
        target: { tabId },
        func: (selector) => {
            const btn = document.querySelector(selector);
            if (btn) btn.click();
        },
        args: [SELECTORS.deleteButton]
    });
}

/**
 * Clicks the confirm delete button in the dialog
 */
async function clickConfirmDelete(tabId) {
    await chrome.scripting.executeScript({
        target: { tabId },
        func: (selector) => {
            const btn = document.querySelector(selector);
            if (btn) btn.click();
        },
        args: [SELECTORS.confirmDelete]
    });
}

/**
 * Clicks the next photo button
 */
async function clickNextPhoto(tabId) {
    await chrome.scripting.executeScript({
        target: { tabId },
        func: (selectors) => {
            for (const sel of selectors) {
                const btn = document.querySelector(sel);
                if (btn) {
                    btn.click();
                    return true;
                }
            }
            return false;
        },
        args: [SELECTORS.nextButtons]
    });
}

/**
 * Utility: wait for specified milliseconds
 */
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// =============================================================================
// MAIN HANDLERS
// =============================================================================

/**
 * Classifies the currently visible photo
 */
async function classifyCurrentImage() {
    debugLog("Clasificando foto actual...");
    
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const imageSrc = await getCurrentImageSrc(tab.id);
    
    if (!imageSrc) return;

    debugLog("Imagen: " + imageSrc.substring(0, 60) + "...");
    await classifyImage(imageSrc);
}

/**
 * Sequentially classifies and deletes forgettable photos
 */
async function classifyAndDeleteSequentially() {
    const count = parseInt(document.getElementById("countInput").value, 10) || 10;
    
    debugLog(`=== Iniciando: ${count} fotos ===`);
    
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    let deleted = 0;
    let kept = 0;

    for (let i = 0; i < count; i++) {
        debugLog(`--- Foto ${i + 1}/${count} ---`);

        const imageSrc = await getCurrentImageSrc(tab.id);
        if (!imageSrc) break;

        // Classify
        let result;
        try {
            result = await classifyImage(imageSrc);
        } catch (err) {
            debugLog("Error: " + err.message);
            break;
        }

        if (!result.isMemborable) {
            // FORGETTABLE - Delete
            debugLog("→ OLVIDABLE - Borrando...");
            
            await clickDeleteButton(tab.id);
            await wait(DELAYS.confirmDialog);
            await clickConfirmDelete(tab.id);
            await wait(DELAYS.afterAction);
            
            deleted++;
        } else {
            // MEMORABLE - Keep and go next
            debugLog("→ MEMORABLE - Siguiente...");
            
            await clickNextPhoto(tab.id);
            await wait(DELAYS.afterAction);
            
            kept++;
        }
    }

    debugLog(`=== Completado: ${deleted} borradas, ${kept} conservadas ===`);
}


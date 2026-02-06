// =============================================================================
// POPUP.JS - Main Extension Controller
// =============================================================================

// --- Configuration -----------------------------------------------------------
ort.env.wasm.numThreads = 1;
ort.env.wasm.proxy = false;

const MODEL_URL = chrome.runtime.getURL('model/resnet50_fine_tunned_classifier.onnx');
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

// --- Check Tab on Load -------------------------------------------------------
document.addEventListener('DOMContentLoaded', checkCurrentTab);

// =============================================================================
// TAB VALIDATION
// =============================================================================

/**
 * URL pattern for Google Photos single photo view
 * Matches: https://photos.google.com/u/X/photo/... or https://photos.google.com/photo/...
 */
const GOOGLE_PHOTOS_PATTERN = /^https:\/\/photos\.google\.com\/(u\/\d+\/)?photo\/.+/;

/**
 * Checks if the current tab is a valid Google Photos photo view
 */
async function checkCurrentTab() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const isValidTab = GOOGLE_PHOTOS_PATTERN.test(tab.url);
    
    updateTabStatus(isValidTab, tab.url);
}

/**
 * Updates the UI based on tab validity
 * @param {boolean} isValid - Whether the tab is a valid Google Photos photo
 * @param {string} url - Current tab URL
 */
function updateTabStatus(isValid, url) {
    const classifyBtn = document.getElementById("classifyBtn");
    const sequentialBtn = document.getElementById("sequentialBtn");
    const helpSection = document.querySelector(".help-section");
    const statusIndicator = document.getElementById("tabStatus");
    
    if (isValid) {
        // Valid tab - enable buttons
        classifyBtn.disabled = false;
        sequentialBtn.disabled = false;
        if (helpSection) helpSection.style.display = "none";
        if (statusIndicator) {
            statusIndicator.className = "tab-status valid";
            statusIndicator.innerHTML = `
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
                </svg>
                <span data-i18n="tabValid">Ready! Photo detected</span>
            `;
        }
        debugLog("✓ Valid Google Photos tab detected");
    } else {
        // Invalid tab - disable buttons
        classifyBtn.disabled = true;
        sequentialBtn.disabled = true;
        if (helpSection) helpSection.style.display = "block";
        if (statusIndicator) {
            statusIndicator.className = "tab-status invalid";
            statusIndicator.innerHTML = `
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
                </svg>
                <span data-i18n="tabInvalid">Open a photo in Google Photos</span>
            `;
        }
        debugLog("✗ Not a Google Photos photo view");
    }
    
    // Re-apply translations if available
    if (typeof applyTranslations === 'function') {
        applyTranslations();
    }
}

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
    hideResultBadge();
    debugLog("Clasificando foto actual...");
    
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const imageSrc = await getCurrentImageSrc(tab.id);
    
    if (!imageSrc) return;

    debugLog("Imagen: " + imageSrc.substring(0, 60) + "...");
    const result = await classifyImage(imageSrc);
    
    // Show result badge
    showResultBadge(result.isMemborable, result.confidence);
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

    // Show stats bar
    updateStats(0, count, kept, deleted);

    for (let i = 0; i < count; i++) {
        debugLog(`--- Foto ${i + 1}/${count} ---`);
        updateStats(i + 1, count, kept, deleted);

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

        // Show result badge
        showResultBadge(result.isMemborable, result.confidence);

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

        // Update stats after action
        updateStats(i + 1, count, kept, deleted);
    }

    debugLog(`=== Completado: ${deleted} borradas, ${kept} conservadas ===`);
}


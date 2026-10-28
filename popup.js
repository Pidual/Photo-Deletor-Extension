// =============================================================================
// POPUP.JS - Remote control for the background job
// =============================================================================
// The popup closes whenever it loses focus, so the work happens in
// background.js. This file only sends commands and renders the job state,
// which lets the popup be reopened mid-job.
// =============================================================================

// --- Configuration -----------------------------------------------------------
const GOOGLE_PHOTOS_URL = "https://photos.google.com/";
const STORAGE_KEYS = {
    count: "photoDeletorCount",
    threshold: "photoDeletorThreshold"
};

/**
 * Google Photos single photo view
 * Matches: https://photos.google.com/u/X/photo/... or https://photos.google.com/album/X/photo/...
 */
const PHOTO_VIEW_PATTERN = /^https:\/\/photos\.google\.com\/(.*\/)?photo\/.+/;
const GOOGLE_PHOTOS_PATTERN = /^https:\/\/photos\.google\.com\//;

// --- State -------------------------------------------------------------------
let activeTab = null;
let tabState = "other";  // "other" | "grid" | "photo"
let setupMessageKey = null;  // Overrides the setup text after a failed action
let jobState = null;

// --- Elements ----------------------------------------------------------------
const countInput = document.getElementById("countInput");
const thresholdInput = document.getElementById("thresholdInput");
const classifyBtn = document.getElementById("classifyBtn");
const sequentialBtn = document.getElementById("sequentialBtn");

// --- Event Listeners ---------------------------------------------------------
classifyBtn.addEventListener("click", classifyCurrentImage);
sequentialBtn.addEventListener("click", toggleSequential);
document.getElementById("setupBtn").addEventListener("click", runSetupAction);

document.querySelectorAll(".chip").forEach(chip => {
    chip.addEventListener("click", () => {
        countInput.value = chip.dataset.count;
        saveSettings();
    });
});
countInput.addEventListener("input", saveSettings);
thresholdInput.addEventListener("input", saveSettings);

window.onLanguageChange = render;

document.addEventListener('DOMContentLoaded', async () => {
    loadSettings();
    await checkCurrentTab();
    await syncWithBackground();
});

// Google Photos is a single-page app: follow navigation while the popup is open
chrome.tabs.onUpdated.addListener((tabId) => {
    if (activeTab && tabId === activeTab.id) checkCurrentTab();
});

// =============================================================================
// SETTINGS
// =============================================================================

function loadSettings() {
    try {
        countInput.value = localStorage.getItem(STORAGE_KEYS.count) || countInput.value;
        thresholdInput.value = localStorage.getItem(STORAGE_KEYS.threshold) || thresholdInput.value;
    } catch (e) { /* Storage unavailable: keep defaults */ }
    renderSettings();
}

function saveSettings() {
    try {
        localStorage.setItem(STORAGE_KEYS.count, countInput.value);
        localStorage.setItem(STORAGE_KEYS.threshold, thresholdInput.value);
    } catch (e) { /* Storage unavailable: settings last for this session only */ }
    renderSettings();
}

function renderSettings() {
    document.getElementById("thresholdValue").textContent = `${thresholdInput.value}%`;
    document.querySelectorAll(".chip").forEach(chip => {
        chip.classList.toggle("active", chip.dataset.count === countInput.value);
    });
}

// =============================================================================
// TAB VALIDATION & SETUP
// =============================================================================

/**
 * Works out whether the active tab is a photo, the Google Photos grid, or neither
 */
async function checkCurrentTab() {
    [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const url = activeTab?.url || "";

    const newState = PHOTO_VIEW_PATTERN.test(url) ? "photo"
                   : GOOGLE_PHOTOS_PATTERN.test(url) ? "grid"
                   : "other";
    if (newState !== tabState) setupMessageKey = null;
    tabState = newState;

    render();
}

/**
 * Opens Google Photos, or opens the newest photo when already on the grid
 */
async function runSetupAction() {
    if (tabState === "other") {
        await chrome.tabs.create({ url: GOOGLE_PHOTOS_URL });
        window.close();
        return;
    }

    const [{ result: opened }] = await chrome.scripting.executeScript({
        target: { tabId: activeTab.id },
        func: () => {
            const link = Array.from(document.querySelectorAll('a[href*="/photo/"]'))
                .find(a => a.getBoundingClientRect().width > 0);
            if (link) link.click();
            return !!link;
        }
    });

    if (!opened) {
        setupMessageKey = "setupNoPhotoFound";
        render();
    }
    // On success, tabs.onUpdated re-checks the tab once the photo opens
}

// =============================================================================
// RENDERING
// =============================================================================

function render() {
    const isRunning = !!jobState?.running;

    // Setup card: guide the user to an open photo
    const setupCard = document.getElementById("setupCard");
    const needsSetup = tabState !== "photo" && !isRunning;
    setupCard.classList.toggle("visible", needsSetup);
    if (needsSetup) {
        document.getElementById("setupText").textContent =
            t(setupMessageKey || (tabState === "other" ? "setupNotPhotos" : "setupGrid"));
        document.getElementById("setupBtn").textContent =
            t(tabState === "other" ? "setupOpenPhotos" : "setupOpenFirst");
    }

    // Controls card: settings + start/stop
    const controlsCard = document.getElementById("controlsCard");
    controlsCard.classList.toggle("visible", tabState === "photo" || isRunning);

    countInput.disabled = isRunning;
    thresholdInput.disabled = isRunning;
    document.querySelectorAll(".chip").forEach(chip => { chip.disabled = isRunning; });
    classifyBtn.disabled = isRunning || tabState !== "photo";

    // Stop must stay available even if the user switched tabs mid-job
    const stopping = isRunning && jobState.stopRequested;
    sequentialBtn.disabled = stopping || (!isRunning && tabState !== "photo");
    sequentialBtn.classList.toggle("running", isRunning);
    sequentialBtn.querySelector("span").textContent = t(isRunning ? "stopAutoDelete" : "startAutoDelete");

    if (jobState) renderRun(jobState);
}

// =============================================================================
// BACKGROUND SYNC
// =============================================================================

/**
 * Restores the log and state of a job that may have started earlier
 */
async function syncWithBackground() {
    const state = await chrome.runtime.sendMessage({ target: "background", type: "GET_STATE" }).catch(() => null);
    if (!state) return;

    state.log.forEach(line => debugLog(line));
    jobState = state;
    render();
}

chrome.runtime.onMessage.addListener((message) => {
    if (message.target !== "popup") return false;

    if (message.type === "STATE") {
        jobState = message.state;
        render();
    }
    if (message.type === "LOG") debugLog(message.msg);
    return false;
});

function sendToBackground(message) {
    chrome.runtime.sendMessage({ target: "background", ...message }).catch(() => {});
}

// =============================================================================
// MAIN HANDLERS
// =============================================================================

/**
 * Asks the background to classify the currently visible photo
 */
function classifyCurrentImage() {
    sendToBackground({
        type: "CLASSIFY_CURRENT",
        tabId: activeTab.id,
        threshold: Number(thresholdInput.value) / 100
    });
}

/**
 * Starts the auto-delete job, or stops it if one is running
 */
function toggleSequential() {
    if (jobState?.running) {
        sendToBackground({ type: "STOP" });
        return;
    }

    const count = parseInt(countInput.value, 10) || 25;
    sendToBackground({
        type: "START",
        tabId: activeTab.id,
        count,
        threshold: Number(thresholdInput.value) / 100
    });
}

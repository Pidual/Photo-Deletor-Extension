// =============================================================================
// UI.JS - Debug, Visualization & UI Updates
// =============================================================================

// =============================================================================
// DEBUG LOGGING
// =============================================================================

/**
 * Logs a message to console and debug panel
 * @param {string} msg - Message to log
 */
function debugLog(msg) {
    console.log(msg);

    const debugDiv = document.getElementById("debug");
    if (debugDiv) {
        debugDiv.textContent += msg + "\n";
        debugDiv.scrollTop = debugDiv.scrollHeight;
    }
}

// =============================================================================
// RESULT DISPLAY
// =============================================================================

/**
 * Displays the photo being classified as a preview image
 * @param {string} imageSrc - Image source URL
 */
function showPreview(imageSrc) {
    const preview = document.getElementById("preview");
    const container = document.getElementById("previewContainer");

    if (preview && preview.src !== imageSrc) {
        preview.src = imageSrc;
    }
    if (container) {
        container.classList.add("visible");
    }
}

/**
 * Shows the classification result badge on the preview
 * @param {Object} result - { willDelete, isMemborable, confidence }
 */
function showResultBadge(result) {
    const resultDiv = document.getElementById("result");
    if (!resultDiv) return;

    // Only quote a percentage when it backs the action taken
    const backsAction = result.willDelete !== result.isMemborable;
    const percent = backsAction ? ` ${(result.confidence * 100).toFixed(0)}%` : "";

    resultDiv.textContent = (result.willDelete ? t('delete') : t('keep')) + percent;
    resultDiv.className = result.willDelete ? "result-forgettable" : "result-memorable";
    resultDiv.style.display = "block";
}

/**
 * Hides the result badge
 */
function hideResultBadge() {
    const resultDiv = document.getElementById("result");
    if (resultDiv) {
        resultDiv.style.display = "none";
    }
}

// =============================================================================
// RUN CARD
// =============================================================================

/**
 * Renders status, progress, stats and preview for the current/last job
 * @param {Object} state - Job state from the background
 */
function renderRun(state) {
    const runCard = document.getElementById("runCard");
    if (!state.status) {
        runCard.classList.remove("visible");
        return;
    }
    runCard.classList.add("visible");

    // Status line
    const statusLine = runCard.querySelector(".status-line");
    statusLine.classList.toggle("error", state.status.kind === "error");
    statusLine.classList.toggle("success", state.status.kind === "done");
    document.getElementById("spinner").classList.toggle("visible", state.running);
    document.getElementById("statusText").textContent = t(state.status.key, state.status.params);

    // Progress and stats only make sense for a cleaning run
    const isClean = state.mode === "clean";
    runCard.querySelector(".progress").style.display = isClean ? "block" : "none";
    runCard.querySelector(".stats").style.display = isClean ? "flex" : "none";
    if (isClean) {
        const percent = state.total ? (state.current / state.total) * 100 : 0;
        document.getElementById("progressFill").style.width = `${percent}%`;
        document.getElementById("statProgress").textContent = `${state.current}/${state.total}`;
        document.getElementById("statKept").textContent = state.kept;
        document.getElementById("statDeleted").textContent = state.deleted;
        document.getElementById("statSkipped").textContent = state.skipped;
    }

    // Preview and verdict
    if (state.previewSrc) {
        showPreview(state.previewSrc);
    }
    if (state.lastResult) {
        showResultBadge(state.lastResult);
    } else {
        hideResultBadge();
    }
}

// =============================================================================
// INFO MODAL
// =============================================================================

/**
 * Initialize info modal functionality
 */
function initInfoModal() {
    const infoBtn = document.getElementById('infoBtn');
    const modal = document.getElementById('infoModal');
    const closeBtn = document.getElementById('modalClose');

    if (infoBtn && modal) {
        infoBtn.addEventListener('click', () => {
            modal.classList.add('active');
        });

        closeBtn.addEventListener('click', () => {
            modal.classList.remove('active');
        });

        // Close on overlay click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.remove('active');
            }
        });
    }
}

// Initialize modal when DOM is ready
document.addEventListener('DOMContentLoaded', initInfoModal);

// =============================================================================
// EXPORTS (for other scripts)
// =============================================================================
window.debugLog = debugLog;
window.showPreview = showPreview;
window.showResultBadge = showResultBadge;
window.hideResultBadge = hideResultBadge;
window.renderRun = renderRun;

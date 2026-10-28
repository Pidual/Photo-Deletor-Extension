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
 * Renders text where **words** are shown in bold, without using innerHTML
 * @param {HTMLElement} el - Target element
 * @param {string} text - Text with optional **bold** markers
 * @param {string} boldClass - Class for the bold parts
 */
function renderRichText(el, text, boldClass = "") {
    el.textContent = "";
    text.split(/\*\*(.+?)\*\*/).forEach((part, i) => {
        if (i % 2 === 0) {
            el.append(part);
        } else {
            const strong = document.createElement("strong");
            strong.textContent = part;
            if (boldClass) strong.className = boldClass;
            el.append(strong);
        }
    });
}

/**
 * Shows a thumbnail of the photo being scored, outlined by its verdict
 * @param {string|null} imageSrc - Thumbnail data URL
 * @param {string} verdictClass - "verdict-keep", "verdict-delete" or ""
 */
function renderThumb(imageSrc, verdictClass) {
    const thumb = document.getElementById("thumb");
    if (!imageSrc) {
        thumb.classList.remove("visible");
        return;
    }
    if (thumb.src !== imageSrc) thumb.src = imageSrc;
    thumb.className = `thumb visible ${verdictClass}`;
}

/**
 * Shows thumbnails of the photos deleted this run, newest first
 * @param {string[]} thumbs - Thumbnail data URLs
 */
function renderDeleted(thumbs = []) {
    const section = document.getElementById("deletedSection");
    const strip = document.getElementById("deletedStrip");

    section.classList.toggle("visible", thumbs.length > 0);
    document.getElementById("deletedCount").textContent = thumbs.length;

    // Only rebuild when something was added
    if (strip.childElementCount === thumbs.length) return;
    strip.textContent = "";
    thumbs.forEach(src => {
        const img = document.createElement("img");
        img.src = src;
        img.alt = "";
        img.loading = "lazy";
        strip.append(img);
    });
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

    // Verdict: bold KEEP/DELETE and a thumbnail of the photo that was scored
    const verdictClass = !state.lastResult ? ""
                       : state.lastResult.willDelete ? "verdict-delete" : "verdict-keep";
    renderRichText(document.getElementById("statusText"), t(state.status.key, state.status.params), verdictClass);
    renderThumb(state.previewSrc, verdictClass);

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
    renderDeleted(state.deletedThumbs);
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
window.renderRun = renderRun;

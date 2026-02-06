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
// IMAGE VISUALIZATION
// =============================================================================

/**
 * Displays tensor data as a preview image
 * @param {Float32Array} tensorData - Preprocessed image tensor
 * @param {number} size - Image dimensions (default 512)
 */
function showTensorAsImage(tensorData, size = 512) {
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    
    const ctx = canvas.getContext("2d");
    const imageData = ctx.createImageData(size, size);
    const data = imageData.data;

    // Convert CHW tensor back to RGBA image
    for (let i = 0; i < size * size; i++) {
        data[i * 4]     = Math.round(tensorData[i] * 255);                    // R
        data[i * 4 + 1] = Math.round(tensorData[size * size + i] * 255);      // G
        data[i * 4 + 2] = Math.round(tensorData[2 * size * size + i] * 255);  // B
        data[i * 4 + 3] = 255;                                                 // A
    }

    ctx.putImageData(imageData, 0, 0);
    
    const preview = document.getElementById("preview");
    const placeholder = document.querySelector(".preview-placeholder");
    
    if (preview) {
        preview.src = canvas.toDataURL();
        preview.style.display = "block";
    }
    
    if (placeholder) {
        placeholder.style.display = "none";
    }
}

// =============================================================================
// RESULT DISPLAY
// =============================================================================

/**
 * Shows the classification result badge on the preview
 * @param {boolean} isMemborable - Whether the image is memorable
 * @param {number} confidence - Confidence percentage (0-1)
 */
function showResultBadge(isMemborable, confidence) {
    const resultDiv = document.getElementById("result");
    if (!resultDiv) return;

    const percent = (confidence * 100).toFixed(0);
    
    // Use translations if available
    const keepText = typeof t === 'function' ? t('keep') : 'KEEP';
    const deleteText = typeof t === 'function' ? t('delete') : 'DELETE';
    
    if (isMemborable) {
        resultDiv.textContent = `✓ ${keepText} (${percent}%)`;
        resultDiv.className = "result-memorable";
    } else {
        resultDiv.textContent = `✗ ${deleteText} (${percent}%)`;
        resultDiv.className = "result-forgettable";
    }
    
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
// STATS BAR
// =============================================================================

/**
 * Shows and updates the stats bar
 * @param {number} current - Current photo number
 * @param {number} total - Total photos to process
 * @param {number} kept - Photos kept
 * @param {number} deleted - Photos deleted
 */
function updateStats(current, total, kept, deleted) {
    const statsBar = document.getElementById("statsBar");
    const statProgress = document.getElementById("statProgress");
    const statKept = document.getElementById("statKept");
    const statDeleted = document.getElementById("statDeleted");
    
    if (statsBar) {
        statsBar.classList.add("active");
    }
    
    if (statProgress) statProgress.textContent = `${current}/${total}`;
    if (statKept) statKept.textContent = kept;
    if (statDeleted) statDeleted.textContent = deleted;
}

/**
 * Hides the stats bar
 */
function hideStats() {
    const statsBar = document.getElementById("statsBar");
    if (statsBar) {
        statsBar.classList.remove("active");
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
window.showTensorAsImage = showTensorAsImage;
window.showResultBadge = showResultBadge;
window.hideResultBadge = hideResultBadge;
window.updateStats = updateStats;
window.hideStats = hideStats;





// =============================================================================
// CONTENT.JS - Google Photos Page Selectors (Reference)
// =============================================================================
// Note: These selectors are defined here for reference.
// The actual DOM manipulation is done via chrome.scripting.executeScript
// from popup.js to avoid content script injection issues.
// =============================================================================

const GOOGLE_PHOTOS_SELECTORS = {
    // Main photo image
    image: 'img.BiCYpc',
    
    // Navigation buttons
    nextButtons: [
        '[aria-label="Ver la foto siguiente"]',
        '[aria-label="Ver siguiente foto"]',
        '[aria-label="View next photo"]',
        '[aria-label="Siguiente"]',
        '[aria-label="Next"]'
    ],
    
    // Delete action
    deleteButton: '[aria-label="Mover a la papelera"]',
    confirmDelete: 'button[data-mdc-dialog-action="EBS5u"]'
};
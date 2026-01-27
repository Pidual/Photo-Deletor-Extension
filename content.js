const SELECTORS = {
    //Main Photo Container
    imageClass: 'img.BiCYpc', //image class
    nextButtons: [
        '[aria-label="Ver la foto siguiente"]',
        '[aria-label="Ver siguiente foto"]',
        '[aria-label="View next photo"]',
        '[aria-label="Siguiente"]',
        '[aria-label="Next"]'
    ],
    // Icono de basurero
    deleteButton: '[aria-label="Mover a la papelera"]',
    // Confirmar borrar
    confirmDeleteSpan: 'span.mUIrbf-vQzf8d'
}

// DOM ACTIONS
// Document Object Model is a programming interface for web documents. It represents the page so that programs can change the document structure, style, and content.

function getCurrentImageSrc() {
    const img = document.querySelector(SELECTORS.imageClass);
    return img ? img.src : null;

}
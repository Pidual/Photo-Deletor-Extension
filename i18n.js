// =============================================================================
// I18N.JS - Internationalization (English/Spanish)
// i18n = "i" + 18 letters + "n" (i-nternationalizatio-n)
// =============================================================================

const TRANSLATIONS = {
    en: {
        subtitle: "AI-Powered Photo Cleanup",
        warning: "This will automatically delete photos marked as forgettable. Photos move to trash and can be recovered within 30 days.",
        classifyBtn: "Classify Current Photo",
        photosToProcess: "Photos to process:",
        startAutoDelete: "Start Auto-Delete",
        progress: "Progress",
        kept: "Kept",
        deleted: "Deleted",
        previewPlaceholder: "Photo preview will appear here",
        console: "Console",
        // Dynamic messages
        keep: "KEEP",
        delete: "DELETE",
        classifying: "Classifying current photo...",
        imageFound: "Image found",
        noImageFound: "No visible image found",
        starting: "Starting",
        photos: "photos",
        photo: "Photo",
        processing: "Processing",
        memorable: "MEMORABLE - Next...",
        forgettable: "FORGETTABLE - Deleting...",
        completed: "Completed",
        deletedCount: "deleted",
        keptCount: "kept",
        error: "Error",
        loadingModel: "Loading model...",
        modelLoaded: "Model loaded",
        preprocessing: "Preprocessing...",
        // Modal
        aboutTitle: "About Photo Deletor",
        devNotes: "Developer Notes",
        devNotesText: "This extension runs a full neural network locally in your browser - no cloud, no API calls, complete privacy!",
        modelSize: "Model size:",
        modelType: "Model:",
        techStack: "Tech Stack",
        howItWorks: "How It Works",
        howItWorksText: "The AI analyzes each photo and classifies it as \"memorable\" or \"forgettable\" based on visual features. Forgettable photos (blurry, duplicates, low quality) are moved to trash automatically.",
        madeWith: "Made with effort and passion",
        // Help section
        helpTitle: "How to Use",
        helpText: "Open a photo in Google Photos first. You should see the toolbar with these icons:",
        // Tab status
        tabValid: "Ready! Photo detected",
        tabInvalid: "Open a photo in Google Photos"
    },
    es: {
        subtitle: "Limpieza de Fotos con IA",
        warning: "Esto eliminara automaticamente las fotos marcadas como olvidables. Las fotos se mueven a la papelera y se pueden recuperar en 30 dias.",
        classifyBtn: "Clasificar Foto Actual",
        photosToProcess: "Fotos a procesar:",
        startAutoDelete: "Iniciar Auto-Borrado",
        progress: "Progreso",
        kept: "Conservadas",
        deleted: "Borradas",
        previewPlaceholder: "La vista previa aparecera aqui",
        console: "Consola",
        // Dynamic messages
        keep: "CONSERVAR",
        delete: "BORRAR",
        classifying: "Clasificando foto actual...",
        imageFound: "Imagen encontrada",
        noImageFound: "No se encontro imagen visible",
        starting: "Iniciando",
        photos: "fotos",
        photo: "Foto",
        processing: "Procesando",
        memorable: "MEMORABLE - Siguiente...",
        forgettable: "OLVIDABLE - Borrando...",
        completed: "Completado",
        deletedCount: "borradas",
        keptCount: "conservadas",
        error: "Error",
        loadingModel: "Cargando modelo...",
        modelLoaded: "Modelo cargado",
        preprocessing: "Preprocesando...",
        // Modal
        aboutTitle: "Acerca de Photo Deletor",
        devNotes: "Notas del Desarrollador",
        devNotesText: "Esta extension ejecuta una red neuronal completa localmente en tu navegador - sin nube, sin llamadas API, privacidad total!",
        modelSize: "Tamano del modelo:",
        modelType: "Modelo:",
        techStack: "Tecnologias",
        howItWorks: "Como Funciona",
        howItWorksText: "La IA analiza cada foto y la clasifica como \"memorable\" u \"olvidable\" basandose en caracteristicas visuales. Las fotos olvidables (borrosas, duplicadas, baja calidad) se mueven a la papelera automaticamente.",
        madeWith: "Hecho con esfuerzo y pasion",
        // Help section
        helpTitle: "Como Usar",
        helpText: "Abre una foto en Google Photos primero. Debes ver la barra de herramientas con estos iconos:",
        // Tab status
        tabValid: "Listo! Foto detectada",
        tabInvalid: "Abre una foto en Google Photos"
    }
};

// Current language (default: English)
let currentLang = localStorage.getItem('photoDeletorLang') || 'en';

/**
 * Get translation for a key
 * @param {string} key - Translation key
 * @returns {string} Translated text
 */
function t(key) {
    return TRANSLATIONS[currentLang][key] || TRANSLATIONS['en'][key] || key;
}

/**
 * Apply translations to all elements with data-i18n attribute
 */
function applyTranslations() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (TRANSLATIONS[currentLang][key]) {
            el.textContent = TRANSLATIONS[currentLang][key];
        }
    });
}

/**
 * Set language and update UI
 * @param {string} lang - Language code ('en' or 'es')
 */
function setLanguage(lang) {
    currentLang = lang;
    localStorage.setItem('photoDeletorLang', lang);
    
    // Update toggle buttons
    document.getElementById('langEN').classList.toggle('active', lang === 'en');
    document.getElementById('langES').classList.toggle('active', lang === 'es');
    
    // Apply translations
    applyTranslations();
}

/**
 * Initialize language system
 */
function initI18n() {
    // Set initial language from storage
    setLanguage(currentLang);
    
    // Add click handlers for language toggle
    document.getElementById('langEN').addEventListener('click', () => setLanguage('en'));
    document.getElementById('langES').addEventListener('click', () => setLanguage('es'));
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', initI18n);

// =============================================================================
// EXPORTS
// =============================================================================
window.t = t;
window.setLanguage = setLanguage;
window.currentLang = () => currentLang;

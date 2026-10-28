// =============================================================================
// I18N.JS - Internationalization (English/Spanish)
// i18n = "i" + 18 letters + "n" (i-nternationalizatio-n)
// =============================================================================

const TRANSLATIONS = {
    en: {
        subtitle: "AI-Powered Photo Cleanup",
        // Setup
        setupNotPhotos: "Open Google Photos to get started.",
        setupOpenPhotos: "Open Google Photos",
        setupGrid: "Cleaning starts from the photo you open and moves forward from there. Open any photo, or start from your newest one.",
        setupOpenFirst: "Start from newest photo",
        setupNoPhotoFound: "Couldn't find a photo on this page. Open one manually.",
        // Controls
        howMany: "How many photos to check",
        thresholdLabel: "Only delete when the AI is at least",
        thresholdSuffix: "sure",
        moreDeletes: "Deletes more",
        safer: "Safer",
        startAutoDelete: "Start cleaning",
        stopAutoDelete: "Stop",
        trashNote: "Deleted photos go to Google Photos Trash, where you can restore them.",
        classifyBtn: "Test on this photo (won't delete)",
        // Run
        checked: "Checked",
        kept: "Kept",
        deleted: "Deleted",
        skipped: "Skipped",
        console: "Details",
        deletedThisRun: "Deleted this run",
        keep: "KEEP",
        delete: "DELETE",
        // Status
        statusLoadingModel: "Loading the AI model… (a few seconds the first time)",
        statusFinding: "Looking for the photo…",
        statusChecking: "Checking photo {current} of {total}…",
        statusTesting: "Analyzing this photo…",
        statusStopping: "Stopping after this photo…",
        statusVerdictDelete: "Photo {current} of {total}: **DELETE** ({pct}% sure)",
        statusVerdictKeep: "Photo {current} of {total}: **KEEP**",
        statusTestKeep: "The AI would **KEEP** this photo ({pct}% sure).",
        statusTestDelete: "The AI would **DELETE** this photo ({pct}% sure).",
        statusTestUnsure: "The AI leans toward deleting ({pct}% sure), but that's below your {threshold}% setting, so it would **KEEP** it.",
        statusDone: "Done! Deleted {deleted}, kept {kept}.",
        statusEnd: "Reached your last photo. Deleted {deleted}, kept {kept}.",
        statusStopped: "Stopped. Deleted {deleted}, kept {kept}.",
        errNoImage: "Couldn't find a photo on the page. Make sure a photo is open in Google Photos.",
        errTrashButton: "Couldn't find the Trash button. Google Photos may have changed its layout.",
        errConfirm: "The \"Move to trash\" confirmation didn't appear, so nothing was deleted.",
        errDeleteFailed: "The photo didn't leave the screen after deleting. Stopped to be safe.",
        errTooManySkips: "Skipped too many photos in a row (videos or loading problems). Stopped.",
        errTabClosed: "The Google Photos tab was closed or changed.",
        errGeneric: "Something went wrong: {msg}",
        // Modal
        aboutTitle: "About Photo Deletor",
        howItWorks: "How It Works",
        howItWorksText: "Starting from the photo you have open, the AI looks at each photo and decides if it's a keeper (friends, parties, trips) or clutter (memes, screenshots, junk). Clutter goes to Trash, then it moves on to the next photo. Videos are skipped.",
        devNotes: "Developer Notes",
        devNotesText: "This extension runs a full neural network locally in your browser: no cloud, no API calls, complete privacy.",
        modelSize: "Model size:",
        modelType: "Model:",
        techStack: "Tech Stack",
        madeWith: "Made with effort and passion"
    },
    es: {
        subtitle: "Limpieza de Fotos con IA",
        // Setup
        setupNotPhotos: "Abre Google Fotos para empezar.",
        setupOpenPhotos: "Abrir Google Fotos",
        setupGrid: "La limpieza empieza en la foto que abras y avanza desde ahi. Abre cualquier foto o empieza por la mas reciente.",
        setupOpenFirst: "Empezar por la mas reciente",
        setupNoPhotoFound: "No se encontro ninguna foto en esta pagina. Abre una manualmente.",
        // Controls
        howMany: "Cuantas fotos revisar",
        thresholdLabel: "Borrar solo si la IA esta al menos",
        thresholdSuffix: "segura",
        moreDeletes: "Borra mas",
        safer: "Mas seguro",
        startAutoDelete: "Empezar limpieza",
        stopAutoDelete: "Detener",
        trashNote: "Las fotos borradas van a la Papelera de Google Fotos, donde puedes restaurarlas.",
        classifyBtn: "Probar con esta foto (no borra)",
        // Run
        checked: "Revisadas",
        kept: "Conservadas",
        deleted: "Borradas",
        skipped: "Omitidas",
        console: "Detalles",
        deletedThisRun: "Borradas en esta ronda",
        keep: "CONSERVAR",
        delete: "BORRAR",
        // Status
        statusLoadingModel: "Cargando el modelo de IA… (unos segundos la primera vez)",
        statusFinding: "Buscando la foto…",
        statusChecking: "Revisando foto {current} de {total}…",
        statusTesting: "Analizando esta foto…",
        statusStopping: "Deteniendo despues de esta foto…",
        statusVerdictDelete: "Foto {current} de {total}: **BORRAR** ({pct}% segura)",
        statusVerdictKeep: "Foto {current} de {total}: **CONSERVAR**",
        statusTestKeep: "La IA **CONSERVARIA** esta foto ({pct}% segura).",
        statusTestDelete: "La IA **BORRARIA** esta foto ({pct}% segura).",
        statusTestUnsure: "La IA se inclina por borrar ({pct}% segura), pero esta por debajo de tu ajuste de {threshold}%, asi que la **CONSERVARIA**.",
        statusDone: "Listo! Borradas {deleted}, conservadas {kept}.",
        statusEnd: "Llegaste a tu ultima foto. Borradas {deleted}, conservadas {kept}.",
        statusStopped: "Detenido. Borradas {deleted}, conservadas {kept}.",
        errNoImage: "No se encontro una foto en la pagina. Asegurate de tener una foto abierta en Google Fotos.",
        errTrashButton: "No se encontro el boton de Papelera. Puede que Google Fotos haya cambiado su diseno.",
        errConfirm: "No aparecio la confirmacion de \"Mover a la papelera\", asi que no se borro nada.",
        errDeleteFailed: "La foto no desaparecio tras borrarla. Se detuvo por seguridad.",
        errTooManySkips: "Se omitieron demasiadas fotos seguidas (videos o problemas de carga). Detenido.",
        errTabClosed: "La pestana de Google Fotos se cerro o cambio.",
        errGeneric: "Algo salio mal: {msg}",
        // Modal
        aboutTitle: "Acerca de Photo Deletor",
        howItWorks: "Como Funciona",
        howItWorksText: "Empezando por la foto que tienes abierta, la IA revisa cada foto y decide si vale la pena (amigos, fiestas, viajes) o es basura (memes, capturas, desorden). La basura va a la Papelera y luego pasa a la siguiente foto. Los videos se omiten.",
        devNotes: "Notas del Desarrollador",
        devNotesText: "Esta extension ejecuta una red neuronal completa localmente en tu navegador: sin nube, sin llamadas API, privacidad total.",
        modelSize: "Tamano del modelo:",
        modelType: "Modelo:",
        techStack: "Tecnologias",
        madeWith: "Hecho con esfuerzo y pasion"
    }
};

// Current language (default: English)
let currentLang = localStorage.getItem('photoDeletorLang') || 'en';

/**
 * Get translation for a key, filling {placeholders} from params
 * @param {string} key - Translation key
 * @param {Object} params - Values for {placeholders}
 * @returns {string} Translated text
 */
function t(key, params = {}) {
    const text = TRANSLATIONS[currentLang][key] || TRANSLATIONS['en'][key] || key;
    return text.replace(/\{(\w+)\}/g, (match, name) => (name in params ? params[name] : match));
}

/**
 * Apply translations to all elements with data-i18n attribute
 */
function applyTranslations() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
        el.textContent = t(el.getAttribute('data-i18n'));
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

    // Apply translations, then let the popup re-render its dynamic text
    applyTranslations();
    if (typeof window.onLanguageChange === 'function') {
        window.onLanguageChange();
    }
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
window.applyTranslations = applyTranslations;
window.setLanguage = setLanguage;
window.currentLang = () => currentLang;

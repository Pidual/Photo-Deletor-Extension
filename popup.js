// --- ONNX Runtime config ---
ort.env.wasm.numThreads = 1;
ort.env.wasm.proxy = false;

// --- Model Functions ---
const modelUrl = chrome.runtime.getURL('model/resnet50_classifier.onnx');
let model = null;

// --- Main Event Handlers ---
document.getElementById("classifyBtn").addEventListener("click", classifyCurrentImage);
document.getElementById("sequentialBtn").addEventListener("click", classifyAndDeleteSequentially);

// --- Handler Implementations ---
async function classifyCurrentImage() {
    debugLog("classifyBtn presionado");
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    // Get the first visible image src
    const [{ result: imageSrc }] = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => {
            const isVisible = img => {
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
        return;
    }
    debugLog("Imagen encontrada: " + imageSrc);

    await classifyImageBySrc(imageSrc);
}

async function classifyAndDeleteSequentially() {
    const countInput = document.getElementById("countInput");
    const count = parseInt(countInput.value, 10) || 10;
    
    debugLog(`Iniciando clasificación secuencial de ${count} fotos...`);
    
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    for (let i = 0; i < count; i++) {
        debugLog(`--- Procesando foto ${i + 1} de ${count} ---`);

        // Get current image src from the page (same logic as classifyCurrentImage)
        const [{ result: imageSrc }] = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: () => {
                const isVisible = img => {
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
            debugLog("No se encontró imagen, terminando...");
            break;
        }

        debugLog("Imagen encontrada: " + imageSrc.substring(0, 50) + "...");

        // Classify the image (in popup context where model is loaded)
        let resultado;
        try {
            resultado = await classifyImageBySrc(imageSrc);
        } catch (err) {
            debugLog("Error clasificando: " + err.message);
            break;
        }

        if (!resultado.isMemborable) {
            // Image is forgettable - DELETE IT
            debugLog("Foto OLVIDABLE - Borrando...");
            
            // Click delete button
            await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                func: () => {
                    const deleteBtn = document.querySelector('[aria-label="Mover a la papelera"]');
                    if (deleteBtn) deleteBtn.click();
                }
            });

            // Wait for confirmation dialog
            await new Promise(r => setTimeout(r, 500));

            // Click confirm delete button ("Mover a la papelera" in dialog)
            await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                func: () => {
                    const confirmBtn = document.querySelector('span.mUIrbf-vQzf8d[jsname="V67aGc"]');
                    if (confirmBtn) confirmBtn.click();
                }
            });

            debugLog("Foto borrada, esperando...");
            await new Promise(r => setTimeout(r, 1000));

        } else {
            // Image is memorable - KEEP IT, go to next
            debugLog("Foto MEMORABLE - Manteniendo, siguiente...");
            
            // Click next button
            await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                func: () => {
                    const nextSelectors = [
                        '[aria-label="Ver la foto siguiente"]',
                        '[aria-label="Ver siguiente foto"]',
                        '[aria-label="View next photo"]',
                        '[aria-label="Siguiente"]',
                        '[aria-label="Next"]'
                    ];
                    for (const sel of nextSelectors) {
                        const btn = document.querySelector(sel);
                        if (btn) {
                            btn.click();
                            return true;
                        }
                    }
                    return false;
                }
            });

            await new Promise(r => setTimeout(r, 1000));
        }
    }

    debugLog("=== Clasificación secuencial completada ===");
}


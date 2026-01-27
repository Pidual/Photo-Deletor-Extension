ort.env.wasm.numThreads = 1; // ort	ONNX Runtime (viene de ort.min.js)
ort.env.wasm.proxy = false; // FALSE ???

// Funciones para el modelo
const modelUrl = chrome.runtime.getURL('model/resnet50_classifier.onnx');
let model = null;

async function loadModel() {
    if (model) {
        return model; // Ya esta cargado lo reutilizamos
    }
    debugLog("Cargando el modelo...");
    model = await ort.InferenceSession.create(modelUrl);
    debugLog("Modelo cargado");
    return model;
}


async function preprocessImage(imageSrc) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "anonymous";

        img.onload = () => {
            const size = 512;
            const channelSize = size * size;
            
            const canvas = document.createElement("canvas");
            const ctx = canvas.getContext("2d");
            canvas.width = size;
            canvas.height = size;
            ctx.drawImage(img, 0, 0, size, size);

            const data = ctx.getImageData(0, 0, size, size).data;         

            const tensorData = new Float32Array(3 * channelSize);

            // Un solo loop, sin cálculos redundantes
            for (let i = 0; i < channelSize; i++) {
                const p = i * 4;
                tensorData[i] = data[p] / 255;
                tensorData[channelSize + i] = data[p + 1] / 255;
                tensorData[channelSize * 2 + i] = data[p + 2] / 255;
            }

            const mean = [0.485, 0.456, 0.406];
            const std = [0.229, 0.224, 0.225];
            for (let c = 0; c < 3; c++) {
                for (let i = 0; i < channelSize; i++) {
                    tensorData[c * channelSize + i] = (tensorData[c * channelSize + i] - mean[c]) / std[c];
                }
            }

            resolve(tensorData);
        };

        img.onerror = () => reject(new Error("Error cargando imagen"));
        img.src = imageSrc;
    });
}

function softmax(logits) {
    const maxVal = Math.max(...logits);
    const exps = logits.map(x => Math.exp(x - maxVal));
    const sum = exps.reduce((a, b) => a + b, 0);
    return exps.map(x => x / sum);
}





/*  Funcion para clasificar una imagen 
    1. Obtiene la imagen de la pestaña activa
    2. Carga el modelo
    3. Preprocesa la imagen
    4. Realiza la inferencia
    5. Muestra el resultado     */
document.getElementById("classifyBtn").addEventListener("click", async () => {

    // 1. Obtener la imagen de la pestaña activa
    debugLog("classifyBtn presionado");
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    debugLog("Tab encontrada:", tab.url);
    
    const result = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => {
            // Helper to check if an element is visible in the viewport
            function isVisible(img) {
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
            }

            const imgs = Array.from(document.querySelectorAll('img.BiCYpc'));
            // Filter only visible images
            const visibleImgs = imgs.filter(isVisible);
            if (visibleImgs.length === 0) return null;

            // Optionally, pick the largest visible image
            let best = visibleImgs[0];
            let bestArea = best.naturalWidth * best.naturalHeight;
            for (const img of visibleImgs) {
                const area = img.naturalWidth * img.naturalHeight;
                if (area > bestArea) {
                    best = img;
                    bestArea = area;
                }
            }
            return best.src;
        }
    });
    const imageSrc = result[0].result;
    
    if (!imageSrc) {
        console.log("No se encontró imagen");
        debugLog("No se encontró imagen");
        return;
    }

    console.log("Imagen encontrada:", imageSrc);
    debugLog("Imagen encontrada:", imageSrc);

    // 2. Cargar el modelo
    const model = await loadModel();
    debugLog("Modelo listo");
    
    // 3. Preprocesar la imagen
    debugLog("Preprocesando imagen...");
    const tensorData = await preprocessImage(imageSrc);
    debugLog("Imagen preprocesada");

    showTensorAsImage(tensorData);

    // 4. Crear tensor de entrada
    const inputTensor = new ort.Tensor("float32", tensorData, [1, 3, 512, 512]);
    //                                  tipo      datos       forma: [batch, canales, alto, ancho]

    // 5. Ejecutar el modelo
    debugLog("Ejecutando modelo...");
    const inputName = model.inputNames[0];  // Nombre de la entrada del modelo
    const feeds = { [inputName]: inputTensor };
    
    const results = await model.run(feeds);
    
    // 6. Obtener resultado
    const outputName = model.outputNames[0];
    const output = results[outputName];
    
    debugLog("Logits: " + Array.from(output.data).join(", "));
    
    // 7. Interpretar resultado
    const resultado = interpretResult(output.data);
    
    if (resultado.isMemborable) {
        debugLog(`MEMORABLE (${(resultado.confidence * 100).toFixed(1)}%)`);
    } else {
        debugLog(`OLVIDABLE (${(resultado.confidence * 100).toFixed(1)}%)`);
    }
});



// Para enviar datos a popup.html <div id="debug"></div>

function debugLog(msg) {
    console.log(msg);
    const debugDiv = document.getElementById("debug");
    debugDiv.textContent += msg + "\n";
    debugDiv.scrollTop = debugDiv.scrollHeight; //auto scroll
}

//Helper para mostrar tensor como imagen en el popup
function showTensorAsImage(tensorData, size = 512) {
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    const imageData = ctx.createImageData(size, size);
    const data = imageData.data;

    for (let i = 0; i < size * size; i++) {
        data[i * 4]     = Math.round(tensorData[i] * 255); // R
        data[i * 4 + 1] = Math.round(tensorData[size * size + i] * 255); // G
        data[i * 4 + 2] = Math.round(tensorData[2 * size * size + i] * 255); // B
        data[i * 4 + 3] = 255; // Alpha
    }

    ctx.putImageData(imageData, 0, 0);
    const preview = document.getElementById("preview");
    preview.src = canvas.toDataURL();
    preview.style.display = "block";
}

// Interpretar resultado del modelo
function interpretResult(outputData) {
    const logits = Array.from(outputData);
    const probs = softmax(logits);
    
    debugLog("Probs: " + probs.join(", ")); // ver las probabilidades
    
    // INVERTIDO: probs[1] = memorable, probs[0] = olvidable
    const isMemborable = probs[1] > probs[0];
    const confidence = Math.max(probs[0], probs[1]);
    
    return {
        isMemborable,
        confidence,
        probMemborable: probs[1],  // ← Invertido
        probOlvidable: probs[0]    // ← Invertido
    };
}
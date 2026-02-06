// This class
// await is for waiting for the model to load
async function loadModel() {
    if (model) return model;
    debugLog("Cargando el modelo...");
    model = await ort.InferenceSession.create(modelUrl);
    debugLog("Modelo cargado");
    return model;
}

// Procesa la imagen 
// 
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

function interpretResult(outputData) {
    const logits = Array.from(outputData);
    const probs = softmax(logits);

    // INVERTIDO: probs[1] = memorable, probs[0] = olvidable
    const isMemborable = probs[1] > probs[0];
    const confidence = Math.max(probs[0], probs[1]);

    return {
        isMemborable,
        confidence,
        probMemborable: probs[1],  
        probOlvidable: probs[0]    
    };
}

// CLasificia una imagen
// Usa funciones definidas arriba:
// - loadModel()
// - preprocessImage()
// - showTensorAsImage()
// - interpretResult()
async function classifyImage(imageSrc) {
    const model = await loadModel();
    debugLog("Modelo listo. Preprocesando imagen...");
    const tensorData = await preprocessImage(imageSrc);
    debugLog("Imagen preprocesada");
    showTensorAsImage(tensorData);

    const inputTensor = new ort.Tensor("float32", tensorData, [1, 3, 512, 512]);
    debugLog("Ejecutando modelo...");
    const inputName = model.inputNames[0];
    const feeds = { [inputName]: inputTensor };
    const results = await model.run(feeds);
    const outputName = model.outputNames[0];
    const output = results[outputName];
    debugLog("Logits: " + Array.from(output.data).join(", "));
    const resultado = interpretResult(output.data);

    debugLog(
        resultado.isMemborable
            ? `MEMORABLE (${(resultado.confidence * 100).toFixed(1)}%)`
            : `OLVIDABLE (${(resultado.confidence * 100).toFixed(1)}%)`
    );
    return resultado;
}

//window. para compartir las funciones con popup.js
window.loadModel = loadModel;
window.preprocessImage = preprocessImage;
window.softmax = softmax;
window.interpretResult = interpretResult;
window.classifyImageBySrc = classifyImageBySrc;
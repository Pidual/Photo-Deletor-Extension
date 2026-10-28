// =============================================================================
// MODEL.JS - ONNX Model & Image Classification
// =============================================================================

// --- Constants ---------------------------------------------------------------
const MODEL_URL = chrome.runtime.getURL('model/resnet50_fine_tunned_classifier.onnx');
const IMAGE_SIZE = 512;
const THUMBNAIL_SIZE = 96;
const NORMALIZATION = {
    mean: [0.485, 0.456, 0.406],
    std: [0.229, 0.224, 0.225]
};

// --- State -------------------------------------------------------------------
let model = null;

// =============================================================================
// MODEL LOADING
// =============================================================================

/**
 * Loads the ONNX model (singleton pattern)
 * @returns {Promise<ort.InferenceSession>} The loaded model session
 */
async function loadModel() {
    if (model) return model;
    
    debugLog("Loading model...");
    model = await ort.InferenceSession.create(MODEL_URL);
    debugLog("Model loaded");
    
    return model;
}

// =============================================================================
// IMAGE PREPROCESSING
// =============================================================================

/**
 * Draws a small square thumbnail (center-cropped) as a data URL
 * @param {HTMLImageElement} img - Loaded image
 * @returns {string} JPEG data URL
 */
function makeThumbnail(img) {
    const canvas = document.createElement("canvas");
    canvas.width = THUMBNAIL_SIZE;
    canvas.height = THUMBNAIL_SIZE;

    const side = Math.min(img.naturalWidth, img.naturalHeight);
    const sx = (img.naturalWidth - side) / 2;
    const sy = (img.naturalHeight - side) / 2;
    canvas.getContext("2d").drawImage(img, sx, sy, side, side, 0, 0, THUMBNAIL_SIZE, THUMBNAIL_SIZE);

    return canvas.toDataURL("image/jpeg", 0.7);
}

/**
 * Preprocesses an image for the ResNet50 model
 * @param {string} imageSrc - Image source URL
 * @returns {Promise<{tensorData: Float32Array, thumbnail: string}>}
 *          Normalized tensor data, plus a thumbnail of what was classified
 */
async function preprocessImage(imageSrc) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "anonymous";

        img.onload = () => {
            const channelSize = IMAGE_SIZE * IMAGE_SIZE;
            
            // Create canvas and draw resized image
            const canvas = document.createElement("canvas");
            const ctx = canvas.getContext("2d");
            canvas.width = IMAGE_SIZE;
            canvas.height = IMAGE_SIZE;
            ctx.drawImage(img, 0, 0, IMAGE_SIZE, IMAGE_SIZE);

            // Get pixel data
            const data = ctx.getImageData(0, 0, IMAGE_SIZE, IMAGE_SIZE).data;
            const tensorData = new Float32Array(3 * channelSize);

            // Convert to CHW format and normalize to [0, 1]
            for (let i = 0; i < channelSize; i++) {
                const p = i * 4;
                tensorData[i] = data[p] / 255;                          // R
                tensorData[channelSize + i] = data[p + 1] / 255;        // G
                tensorData[channelSize * 2 + i] = data[p + 2] / 255;    // B
            }

            // Apply ImageNet normalization
            for (let c = 0; c < 3; c++) {
                for (let i = 0; i < channelSize; i++) {
                    const idx = c * channelSize + i;
                    tensorData[idx] = (tensorData[idx] - NORMALIZATION.mean[c]) / NORMALIZATION.std[c];
                }
            }

            resolve({ tensorData, thumbnail: makeThumbnail(img) });
        };

        img.onerror = () => reject(new Error("Could not load image"));
        img.src = imageSrc;
    });
}

// =============================================================================
// RESULT INTERPRETATION
// =============================================================================

/**
 * Applies softmax to logits
 * @param {number[]} logits - Raw model output
 * @returns {number[]} Probabilities
 */
function softmax(logits) {
    const maxVal = Math.max(...logits);
    const exps = logits.map(x => Math.exp(x - maxVal));
    const sum = exps.reduce((a, b) => a + b, 0);
    return exps.map(x => x / sum);
}

/**
 * Interprets model output into classification result
 * @param {Float32Array} outputData - Model output
 * @returns {Object} Classification result
 */
function interpretResult(outputData) {
    const logits = Array.from(outputData);
    const probs = softmax(logits);

    // probs[0] = forgettable, probs[1] = memorable
    const isMemborable = probs[1] > probs[0];
    const confidence = Math.max(probs[0], probs[1]);

    return {
        isMemborable,
        confidence,
        probMemborable: probs[1],
        probOlvidable: probs[0]
    };
}

// =============================================================================
// MAIN CLASSIFICATION
// =============================================================================

/**
 * Classifies an image as memorable or forgettable
 * @param {string} imageSrc - Image source URL
 * @returns {Promise<Object>} Classification result
 */
async function classifyImage(imageSrc) {
    // Load model
    const model = await loadModel();
    
    // Preprocess image
    debugLog("Preprocessing...");
    const { tensorData, thumbnail } = await preprocessImage(imageSrc);

    // Run inference
    debugLog("Running model...");
    const inputTensor = new ort.Tensor("float32", tensorData, [1, 3, IMAGE_SIZE, IMAGE_SIZE]);
    const feeds = { [model.inputNames[0]]: inputTensor };
    const results = await model.run(feeds);
    const output = results[model.outputNames[0]];

    // Interpret result
    const result = interpretResult(output.data);
    result.thumbnail = thumbnail;

    debugLog(
        result.isMemborable
            ? `[MEMORABLE] (${(result.confidence * 100).toFixed(1)}%)`
            : `[FORGETTABLE] (${(result.confidence * 100).toFixed(1)}%)`
    );

    return result;
}

// =============================================================================
// EXPORTS (for offscreen.js)
// =============================================================================
window.loadModel = loadModel;
window.preprocessImage = preprocessImage;
window.softmax = softmax;
window.interpretResult = interpretResult;
window.classifyImage = classifyImage;
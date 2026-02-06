// The variable session is initialized as null to ensure that the ONNX model is loaded only once 
// and reused for all subsequent inferences. 
// This is a form of caching: when loadModel() is called, it checks if session already exists. 
// If so, it returns the existing session; otherwise, it loads the model and sets session. 
// This avoids reloading the model multiple times, which improves performance and reduces resource usage.
let session = null;

/**
 * Loads the model 
 * if aready lodead just returns it
 * @returns session
 * 
 * more info read https://onnxruntime.ai/docs/api/python/api_summary.html
 */
async function loadModel() {
    if (session) return session;
    
    const modelUrl = chrome.runtime.getURL("model/resnet50_fine_tunned_classifier.onnx");
    session = await ort.InferenceSession.create(modelUrl);
    return session;
}

// Handle messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "classify") {
        classifyImageBySrc(request.imageSrc)
            .then(result => sendResponse({ success: true, data: result }))
            .catch(err => sendResponse({ success: false, error: err.message }));
        return true; // Keep channel open for async response
    }
});
let session = null;

async function loadModel() {
    if (session) return session;
    
    const modelUrl = chrome.runtime.getURL("model/resnet50_classifier.onnx");
    session = await ort.InferenceSession.create(modelUrl);
    return session;
}

// Handle messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "classify") {
        classifyImage(request.imageSrc)
            .then(result => sendResponse({ success: true, data: result }))
            .catch(err => sendResponse({ success: false, error: err.message }));
        return true; // Keep channel open for async response
    }
});
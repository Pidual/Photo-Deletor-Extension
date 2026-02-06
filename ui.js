function debugLog(msg) {
    console.log(msg);
    const debugDiv = document.getElementById("debug");
    debugDiv.textContent += msg + "\n";
    debugDiv.scrollTop = debugDiv.scrollHeight; //auto scroll
}



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

window.debugLog = debugLog;
window.showTensorAsImage = showTensorAsImage;





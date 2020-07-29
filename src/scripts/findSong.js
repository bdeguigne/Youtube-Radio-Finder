function convertCoords(coords, fullWidth, fullHeight, resizeWidth, resizeHeight) {
    var ratioW = fullWidth / resizeWidth;
    var ratioH = fullHeight / resizeHeight;
    var currentRatio = Math.min(ratioW, ratioH);
    coords.x = Math.round(coords.x * currentRatio);
    coords.y = Math.round(coords.y * currentRatio);
    coords.x2 = Math.round(coords.x2 * currentRatio);
    coords.y2 = Math.round(coords.y2 * currentRatio);
    coords.w = Math.round(coords.w * currentRatio);
    coords.h = Math.round(coords.h * currentRatio);

    return coords;
}

findSong();

function findSong() {
    var player;
    var fullWidth;
    var fullHeight;
    var playerWidth;
    var playerHeight;
    takePlayerSize();

    function takePlayerSize() {
        player = document.getElementsByClassName("video-stream")[0];
        if (player) {
            fullWidth = player.videoWidth;
            fullHeight = player.videoHeight;
            playerWidth = player.style.width.replace("px", "");
            playerHeight = player.style.height.replace("px", "");
            chrome.storage.sync.get(["cropData"], function (res) {
                const cropData = res.cropData;
                cropData.forEach(item => {
                    if (item.youtubeURL === location.href) {
                        console.log(item.currentVideoSize.w, playerWidth)
                        var fullVideoCoords = convertCoords(item.cropSize, fullWidth, fullHeight, item.currentVideoSize.w, item.currentVideoSize.h);
                        analyzeImage(fullVideoCoords);
                    }
                })
            });
        }
    }

    function analyzeImage(convertedCoords) {
        var croppedCanvas = document.createElement("canvas");
        croppedCanvas.width = convertedCoords.w;
        croppedCanvas.height = convertedCoords.h;
        croppedCanvas.getContext("2d").drawImage(player, convertedCoords.x, convertedCoords.y, convertedCoords.w, convertedCoords.h, 0, 0, convertedCoords.w, convertedCoords.h);
        var imageData = croppedCanvas.getContext("2d").getImageData(0, 0, croppedCanvas.width, croppedCanvas.height);
        clearImage(imageData.data);
        croppedCanvas.getContext("2d").putImageData(imageData, 0, 0);

        doOCR(croppedCanvas);

        function clearImage(data) {
            for (var i = 0; i < data.length; i++) {
                var r = data[i];
                var g = data[i + 1];
                var b = data[i + 2];

                if (r >= 210 && g >= 210 && b >= 210) {
                    data[i] = 0;
                    data[i + 1] = 0;
                    data[i + 2] = 0;
                }
                else {
                    data[i] = 255;
                    data[i + 1] = 255;
                    data[i + 2] = 255;
                }
                i += 3;
            }
        }

        async function doOCR(element) {
            const { createWorker } = Tesseract;
            const worker = createWorker({
                workerPath: chrome.runtime.getURL('lib/tesseract/worker.min.js'),
                langPath: chrome.runtime.getURL('lib/tesseract/traineddata'),
                corePath: chrome.runtime.getURL('lib/tesseract/tesseract-core.wasm.js'),
            });
            await worker.load();
            await worker.loadLanguage('eng');
            await worker.initialize('eng');
            const { data: { text } } = await worker.recognize(element);

            console.log("RESULT", text);
            chrome.storage.local.set({ songTitle: text })
            chrome.runtime.sendMessage({
                from: "findSong",
                subject: "getSong",
                title: text
            })

            await worker.terminate();
        };
    }
}
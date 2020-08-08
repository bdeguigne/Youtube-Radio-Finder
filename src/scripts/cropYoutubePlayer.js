function convertCoords(coords, realWith, realHeight, resizeWidth, resizeHeight) {
    var ratioW = realWith / resizeWidth;
    var ratioH = realHeight / resizeHeight;
    var currentRatio = Math.min(ratioW, ratioH);
    coords.x = Math.round(coords.x * currentRatio);
    coords.y = Math.round(coords.y * currentRatio);
    coords.x2 = Math.round(coords.x2 * currentRatio);
    coords.y2 = Math.round(coords.y2 * currentRatio);
    coords.w = Math.round(coords.w * currentRatio);
    coords.h = Math.round(coords.h * currentRatio);

    return coords;
}

crop();

function crop() {
    var player;
    var videoWidth;
    var videoHeight;
    var currentWidth;
    var currentHeight;
    var jcrop_api;
    var crop_coords;
    var cropData;

    findYoutubePlayer();
    cropYoutubePlayer();

    function findYoutubePlayer() {
        player = document.getElementsByClassName("video-stream")[0];
        if (player) {
            videoWidth = player.videoWidth;
            videoHeight = player.videoHeight;
            currentWidth = player.style.width.replace("px", "");
            currentHeight = player.style.height.replace("px", "");

            console.log("player Width ", videoWidth);
            console.log("player height ", videoHeight);
            console.log("player Current Width ", currentWidth);
            console.log("player Current height ", currentHeight);

            var playerPos = $("div.html5-video-container").offset();
            var ytrfScreenContainer = document.createElement("div");
            ytrfScreenContainer.id = "ytrf-ScreenContainer";
            ytrfScreenContainer.style.position = "absolute";
            ytrfScreenContainer.style.height = currentWidth;
            ytrfScreenContainer.style.width = currentHeight;
            ytrfScreenContainer.style.top = playerPos.top + "px";
            ytrfScreenContainer.style.left = playerPos.left + "px";
            ytrfScreenContainer.style.zIndex = 2000;

            var screenshotCanvas = document.createElement("canvas");
            screenshotCanvas.id = "ytrf-cropperCanvas";
            screenshotCanvas.width = currentWidth;
            screenshotCanvas.height = currentHeight;
            screenshotCanvas.getContext('2d').drawImage(player, 0, 0, screenshotCanvas.width, screenshotCanvas.height);

            ytrfScreenContainer.append(screenshotCanvas);
            $('body').append(ytrfScreenContainer);
        }
    }

    function cropYoutubePlayer() {
        var isNew = true;
        chrome.storage.sync.get(["cropData"], function(res) {
            console.log("Current Size", res.cropData);
            cropData = res.cropData;
            if (cropData.length > 0) {
                cropData.forEach(item => {
                    if (item.youtubeURL == location.href) {
                        console.log("NOT NEW");
                        isNew = false;
                        console.log("IN ARRAY = ", item.youtubeURL);
                        console.log("IN ARRAY = ", item.cropSize);
                        var realcoords = convertCoords(item.cropSize, currentWidth, currentHeight, item.currentVideoSize.w, item.currentVideoSize.h)
                        $("#ytrf-cropperCanvas").Jcrop({
                            onSelect: takeCoords,
                            multi: false,
                            setSelect: [realcoords.x, realcoords.y, realcoords.x2, realcoords.y2]
                        }, function() {
                            jcrop_api = this;
                        })
                    }
                })
                if (isNew == true) {
                    $("#ytrf-cropperCanvas").Jcrop({
                        onSelect: takeCoords,
                        multi: false,
                    }, function() {
                        jcrop_api = this;
                    })
                }
            } else if (cropData.length == 0 || isNew == true) {
                $("#ytrf-cropperCanvas").Jcrop({
                    onSelect: takeCoords,
                    multi: false,
                }, function() {
                    jcrop_api = this;
                })
            }
        });
    }

    function takeCoords(c) {
        crop_coords = c;
        var cropButtonContainer = $("#ytrf-cropButtonContainer")[0];
        if (!cropButtonContainer) {
            console.log("Add Button");
            addButtonToCropper();
        }
    }

    function addButtonToCropper() {
        var cropElem = $(".jcrop-hline")[0].parentNode;
        cropElem.style.overflow = "visible";

        var container = document.createElement("div");
        container.id = "ytrf-cropButtonContainer";
        // container.style.position = "absolute";
        // container.style.bottom = "auto";
        // container.style.top = "100%";
        container.style = "display:flex;align-items:center;position: absolute;bottom: auto;top: 100%;background: #393939;padding: 0px 10px;border-bottom-left-radius: 10px;border-bottom-right-radius: 10px;box-shadow: 5px 10px 10px -6px rgba(0, 0, 0, 0.500);"

        var validBtn = document.createElement("img");
        validBtn.src = chrome.runtime.getURL("images/check.svg");
        validBtn.style = "z-index: 1000;position: relative;width: 30px;cursor: pointer;";

        var separator = document.createElement("div");
        separator.style = "border-left: 2px solid #808080;height: 25px;margin: 0 10px;"

        var closeBtn = document.createElement("img");
        closeBtn.src = chrome.runtime.getURL("images/close.svg");
        closeBtn.style = "z-index: 1000;position: relative;width: 25px;cursor: pointer;";

        validBtn.onclick = validCrop;
        closeBtn.onclick = removeCrop;

        container.append(validBtn);
        container.append(separator);
        container.append(closeBtn);
        cropElem.append(container);
    }

    function validCrop() {
        var title;
        var thumbnailURL;
        var channelName;

        getTitle();
        getThumbnail();
        saveCropData();
        removeCrop();

        function getTitle() {
            var titlehead = document.querySelectorAll("h1.title");
            channelName = document.getElementsByClassName("ytd-channel-name")[0].querySelector("a").innerHTML;

            function SetTitle() {
                if (titlehead.length > 0) {
                    title = titlehead[0].innerText;
                    return true;
                } else {
                    return false;
                }
            }

            if (SetTitle() == false) {
                titlehead = document.querySelectorAll("h1.watch-title-container");
                if (SetTitle() == false)
                    title = location.href;
            }

        }

        function getThumbnail() {
            var video_id = window.location.search.split('v=')[1];
            var ampersandPosition = video_id.indexOf('&');
            if (ampersandPosition != -1) {
                video_id = video_id.substring(0, ampersandPosition);
            }
            console.log("VIDEO ID", video_id);
            thumbnailURL = `https://i.ytimg.com/vi/${video_id}/maxresdefault.jpg`;
        }

        function saveCropData() {
            var isNewVideo = true;
            cropData.forEach(item => {
                if (item.youtubeURL && item.youtubeURL == location.href) {
                    console.log("NOT NEW");
                    item.isNew = false;
                    item.cropSize = crop_coords;
                    item.currentVideoSize = { w: currentWidth, h: currentHeight };
                    isNewVideo = false;
                }
            })
            if (isNewVideo == true) {
                console.log("NEW");
                cropData.push({
                    isNew: true,
                    youtubeTitle: title,
                    channelName: channelName,
                    youtubeURL: location.href,
                    thumbnailURL: thumbnailURL,
                    cropSize: crop_coords,
                    currentVideoSize: { w: currentWidth, h: currentHeight }
                })
            }

            chrome.storage.sync.set({
                cropData: cropData
            })
            chrome.runtime.sendMessage({
                from: "popup",
                subject: "reload"
            });
        }

    }

    function removeCrop() {
        jcrop_api.release();
        jcrop_api.disable();
        jcrop_api.destroy();
        $("#ytrf-ScreenContainer").remove();
    }
}
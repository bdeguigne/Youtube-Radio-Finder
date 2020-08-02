var cropBtn = document.getElementById('cropButton');
var cropBtnDefault = document.getElementById('cropButton-default');
var titleResult = document.getElementById("song-result");
var content = document.querySelector('[contenteditable]');
var reloadBtn = document.getElementById("reloadButton");

var defaultContainer = document.getElementById("default-container");
var mainContainer = document.getElementById("main-container");
var spotifyCover = document.getElementById("spotify-cover");
var coverSpinner = document.getElementById("cover-spinner");

chrome.runtime.onMessage.addListener((message, callback) => {
    if (message.from == "findSong" && message.subject == "getSong") {
        chrome.storage.local.get(["songTitle"], function(res) {
            const tmpResult = titleResult.innerHTML;
            titleResult.innerHTML = res.songTitle
            if (tmpResult === titleResult.innerHTML) {
                spotifyCover.style = "display:block";
                coverSpinner.style = "display:none";
            }
        })
    }
})


var crop = () => {
    console.log("crop")
    chrome.runtime.sendMessage({
        from: "popup",
        subject: "crop"
    });
};

var reload = () => {
    spotifyCover.style = "display:none";
    coverSpinner.style = "display:block";
    chrome.runtime.sendMessage({
        from: "popup",
        subject: "reload"
    })
}

var songInput = "";
titleResult.spellcheck = false;
content.addEventListener("input", function(event) {
    songInput = content.textContent;
})

content.addEventListener('keydown', function(event) {
    if (event.key === "Enter") {
        event.preventDefault();
        titleResult.blur();
    }
})

chrome.storage.local.get(["songTitle"], function(res) {
    titleResult.innerHTML = res.songTitle
})

chrome.storage.sync.get(["cropData"], function(res) {
    var historyData = res.cropData;
    var currentURL = "";
    chrome.tabs.query({ currentWindow: true, active: true }, function(tabs) {
        currentURL = tabs[0].url;
        if (historyData.filter(e => e.youtubeURL === currentURL).length > 0) {
            defaultContainer.style = "display:none";
            mainContainer.style = "display:block";
        } else {
            console.log("NOT CONTAIN");
        }
    });
})

titleResult.addEventListener("blur", function() {
    const content = titleResult.textContent
    chrome.storage.local.set({
        songTitle: content
    })
});

chrome.storage.onChanged.addListener(function(changes) {
    console.log("CHANGESD OMMMMHHGGGG", changes);
    if (changes.cropData) {
        const data = changes.cropData.newValue;

        chrome.tabs.query({ currentWindow: true, active: true }, function(tabs) {
            currentURL = tabs[0].url;
            data.forEach(element => {
                if (element.youtubeURL === currentURL && element.isNew === true) {
                    defaultContainer.style = "display:none";
                    mainContainer.style = "display:block";
                }
            });
        });
    }
    if (changes.spotifySong) {
        spotifyCover.style = "display:block";
        coverSpinner.style = "display:none";
    }
})


cropBtn.onclick = crop;
cropBtnDefault.onclick = crop;
reloadBtn.onclick = reload;
var cropBtn = document.getElementById('cropButton');
var cropBtnDefault = document.getElementById('cropButton-default');
var cropBtnConnect = document.getElementById('cropButton-connect');
var titleResult = document.getElementById("song-result");
var content = document.querySelector('[contenteditable]');
var reloadBtn = document.getElementById("reloadButton");
var reloadBtnConnect = document.getElementById("reloadButton-connect");
var settingsButton = document.getElementById("settings-button");
var defaultContainer = document.getElementById("default-container");
var mainContainer = document.getElementById("main-container");
var spotifyCover = document.getElementById("spotify-cover");
var coverSpinner = document.getElementById("cover-spinner");
var coverSpinnerNoConnected = document.getElementById("cover-spinner-no-connected");
var songResultContainer = document.getElementById("song-result-container");


chrome.runtime.onMessage.addListener((message, callback) => {
    if (message.from == "findSong" && message.subject == "getSong") {
        chrome.storage.local.get(["songTitle"], function(res) {
            const tmpResult = titleResult.innerHTML;
            titleResult.innerHTML = res.songTitle
            if (tmpResult === titleResult.innerHTML) {
                spotifyCover.style = "display:block";
                coverSpinner.style = "display:none";
                coverSpinnerNoConnected.style = "display:none";
                songResultContainer.style = "display:flex";
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

var reloadNoConnected = () => {
    songResultContainer.style = "display:none";
    coverSpinnerNoConnected.style = "display:block";
    chrome.runtime.sendMessage({
        from: "popup",
        subject: "reload"
    })
}

var reload = () => {
    spotifyCover.style = "display:none";
    coverSpinner.style = "display:block";
    chrome.runtime.sendMessage({
        from: "popup",
        subject: "reload"
    })
}

var openSettings = () => {
    console.log("OKAY DUDE WTFFF");
    chrome.runtime.openOptionsPage();
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
    console.log("CHANGESD OMGGGG", changes);
    if (changes.cropData) {
        const data = changes.cropData.newValue;

        chrome.tabs.query({ currentWindow: true, active: true }, function(tabs) {
            currentURL = tabs[0].url;
            data.forEach(element => {
                if (element.youtubeURL === currentURL && element.isNew === true) {
                    console.log("HERE");
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
    if (changes.songTitle) {
        coverSpinnerNoConnected.style = "display:none";
        songResultContainer.style = "display:flex";
    }
})


cropBtn.onclick = crop;
cropBtnDefault.onclick = crop;
cropBtnConnect.onclick = crop;
reloadBtn.onclick = reloadNoConnected;
reloadBtnConnect.onclick = reload;
settingsButton.onclick = openSettings;
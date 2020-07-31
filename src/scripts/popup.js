var cropBtn = document.getElementById('cropButton');
var cropBtnDefault = document.getElementById('cropButton-default');
var titleResult = document.getElementById("song-result");
var reloadBtn = document.getElementById("reloadButton");
var hide = document.getElementById("hideInput");
var formSubmit = document.getElementById("fakeForm");

var defaultContainer = document.getElementById("default-container");
var mainContainer = document.getElementById("main-container");

chrome.runtime.onMessage.addListener((message, callback) => {
    if (message.from == "findSong" && message.subject == "getSong") {
        chrome.storage.local.get(["songTitle"], function(res) {
            titleResult.value = res.songTitle
            resize();
        })
    }
})


function resize() {
    hide.textContent = titleResult.value;
    titleResult.style.width = hide.offsetWidth + "px"
}

var crop = () => {
    console.log("crop")
    chrome.runtime.sendMessage({
        from: "popup",
        subject: "crop"
    });
};

var reload = () => {
    chrome.runtime.sendMessage({
        from: "popup",
        subject: "reload"
    })
}



formSubmit.addEventListener("submit", function(e) {
    titleResult.blur();
    e.preventDefault();
});

titleResult.addEventListener("input", resize);

chrome.storage.local.get(["songTitle"], function(res) {
    titleResult.value = res.songTitle
    resize();
})

chrome.storage.sync.get(["cropData"], function(res) {
    var historyData = res.cropData;
    var currentURL = "";
    chrome.tabs.query({ currentWindow: true, active: true }, function(tabs) {
        console.log("OKAY TAAAB", tabs[0].url);
        currentURL = tabs[0].url;
        console.log("CURERNT", currentURL);
        if (historyData.filter(e => e.youtubeURL === currentURL).length > 0) {
            console.log("CONTAIN");
            defaultContainer.style = "display:none";
            mainContainer.style = "display:block";
        } else {
            console.log("NOT CONTAIN");
        }
    });
})

titleResult.addEventListener("blur", function() {
    console.log("LOST FOCUS", titleResult.value);
    chrome.storage.local.set({
        songTitle: titleResult.value
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
})


cropBtn.onclick = crop;
cropBtnDefault.onclick = crop;
reloadBtn.onclick = reload;
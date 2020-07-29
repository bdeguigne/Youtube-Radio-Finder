var bkg = chrome.extension.getBackgroundPage();

// document.addEventListener('DOMContentLoaded', function() {
//     chrome.runtime.sendMessage('takeScreenshot');
//     // Do something, e.g. send a message to content or background script
// });

chrome.runtime.onMessage.addListener((message, callback) => {
    if (message.from == "findSong" && message.subject == "getSong") {
        chrome.storage.local.get(["songTitle"], function (res) {
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

var cropBtn = document.getElementById('ytrf-cropButton');
var titleResult = document.getElementById("ytrf-result");
var reloadBtn = document.getElementById("ytrf-reloadButton");
var hide = document.getElementById("ytrf-hideInput");
var titleSubmit = document.getElementById("ytrf-titleSubmit");
var formSubmit = document.getElementById("ytrf-fakeForm");


formSubmit.addEventListener("submit", function(e) {
    titleResult.blur();
    e.preventDefault();
});

titleResult.addEventListener("input", resize);

chrome.storage.local.get(["songTitle"], function (res) {
    titleResult.value = res.songTitle
    resize();
})

titleResult.addEventListener("blur", function () {
    console.log("LOST FOCUS", titleResult.value);
    chrome.storage.local.set({
        songTitle: titleResult.value
    })
}); 

cropBtn.onclick = crop;
reloadBtn.onclick = reload;
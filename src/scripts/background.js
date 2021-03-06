chrome.runtime.onInstalled.addListener(function() {
    chrome.storage.sync.set({
        cropData: []
    }, );
    chrome.storage.local.set({
        songTitle: null,
        spotify: {
            accessToken: null,
            refreshToken: null
        },
        spotifySong: {
            title: null,
            artists: null,
            coverUrl: null
        }
    })

    chrome.declarativeContent.onPageChanged.removeRules(undefined, function() {
        chrome.declarativeContent.onPageChanged.addRules([{
            conditions: [new chrome.declarativeContent.PageStateMatcher({
                pageUrl: { hostEquals: 'www.youtube.com' },
                css: ["video"]
            })],
            actions: [new chrome.declarativeContent.ShowPageAction()]
        }]);
    });
});

chrome.runtime.onMessage.addListener(function(message, callback) {
    if (message.from == "popup" && message.subject == "crop") {
        chrome.tabs.executeScript(null, { file: "lib/jcrop/jquery.min.js" }, function() {
            chrome.tabs.executeScript(null, { file: "lib/jcrop/jquery.Jcrop.min.js" }, function() {
                chrome.tabs.insertCSS(null, { file: "lib/jcrop/jquery.Jcrop.min.css" }, function() {
                    chrome.tabs.executeScript(null, {
                        file: 'src/scripts/cropYoutubePlayer.js'
                    });
                });
            });
        });
    }

    if (message.from == "popup" && message.subject == "reload") {
        chrome.tabs.executeScript(null, { file: "lib/tesseract/tesseract.min.js" }, function() {
            chrome.tabs.executeScript(null, {
                file: 'src/scripts/findSong.js'
            });
        });
    }
});
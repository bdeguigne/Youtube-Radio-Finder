var navHistory = document.getElementById("nav-history");
var navSpotify = document.getElementById("nav-spotify");
var navAbout = document.getElementById("nav-about");

var historyContainer = document.getElementById("history-container");
var spotifyContainer = document.getElementById("spotify-container");
var aboutContainer = document.getElementById("about-container");
var spotifyDisconnect = document.getElementById("spotify-disconnect");
var connectedUserContainer = document.getElementById("connected-user");
var nonConnectedUserContainer = document.getElementById("non-connected-user");
var spotifyLoginBtn = document.getElementById("spotify-login");
var spinner = document.getElementById("spinner");
var notLoggedh1 = document.getElementById("not-logged-h1");

var scopes = 'user-library-modify playlist-read-private playlist-modify-private playlist-modify-public';
var client_id = config.spotify_client_id;
var client_secret = config.spotify_client_secret;

chrome.storage.local.get(["spotify"], function(res) {
    if (res.spotify.accessToken && res.spotify.refreshToken) {
        // access_token.innerHTML = res.spotify.accessToken;
        // refresh_token.innerHTML = res.spotify.refreshToken;
        printSpotifyUser(res.spotify);

    } else {
        nonConnectedUserContainer.style = "display:flex";
        connectedUserContainer.style = "display:none";
    }
})

chrome.storage.onChanged.addListener(function(changes) {
    if (changes.spotify) {
        // printSpotifyUser(changes.spotify.newValue);
        if (changes.spotify.newValue.accessToken && changes.spotify.newValue.refreshToken) {
            printSpotifyUser(changes.spotify.newValue);
        }
    }
})

function printHistory() {
    var historyCardsContainer = document.getElementById("history-cards-container");

    function removeCropData(data, url, element) {
        data.splice(data.findIndex(item => item.youtubeURL === url), 1);
        chrome.storage.sync.set({ cropData: data })
        historyCardsContainer.removeChild(element);
    }

    function createCard(thumbnailURL, youtubeTitle, youtubeChannel, youtubeURL, historyData) {
        var historyCard = document.createElement("div");
        historyCard.className = "history-card";

        var thumbnailContainer = document.createElement("div");
        thumbnailContainer.className = "thumbnail-container";
        thumbnailContainer.onclick = () => window.open(youtubeURL, '_blank');
        var img = document.createElement("img");
        img.src = thumbnailURL;
        thumbnailContainer.appendChild(img);

        var cardContent = document.createElement("div");
        cardContent.className = "card-content";

        var historyContent = document.createElement("div");
        historyContent.className = "history-content";
        var videoTitle = document.createElement("p");
        videoTitle.innerHTML = youtubeTitle;
        var channelName = document.createElement("p");
        channelName.innerHTML = youtubeChannel;
        historyContent.appendChild(videoTitle);
        historyContent.appendChild(channelName);

        var removeButton = document.createElement("div");
        removeButton.className = "remove-button";
        var icon = document.createElement("i");
        icon.className = "fas fa-times";
        removeButton.appendChild(icon);
        removeButton.onclick = () => removeCropData(historyData, youtubeURL, historyCard);

        cardContent.appendChild(historyContent);
        cardContent.appendChild(removeButton);

        historyCard.appendChild(thumbnailContainer);
        historyCard.appendChild(cardContent);

        historyCardsContainer.appendChild(historyCard);
    }

    // var thumbnail = document.getElementById("thumbnail");
    chrome.storage.sync.get(["cropData"], function(res) {
        var historyData = res.cropData;
        historyData.forEach((item) => {
            createCard(item.thumbnailURL, item.youtubeTitle, item.channelName, item.youtubeURL, historyData);
        })
    })
}



function printSpotifyUser(spotifyData) {
    var spotifyUserName = document.getElementById("spotify-username");
    var spotifyAvatar = document.getElementById("spotify-avatar");
    request();

    function request() {
        const headers = {
            'Authorization': 'Bearer ' + spotifyData.accessToken,
            "Accept": "application/json",
            "Content-Type": "application/json",
        }

        fetch("https://api.spotify.com/v1/me", {
                headers,
            })
            .then((res) => res.json())
            .then(function(data) {
                if (data.error && data.error.message === "The access token expired") {
                    refreshToken();
                }
                if (data.images[0]) {
                    spotifyAvatar.src = data.images[0].url;
                } else {
                    spotifyAvatar.src = "../../images/avatar-placeholder.png";
                }
                spotifyUserName.innerHTML = data.display_name;
                notLoggedh1.style = "display:block";
                spinner.style = "display:none";
                connectedUserContainer.style = "display:flex";
                nonConnectedUserContainer.style = "display:none";
            })
    }

    function refreshToken() {

        const url = 'https://accounts.spotify.com/api/token';
        const encodedData = window.btoa(client_id + ":" + client_secret);
        const data = {
            grant_type: 'refresh_token',
            refresh_token: spotifyData.refreshToken
        };
        const headers = {
            'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
            'Authorization': "Basic " + encodedData,
        };

        const searchParams = new URLSearchParams();
        Object.keys(data).forEach(prop => {
            searchParams.set(prop, data[prop]);
        });

        fetch(url, {
                method: 'POST',
                headers,
                body: searchParams,
            })
            .catch(error => {
                showErrorSnackBar("Error, please reload the page");
            })
            .then(res => res.json())
            .then(credentials => {
                chrome.storage.local.set({
                    spotify: {
                        accessToken: credentials.access_token,
                        refreshToken: spotifyData.refreshToken
                    }
                });
            });
    }
}


function disconnectUser() {
    chrome.storage.local.set({
        spotify: {
            accessToken: null,
            refreshToken: null,
        }
    })
    connectedUserContainer.style = "display:none";
    nonConnectedUserContainer.style = "display:flex"
}

function spotifyLogin() {
    notLoggedh1.style = "display:none";
    spinner.style = "display:block";
    var redirect_uri = chrome.identity.getRedirectURL("spotifycallback");

    var getParams = function(url) {
        var params = {};
        var parser = document.createElement('a');
        parser.href = url;
        var query = parser.search.substring(1);
        var vars = query.split('&');
        for (var i = 0; i < vars.length; i++) {
            var pair = vars[i].split('=');
            params[pair[0]] = decodeURIComponent(pair[1]);
        }
        return params;
    };

    chrome.identity.launchWebAuthFlow({
        url: 'https://accounts.spotify.com/authorize' +
            '?response_type=code' +
            '&client_id=' + client_id +
            (scopes ? '&scope=' + encodeURIComponent(scopes) : '') +
            '&redirect_uri=' + encodeURIComponent(redirect_uri),
        interactive: true
    }, function(token) {
        var params = getParams(token);
        if (params.code)
            getToken(params.code);
    });

    function getToken(spotifyCode) {
        const url = 'https://accounts.spotify.com/api/token';
        const data = {
            grant_type: 'authorization_code',
            code: spotifyCode,
            redirect_uri: redirect_uri,
            client_id: client_id,
            client_secret: client_secret,
        };
        const headers = {
            'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        };

        const searchParams = new URLSearchParams();
        Object.keys(data).forEach(prop => {
            searchParams.set(prop, data[prop]);
        });

        fetch(url, {
                method: 'POST',
                headers,
                body: searchParams,
            })
            .then(res => res.json())
            .then(credentials => {
                chrome.storage.local.set({
                    spotify: {
                        firstConnection: true,
                        accessToken: credentials.access_token,
                        refreshToken: credentials.refresh_token
                    }
                });
                showSuccessSnackBar("Login successfull");
            })
    }
}

function showHistory() {
    historyContainer.style = "display:flex";
    spotifyContainer.style = "display:none";
    aboutContainer.style = "display:none";

    navHistory.className = "active";
    navSpotify.className = "";
    navAbout.className = "";
}

function showSpotify() {
    historyContainer.style = "display:none";
    spotifyContainer.style = "display:flex";
    aboutContainer.style = "display:none";

    navHistory.className = "";
    navSpotify.className = "active";
    navAbout.className = "";
}

function showAbout() {
    historyContainer.style = "display:none";
    spotifyContainer.style = "display:none";
    aboutContainer.style = "display:flex";

    navHistory.className = "";
    navSpotify.className = "";
    navAbout.className = "active";
}

function showSuccessSnackBar(text) {
    var snackbarText = document.getElementById("success-snackbar-text");
    var successSnackbar = document.getElementById("success-snackbar");

    snackbarText.innerHTML = text;
    successSnackbar.className = "snackbar success show";
    setTimeout(function() {
        successSnackbar.className = successSnackbar.className.replace("show", "");
    }, 3000);
}

function showErrorSnackBar(text) {
    var snackbarText = document.getElementById("error-snackbar-text");
    var errorSnackbar = document.getElementById("error-snackbar");

    snackbarText.innerHTML = text;
    errorSnackbar.className = "snackbar error show";
    setTimeout(function() {
        errorSnackbar.className = errorSnackbar.className.replace("show", "");
    }, 3000);
}

printHistory();
navHistory.onclick = showHistory;
navSpotify.onclick = showSpotify;
navAbout.onclick = showAbout;
spotifyDisconnect.onclick = disconnectUser;
spotifyLoginBtn.onclick = spotifyLogin;
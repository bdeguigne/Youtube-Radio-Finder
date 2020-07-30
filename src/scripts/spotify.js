var spotifyLogButton = document.getElementById("ytrf-SpotifyLogin");
var spotifyLogoutButton = document.getElementById("ytrf-SpotifyLogout");
var spotifyContainer = document.getElementById("ytrf-SpotifyContainer");

var SpotifyCover = document.getElementById("ytrf-SpotifyCover");
var SpotifyTitle = document.getElementById("ytrf-SpotifyTitle");
var SpotifyArtists = document.getElementById("ytrf-SpotifyArtists");


spotifyLogButton.onclick = authorizeUser;

isLog();

function isLog() {
    chrome.storage.local.get(["spotify"], function (res) {
        if (res.spotify.accessToken && res.spotify.refreshToken) {
            HideLogin(res.spotify);
        }
    });
    chrome.storage.local.get(["spotifySong"], function (res) {
        SpotifyCover.src = res.spotifySong.coverUrl;
        SpotifyTitle.innerHTML = res.spotifySong.title;
        SpotifyArtists.innerHTML = res.spotifySong.artists
    })

    chrome.storage.onChanged.addListener(function (changes) {
        if (changes.spotify) {
            HideLogin(changes.spotify.newValue);
        }
        else if (changes.spotifySong) {
            SpotifyCover.src = changes.spotifySong.newValue.coverUrl;
            SpotifyTitle.innerHTML = changes.spotifySong.newValue.title;
            SpotifyArtists.innerHTML = changes.spotifySong.newValue.artists
        }
    })

    function HideLogin(data) {
        if (data.accessToken && data.refreshToken) {
            spotifyLogButton.style = "display:none;";
            spotifyContainer.style = "display:block;"
            searchSong(data.accessToken);
        }
        else {
            spotifyLogButton.style = "display:block;";
            spotifyContainer.style = "display:none;"
        }
    }
}


function authorizeUser() {

    var client_id = "";
    var client_secret = ""
    var scopes = 'user-read-private user-read-email';
    var redirect_uri = chrome.identity.getRedirectURL("spotifycallback");

    var getParams = function (url) {
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
    }, function (token) {
        console.log(token);
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
                console.log(credentials);
                chrome.storage.local.set({
                    spotify: {
                        accessToken: credentials.access_token,
                        refreshToken: credentials.refresh_token
                    }
                });
            })
    }
}


function searchSong(accessToken) {
    var token = accessToken;
    var song;

    spotifyLogoutButton.onclick = disconnectUser;
    chrome.storage.local.get(["songTitle"], function (res) {
        song = res.songTitle
        getCurrentSong();
    })
    chrome.storage.onChanged.addListener(function (changes) {
        if (changes.songTitle) {
            song = changes.songTitle.newValue
            getCurrentSong();
        }
    });

    function getCurrentSong() {
        console.log("IN GET SONG", song);
        request();

        function request() {
            var title = encodeURIComponent(song);
            const url = "https://api.spotify.com/v1/search?q=" + title
            const headers = {
                "Authorization": "Bearer " + token
            }

            fetch(url + "&type=track", {
                headers
            })
                .then((res) => res.json())
                .then(function (data) {
                    if (data.tracks.items[0]) {
                        saveSong(data.tracks.items[0])
                    }
                    else {
                        console.log("Not found");
                        chrome.storage.local.set({
                            spotifySong: {
                                title: "Song not found",
                                artists: "",
                                coverUrl: "../../images/ytrf-unknown.png",
                            }
                        })
                    }
                })
        }

        function saveSong(songData) {
            console.log("FIND ! ", songData);
            const title = songData.name;
            const coverImage = songData.album.images[1].url;
            var artists = null;
            songData.artists.forEach(function (artist) {
                if (artists == null)
                    artists = artist.name;
                else
                    artists = artists + ", " + artist.name
            })
            console.log(title, artists, coverImage);
            chrome.storage.local.set({
                spotifySong: {
                    title: title,
                    artists: artists,
                    coverUrl: coverImage
                }
            })
        }
    }

    function disconnectUser() {
        chrome.storage.local.set({
            spotify: {
                accessToken: null,
                refreshToken: null,
            }
        })
    }
}
var spotifyLogButton = document.getElementById("spotify-login");
var connectContainer = document.getElementById("connect-container");
var spotifyLogoutButton = document.getElementById("ytrf-SpotifyLogout");
var spotifyContainer = document.getElementById("spotify-container");
var disconnectSpotifyBtn = document.getElementById("disconnectSpotifyBtn");

var SpotifyCover = document.getElementById("spotify-cover");
var SpotifyTitle = document.getElementById("song-title");
var SpotifyArtists = document.getElementById("artist-name");

var spotifyPlaylistBtn = document.getElementById("spotify-playlist");
var spotifyLikeBtn = document.getElementById("spotify-like");
var spotifyAlbumBtn = document.getElementById("spotify-album");
var choosePlaylistContainer = document.getElementById("choose-playlist");
var closePlaylistBtn = document.getElementById("close-playlist-button");
var tooltipPlaylist = document.getElementById("playlist-tooltip");
var playlistList = document.getElementById("playlist-list");

spotifyLogButton.onclick = authorizeUser;

spotifyPlaylistBtn.onclick = addToPlaylist;
spotifyLikeBtn.onclick = likeSong;
spotifyAlbumBtn.onclick = seeAlbum;
closePlaylistBtn.onclick = hidePlaylist;
isLog();

var client_id = config.spotify_client_id;
var client_secret = config.spotify_client_secret;
var spotifyData = {};
var songData = {};

function isLog() {
    chrome.storage.local.get(["spotify"], function(res) {
        if (res.spotify.accessToken && res.spotify.refreshToken) {
            spotifyData = res.spotify;
            HideLogin();
        }
    });
    chrome.storage.local.get(["spotifySong"], function(res) {
        SpotifyCover.src = res.spotifySong.coverUrl;
        SpotifyTitle.innerHTML = res.spotifySong.title;
        SpotifyArtists.innerHTML = res.spotifySong.artists;
        songData = res.spotifySong;
    })

    chrome.storage.onChanged.addListener(function(changes) {
        if (changes.spotify) {
            console.log("ON CHANGE SPOTIFY DATA");
            HideLogin(changes.spotify.newValue);
        } else if (changes.spotifySong) {
            SpotifyCover.src = changes.spotifySong.newValue.coverUrl;
            SpotifyTitle.innerHTML = changes.spotifySong.newValue.title;
            SpotifyArtists.innerHTML = changes.spotifySong.newValue.artists
            songData = changes.spotifySong.newValue;
        }
    })

    function HideLogin() {
        if (spotifyData.accessToken && spotifyData.refreshToken) {
            console.log("IN HIDE LOGIN");
            connectContainer.style = "display:none;";
            spotifyContainer.style = "display:block;"
            searchSong(spotifyData.accessToken);
        } else {
            console.log("IN HIDE LOGIN ELSE");
            connectContainer.style = "display:block;";
            spotifyContainer.style = "display:none;"
        }
    }
}

function refreshToken() {
    console.log("IN REFRESH TOKEN", spotifyData);

    const url = 'https://accounts.spotify.com/api/token';
    const encodedData = window.btoa(client_id + ":" + client_secret);
    // const encodedClientId = window.btoa(client_id);
    // const encodedClientSecret = window.btoa(client_secret);
    // console.log("ENCODED", encodedClientId, encodedClientSecret);
    const data = {
        grant_type: 'refresh_token',
        refresh_token: spotifyData.refreshToken
            // redirect_uri: redirect_uri,
            // client_id: client_id,
            // client_secret: client_secret,
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
            console.log("REFRESH ERROR", error);
        })
        .then(res => res.json())
        .then(credentials => {
            console.log(credentials);
            chrome.storage.local.set({
                spotify: {
                    accessToken: credentials.access_token,
                    refreshToken: spotifyData.refreshToken
                }
            });
        });
}

function authorizeUser() {
    var scopes = 'user-read-private user-read-email user-library-modify playlist-read-private playlist-modify-private playlist-modify-public';
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

    disconnectSpotifyBtn.onclick = disconnectUser;
    chrome.storage.local.get(["songTitle"], function(res) {
        song = res.songTitle
        getCurrentSong();
    })
    chrome.storage.onChanged.addListener(function(changes) {
        if (changes.songTitle) {
            song = changes.songTitle.newValue
            getCurrentSong();
        }
    });

    function getCurrentSong() {
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
                .then(function(data) {
                    if (data.error && data.error.message === "The access token expired") {
                        refreshToken();
                    } else if (data.tracks.items[0]) {
                        saveSong(data.tracks.items[0])
                    } else {
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
            console.log(songData);
            const title = songData.name;
            const coverImage = songData.album.images[1].url;
            const songId = songData.id;
            const albumURL = songData.album.external_urls.spotify;
            const songURI = songData.uri;
            var artists = null;
            songData.artists.forEach(function(artist) {
                if (artists == null)
                    artists = artist.name;
                else
                    artists = artists + ", " + artist.name
            })
            chrome.storage.local.set({
                spotifySong: {
                    title: title,
                    artists: artists,
                    coverUrl: coverImage,
                    id: songId,
                    albumURL: albumURL,
                    songURI: songURI
                }
            })
        }
    }

    function disconnectUser() {
        console.log("disconnect")
        chrome.storage.local.set({
            spotify: {
                accessToken: null,
                refreshToken: null,
            }
        })
    }
}

function likeSong() {
    if (songData.id) {
        const songId = songData.id;
        const url = 'https://api.spotify.com/v1/me/tracks';
        const headers = {
            'Authorization': "Bearer " + spotifyData.accessToken,
            "Content-Type": "application/json"
        };
        const data = {
            "ids": [songId]
        }

        fetch(url, {
                method: 'PUT',
                headers: headers,
                body: JSON.stringify(data)
            })
            .then(res => {
                console.log(res);
            });
    } else {
        console.log("Cannot like song");
    }

}

function seeAlbum() {
    if (songData.albumURL) {
        const URL = songData.albumURL;
        window.open(URL, '_blank');
    } else {
        console.log("album not found");
    }
}

function hidePlaylist() {
    console.log("HIDE PLAYLIST");
    choosePlaylistContainer.style = "visibility: hidden; opacity: 0;"
    tooltipPlaylist.style = "visibility: visible;"
}

function addToPlaylist() {
    choosePlaylistContainer.style = "visibility: visible; opacity: 1;"
    tooltipPlaylist.style = "visibility: hidden;"
    const url = 'https://api.spotify.com/v1/me/playlists';
    const headers = {
        'Authorization': "Bearer " + spotifyData.accessToken,
    };
    fetch(url, {
            method: 'GET',
            headers: headers,
        })
        .then(res => res.json())
        .then(data => {
            console.log(data);
            data.items.forEach(element => {
                const playlistName = element.name;
                const playlistID = element.id;
                var entry = document.createElement("li");
                entry.onclick = function() {
                    onClickPlaylist(playlistID);
                }
                entry.appendChild(document.createTextNode(playlistName));
                playlistList.appendChild(entry);
            });
        });

    function onClickPlaylist(playlistID) {
        console.log("On click PLaylist", playlistID, songData);
        const songURI = songData.songURI;

        const url = `https://api.spotify.com/v1/playlists/${playlistID}/tracks`;
        const headers = {
            'Authorization': "Bearer " + spotifyData.accessToken,
            "Content-Type": "application/json"
        };
        const data = {
            "uris": [songURI]
        }

        fetch(url, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify(data)
            })
            .then(res => {
                console.log("ADD PLAYLIST RES", res);
            });
    }
}
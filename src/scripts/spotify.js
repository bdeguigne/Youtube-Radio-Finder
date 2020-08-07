var spotifyLogButton = document.getElementById("spotify-login");
var connectContainer = document.getElementById("connect-container");
var spotifyLogoutButton = document.getElementById("ytrf-SpotifyLogout");
var spotifyContainer = document.getElementById("spotify-container");

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
var navPlaylist = document.getElementById("nav-playlist");
var playlistSpinner = document.getElementById("playlist-spinner");
var playlistPermission = document.getElementById("playlist-permission");
var spotifyNoData = document.getElementById("spotify-no-data");
var spotifySongData = document.getElementById("spotify-song-data");

spotifyLogButton.onclick = authorizeUser;

spotifyPlaylistBtn.onclick = addToPlaylist;
spotifyLikeBtn.onclick = likeSong;
spotifyAlbumBtn.onclick = seeAlbum;
closePlaylistBtn.onclick = hidePlaylist;
isLog();

var scopes = 'user-read-private user-read-email user-library-modify playlist-read-private playlist-modify-private playlist-modify-public';
var client_id = config.spotify_client_id;
var client_secret = config.spotify_client_secret;

var spotifyData = {};
var songData = {};
var userPlaylist = undefined;


function isLog() {
    chrome.storage.local.get(["spotify"], function(res) {
        if (res.spotify.accessToken && res.spotify.refreshToken) {
            spotifyData = res.spotify;
            HideLogin(spotifyData, false);
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
            console.log("ON CHANGE SPOTIFY DATA", changes.spotify);
            HideLogin(changes.spotify.newValue, true);
        } else if (changes.spotifySong) {
            SpotifyCover.src = changes.spotifySong.newValue.coverUrl;
            SpotifyTitle.innerHTML = changes.spotifySong.newValue.title;
            SpotifyArtists.innerHTML = changes.spotifySong.newValue.artists
            songData = changes.spotifySong.newValue;
        }
    })

    function HideLogin(spotifyData, isFirstConnection) {
        console.log(spotifyData);
        if (spotifyData.accessToken && spotifyData.refreshToken) {
            if (isFirstConnection) {
                showSuccessSnackBar("Successfully logged in");
            }
            console.log("IN HIDE");
            connectContainer.style = "display:none;";
            spotifyContainer.style = "display:block;";
            spotifyNoData.style = "display:none";
            spotifySongData.style = "display:block";
            searchSong(spotifyData.accessToken);
        } else {
            console.log("IN HIDE LOGIN ELSE");
            connectContainer.style = "display:flex;";
            spotifyContainer.style = "display:none;";
            spotifySongData.style = "display:none";
            spotifyNoData.style = "display:block";
            showErrorSnackBar("Cannot log with Spotify, please retry");
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
            chrome.storage.local.set({
                spotify: {
                    accessToken: credentials.access_token,
                    refreshToken: spotifyData.refreshToken
                }
            });
        });
}

function authorizeUser() {
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
            })
    }
}


function searchSong(accessToken) {
    var token = accessToken;
    var song;
    var isCorrected = false;

    chrome.storage.local.get(["songTitle"], function(res) {
        song = res.songTitle
        getCurrentSong(song);
    })
    chrome.storage.onChanged.addListener(function(changes) {
        if (changes.songTitle) {
            song = changes.songTitle.newValue
            getCurrentSong(song);
        }
    });

    function getCurrentSong(song) {
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
                        spotifyContainer.className = "";
                        saveSong(data.tracks.items[0]);
                        isCorrected = false;
                    } else {
                        if (isCorrected === false) {
                            correctSong(song);
                        } else {
                            isCorrected = false;
                            chrome.storage.local.set({
                                spotifySong: {
                                    title: "Song not found",
                                    artists: "",
                                    coverUrl: "../../images/ytrf-unknown.png",
                                }
                            })
                            spotifyContainer.className = "disable";
                        }
                    }
                })
        }

        function correctSong() {
            console.log("TrIGGER CORRECT SONG", song);
            const removeChars = "x w & ft w/ by ft.";
            const splitedRemoveChars = removeChars.split(" ");

            if (song.indexOf(" - ") > -1) {
                const splittedSong = song.split(" - ");
                const artist = splittedSong[0];
                const title = splittedSong[1];
                var currentFeatSeperator = "";
                var correctedTitle = "";
                var isArtistFeat = true;

                splitedRemoveChars.forEach(element => {
                    if (artist.indexOf(" " + element + " ") > -1) {
                        currentFeatSeperator = element;
                    }
                })
                if (currentFeatSeperator === "") {
                    splitedRemoveChars.forEach(element => {
                        if (title.indexOf(" " + element + " ") > -1) {
                            currentFeatSeperator = element;
                            isArtistFeat = false;
                        }
                    })
                }

                if (currentFeatSeperator != "") {
                    if (isArtistFeat) {
                        const splited = artist.split(" " + currentFeatSeperator + " ");
                        correctedTitle = splited[0] + " " + title
                    } else {
                        const splited = title.split(" " + currentFeatSeperator + " ");
                        correctedTitle = splited[0] + " " + artist
                    }
                } else {
                    correctedTitle = artist + " " + title
                }
                isCorrected = true;
                getCurrentSong(correctedTitle);
            } else {
                console.log("Cannot separate artist and song");
                isCorrected = true;
                getCurrentSong(song);
            }

        }

        function correctWithLastFM() {
            const url = `http://ws.audioscrobbler.com/2.0/?method=track.search&track=${song}&api_key=${config.lastfm_api_key}&format=json`;

            fetch(url, {
                    method: 'GET',
                })
                .then(res => res.json())
                .then(res => {
                    const trackData = res.results.trackmatches.track[0];
                    const title = trackData.name;
                    const artist = trackData.artist;
                });
        }

        function saveSong(songData) {
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
                showSuccessSnackBar("Song liked");
            });
    } else {
        showErrorSnackBar("Cannot like song");
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
    playlistList.innerHTML = "";
    playlistPermission.style = "display:none";
}

function addToPlaylist() {
    console.log()
    choosePlaylistContainer.style = "visibility: visible; opacity: 1;"
    tooltipPlaylist.style = "visibility: hidden;"
    navPlaylist.style = "display:none;";
    playlistSpinner.style = "display:flex;";
    if (!spotifyData.accessToken) {
        showErrorSnackBar("Error, please retry");
    } else {
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
                if (data.error && data.error.message === "The access token expired") {
                    alert("Refresh token addtoplaylist");
                    // refreshToken();
                    // addToPlaylist();
                } else if (data.items.length > 0) {
                    console.log("LENGTH", data.items.length);
                    data.items.forEach(element => {
                        const playlistName = element.name;
                        const playlistID = element.id;
                        var entry = document.createElement("li");
                        entry.onclick = function() {
                            onClickPlaylist(playlistID, playlistName);
                        }
                        entry.appendChild(document.createTextNode(playlistName));
                        playlistList.appendChild(entry);
                    });
                } else {
                    var entry = document.createElement("h2");
                    entry.style = "display: flex;justify-content: center;align-items: center;height: 100%;font-size: 1rem;margin-bottom:0"
                    entry.innerHTML = "You don't have any playlists";
                    playlistList.appendChild(entry);
                }
                navPlaylist.style = "display:block;";
                playlistSpinner.style = "display:none;";
            });
    }

    function onClickPlaylist(playlistID, playlistName) {
        navPlaylist.style = "display:none;";
        playlistSpinner.style = "display:flex;";
        console.log("On click Playlist", playlistID, songData);
        const songURI = songData.songURI;
        const url = `https://api.spotify.com/v1/playlists/${playlistID}`

        findSongInPlaylist(url);

        function findSongInPlaylist(url) {
            console.log("IN find song", url);
            // ?fields=tracks.items(track(id))
            const headers = {
                'Authorization': "Bearer " + spotifyData.accessToken,
            }

            fetch(url, {
                    method: "GET",
                    headers: headers
                })
                .then(res => res.json())
                .then(data => {
                    if (data.error) {
                        showErrorSnackBar("Cannot add in playlist");
                    } else {
                        var songs;
                        if (data.tracks) {
                            songs = data.tracks;
                        } else {
                            songs = data;
                        }
                        console.log(data, songs, songData);
                        if (songs.items) {
                            var isExist = false;
                            songs.items.forEach(element => {
                                if (element.track.id) {
                                    if (element.track.id === songData.id) {
                                        console.log("FIND", element.track.name);
                                        isExist = true;
                                    }
                                } else {
                                    isExist = false;
                                }
                            })
                            console.log(isExist);
                            if (isExist === false && songs.next !== null) {
                                findSongInPlaylist(songs.next);
                            } else if (isExist === false) {
                                hidePlaylist()
                                addTrack();
                            } else if (isExist === true) {
                                askPermission();
                            }
                        }
                    }
                })
        }

        function addTrack() {
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
                .then(res => res.json())
                .then(data => {
                    if (data.error) {
                        showErrorSnackBar("Cannot add in playlist");
                    } else {
                        showSuccessSnackBar("Successfully added in : " + playlistName);
                    }
                })
        }

        function askPermission() {
            console.log("SONG ALREADY EXIST ASK PERMISSION");
            playlistSpinner.style = "display:none";
            navPlaylist.style = "display:none";
            playlistPermission.style = "display:flex";
            var yesButton = document.getElementById("permission-yes");
            var noButton = document.getElementById("permission-no");

            noButton.onclick = () => hidePlaylist();
            yesButton.onclick = () => {
                addTrack();
                hidePlaylist();
            };
        }
    }
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
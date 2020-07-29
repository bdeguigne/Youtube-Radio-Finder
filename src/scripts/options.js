var container = document.getElementById("historyContainer");

const spotifyAvatar = document.getElementById("spotifyAvatar");
const spotifyUserName = document.getElementById("spotifyUserName");

const access_token = document.getElementById("accessToken");
const refresh_token = document.getElementById("refreshToken");
chrome.storage.local.get(["spotify"], function(res) {
    if (res.spotify.accessToken && res.spotify.refreshToken) {
        access_token.innerHTML = res.spotify.accessToken;
        refresh_token.innerHTML = res.spotify.refreshToken;
        printSpotifyUser(res.spotify.accessToken);
    }
})

function removeCropData(data, url, element) {
  console.log("REMOVE", url);
  data.splice(data.findIndex(item => item.youtubeURL === url), 1);
  chrome.storage.sync.set({ cropData: data })
  container.removeChild(element);
}

function printHistory() {
  chrome.storage.sync.get(["cropData"], function (res) {
    var historyData = res.cropData;
    historyData.forEach((item) => {
      console.log(item);
      var node = document.createElement("div");
      var link = document.createElement("a");
      link.href = item.youtubeURL;
      link.innerHTML = item.youtubeTitle;

      var spanButton = document.createElement("span");
      var removeButton = document.createElement("button");
      removeButton.innerHTML = "remove";
      removeButton.setAttribute("link", item.youtubeURL);
      removeButton.onclick = function () { removeCropData(historyData, item.youtubeURL, node) }
      spanButton.appendChild(removeButton);

      node.appendChild(link);
      node.appendChild(removeButton);

      container.appendChild(node);
    })
  })
}

function printSpotifyUser(accessToken) {
  console.log(accessToken);
  const headers = {
    'Authorization': 'Bearer ' + accessToken,
    "Accept": "application/json",
    "Content-Type": "application/json",
  }

  fetch("https://api.spotify.com/v1/me", {
    headers,
  })
  .then((res) => res.json())
  .then(function(data) {
    console.log("HEYYYy", data);
    spotifyAvatar.src = data.images[0].url;
    spotifyUserName.innerHTML = data.display_name;
  })
}

printHistory();
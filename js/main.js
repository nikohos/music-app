let currentOffset = 0; // Pitää kirjaa siitä, montako albumia on jo ladattu sivutusta varten.
let currentArtistId = null; // Tallentaa tällä hetkellä haetun artistin ID:n.

function showMessage(message) {
    // Näyttää viestin sivun yläosassa olevalle ilmoitusalueelle.
    const notificationContainer = document.getElementById('notification-container');
    if (notificationContainer) {
        notificationContainer.textContent = message;
        notificationContainer.classList.add('show');
        setTimeout(() => {
            notificationContainer.classList.remove('show');
        }, 3000); // Piilottaa viestin 3 sekunnin kuluttua.
    } else {
        console.log(`Notification: ${message}`); // Jos ilmoitusaluetta ei löydy, tulostetaan viesti konsoliin.
    }
}

document.getElementById("searchForm").addEventListener("submit", async function (e) {
    e.preventDefault(); // Estää sivun uudelleenlatauksen lomakkeen lähetyksen yhteydessä.

    const artistName = document.getElementById("artistInput").value.trim(); // Hakee hakukentän arvon ja poistaa ylimääräiset välilyönnit.
    const resultsDiv = document.getElementById("results"); // Viittaus hakutulosten näyttämiseen varattuun diviin.
    const loadMoreButton = document.getElementById("loadMoreButton"); // Viittaus "Show more" -nappiin.

    resultsDiv.innerHTML = ""; // Tyhjentää edelliset hakutulokset.
    loadMoreButton.style.display = "none"; // Piilottaa "Show more" -napin uuden haun alkaessa.
    currentOffset = 0; // Nollaa offsetin uutta hakua varten.
    currentArtistId = null; // Nollaa tallennetun artistin ID:n uutta hakua varten.

    if (!artistName) {
        showMessage("Enter an artist name."); // Näyttää virheilmoituksen, jos hakukenttä on tyhjä.
        return; // Lopettaa funktion suorituksen.
    }

    try {
        const data = await fetchArtistByName(artistName); // Tekee API-pyynnön artistin nimen perusteella.
        if (!data || data.artists.length === 0) {
            showMessage("Artist not found."); // Näyttää viestin, jos artistia ei löydy.
            return; // Lopettaa funktion suorituksen.
        }

        const artist = data.artists[0]; // Ottaa ensimmäisen löydetyn artistin tuloksista.
        renderArtistHeader(artist); // Kutsuu funktion, joka näyttää artistin tiedot otsikossa.
        currentArtistId = artist.id; // Tallentaa löydetyn artistin ID:n.
        await loadReleases(); // Kutsuu funktion, joka lataa artistin albumit.

    } catch (err) {
        console.error(err); // Kirjaa virheen konsoliin.
        showMessage("Search failed. Check your internet connection."); // Näyttää virheilmoituksen haku epäonnistuessa.
    }
});

document.getElementById("loadMoreButton").addEventListener("click", function () {
    // Lisää tapahtumankuuntelijan "Show more" -napille.
    if (currentArtistId) {
        loadReleases(); // Jos artistin ID on tallennettu, ladataan lisää albumeita.
    }
});

document.addEventListener('DOMContentLoaded', () => {
    // Tämä koodi suoritetaan, kun koko HTML-dokumentti on ladattu.
    const showRatedAlbumsButton = document.getElementById('showRatedAlbumsButton');
    if (showRatedAlbumsButton) {
        showRatedAlbumsButton.addEventListener('click', async () => {
            await showRatedAlbums(); // Lisää tapahtumankuuntelijan "Show Rated Albums" -napille ja kutsuu vastaavaa funktiota.
        });
    }
});

async function loadReleases() {
    // Lataa artistin albumeita API:sta sivuttain.
    const loadMoreButton = document.getElementById("loadMoreButton");
    const resultsDiv = document.getElementById("results");
    let albumList = resultsDiv.querySelector(".album-list"); // Yrittää hakea olemassa olevaa albumilistaa.

    if (currentOffset === 0) showLoadingMessage(); // Näyttää latausviestin ensimmäisen latauksen yhteydessä.
    else {
        loadMoreButton.textContent = "Loading more..."; // Muuttaa "Show more" -napin tekstiä latauksen aikana.
        loadMoreButton.disabled = true; // Estää lisäklikkaukset latauksen ollessa käynnissä.
    }

    try {
        const data = await fetchReleasesByArtistId(currentArtistId, currentOffset); // Tekee API-pyynnön artistin albumeille.
        if (currentOffset === 0) {
            hideLoadingMessage(); // Piilottaa latausviestin ensimmäisen latauksen jälkeen.
            if (!albumList) {
                albumList = document.createElement("div");
                albumList.classList.add("album-list");
                resultsDiv.appendChild(albumList); // Luo albumilistan divin, jos sitä ei vielä ole.
            }
        } else {
            if (!albumList) {
                albumList = document.createElement("div");
                albumList.classList.add("album-list");
                resultsDiv.appendChild(albumList); // Luo albumilistan divin, jos sitä ei vielä ole (tämä voi olla turha toisto).
            }
        }

        const albums = data["release-groups"]
            .filter(group => group["primary-type"] === "Album" &&
                            (!group["secondary-types"] || group["secondary-types"].length === 0))
            .map(group => ({
                title: group.title,
                date: group["first-release-date"]
            })); // Suodattaa vain ensisijaiset albumit ja luo niistä tarvittavat tiedot sisältävän taulukon.

        if (albums.length > 0) {
            showAlbums(albums); // Kutsuu funktion, joka näyttää ladatut albumit sivulla.
            currentOffset += albums.length; // Päivittää offsetia ladattujen albumien määrällä.

            if (albums.length === 10) {
                loadMoreButton.style.display = "block"; // Näyttää "Show more" -napin, jos vielä on mahdollisesti lisää albumeita.
                loadMoreButton.textContent = "Show more";
                loadMoreButton.disabled = false; // Ottaa "Show more" -napin uudelleen käyttöön.
            } else {
                loadMoreButton.style.display = "none"; // Piilottaa "Show more" -napin, jos kaikki albumit on ladattu.
            }
        } else if (currentOffset === 0) {
            showMessage("No official studio albums found."); // Näyttää viestin, jos virallisia studioalbumeita ei löydy.
            loadMoreButton.style.display = "none";
        } else {
            loadMoreButton.style.display = "none"; // Piilottaa "Show more" -napin, jos ei enää ole lisää albumeita ladattavaksi.
        }

    } catch (err) {
        console.error(err);
        showMessage("Search failed.");
        loadMoreButton.textContent = "Show more";
        loadMoreButton.disabled = false; // Ottaa "Show more" -napin uudelleen käyttöön virheen sattuessa.
    }
}

function saveFavoriteArtist(artistId, artistName) {
    // Tallentaa valitun artistin paikalliseen tallennustilaan (localStorage).
    let favorites = JSON.parse(localStorage.getItem("favoriteArtists")) || []; // Hakee suosikkiartistit localStorage:sta tai luo tyhjän taulukon.
    const notificationContainer = document.getElementById("notification-container");

    if (!favorites.some(artist => artist.id === artistId)) {
        // Jos artisti ei vielä ole suosikeissa.
        favorites.push({ id: artistId, name: artistName }); // Lisää artistin suosikkeihin.

        favorites.sort((a, b) => a.name.localeCompare(b.name)); // Lajittelee suosikit aakkosjärjestykseen nimen perusteella.

        localStorage.setItem("favoriteArtists", JSON.stringify(favorites)); // Tallentaa päivitetyn suosikkilistan localStorageen.
        showNotification(`Saved ${artistName} as favorite!`); // Näyttää onnistumisviestin.
        showFavoriteArtists(); // Päivittää suosikkilistan näkymän.
    } else {
        showNotification(`${artistName} is already in your favorites!`, true); // Näyttää viestin, jos artisti on jo suosikeissa.
    }
}

async function fetchArtistById(artistId) {
    // Hakee yksittäisen artistin tiedot ID:n perusteella MusicBrainz API:sta.
    const apiUrl = `https://musicbrainz.org/ws/2/artist/${artistId}?fmt=json`;

    try {
        const response = await fetch(apiUrl);
        if (!response.ok) {
            console.error(`Error fetching artist by ID ${artistId}: ${response.status}`);
            return { name: `Artist ID: ${artistId}` }; // Palauttaa varanimen, jos API-pyyntö epäonnistuu.
        }

        const data = await response.json();
        return { name: data.name || `Artist ID: ${artistId}` }; // Palauttaa artistin nimen tai varanimen, jos nimeä ei löydy.

    } catch (error) {
        console.error(`Failed to fetch artist by ID ${artistId}:`, error);
        return { name: `Artist ID: ${artistId}` }; // Palauttaa varanimen verkkoyhteysvirheen sattuessa.
    }
}


async function fetchArtistAndShowAlbums(artistId) {
    // Hakee artistin tiedot ID:n perusteella ja näyttää sitten artistin albumit.
    const resultsDiv = document.getElementById("results");
    const loadMoreButton = document.getElementById("loadMoreButton");

    resultsDiv.innerHTML = ""; // Tyhjentää albumilistan ennen uusien tulosten näyttämistä.

    loadMoreButton.style.display = "none";
    currentOffset = 0;
    currentArtistId = artistId;

    try {
        const artistData = await fetchArtistById(artistId);
        if (!artistData || !artistData.name) {
            showMessage("Artist not found.");
            return;
        }

        renderArtistHeader(artistData); // Näyttää artistin nimen sivulla.
        await loadReleases(); // Hakee ja näyttää artistin albumit.

    } catch (err) {
        console.error(err);
        showMessage("Failed to fetch artist details.");
    }
}



function showNotification(message, isError = false) {
    // Näyttää ilmoitusviestin käyttäjälle.
    const notificationContainer = document.getElementById("notification-container");
    notificationContainer.textContent = message;
    notificationContainer.className = "show";
    if (isError) {
        notificationContainer.style.backgroundColor = "rgba(255, 0, 0, 0.8)"; // Punainen tausta virheviesteille.
    } else {
        notificationContainer.style.backgroundColor = "rgba(0, 128, 0, 0.8)"; // Vihreä tausta onnistumisviesteille.
    }
    setTimeout(() => {
        notificationContainer.className = "";
        notificationContainer.style.backgroundColor = "";
    }, 3000); // Piilottaa ilmoituksen 3 sekunnin kuluttua.
}

async function checkNewAlbums() {
    // Tarkistaa suosikkiartisteilta uusia albumeita.
    let favorites = JSON.parse(localStorage.getItem("favoriteArtists")) || [];

    for (let artist of favorites) {
        try {
            const data = await fetchReleasesByArtistId(artist.id, 0);
            const latestAlbum = data["release-groups"].find(album => album["primary-type"] === "Album");

            if (latestAlbum && latestAlbum["first-release-date"]) {
                let lastCheckedDate = localStorage.getItem(`lastChecked_${artist.id}`);
                if (!lastCheckedDate || latestAlbum["first-release-date"] > lastCheckedDate) {
                    // alert(`New album from ${artist.name}: ${latestAlbum.title} (${latestAlbum["first-release-date"]})`);
                    localStorage.setItem(`lastChecked_${artist.id}`, latestAlbum["first-release-date"]); // Päivittää viimeisen tarkistuspäivän.
                }
            }
        } catch (err) {
            console.error("Error checking new albums:", err);
        }
    }
}

function saveAlbumRating(artistId, albumTitle, rating) {
    // Tallentaa albumin arvosanan paikalliseen tallennustilaan.
    const ratingKey = `rating-${artistId}-${albumTitle.replace(/\s+/g, '-')}`;
    localStorage.setItem(ratingKey, rating);

    console.log(`Rating ${rating} saved for album "${albumTitle}" by artist ID ${artistId}`);

    updateRatingDisplay(artistId, albumTitle, rating); // Päivittää arvosanan näytön välittömästi käyttöliittymässä.

    const ratingDisplay = document.querySelector(`#rate-${artistId}-${albumTitle.replace(/\s+/g, '-')} ~ .album-rating-display`);
    if (ratingDisplay) {
        ratingDisplay.textContent = `Rated: ${rating}/10`;
        ratingDisplay.style.backgroundColor = getRatingColor(rating); // Päivittää arvosanan näytön taustavärin välittömästi.
    }
}

function removeAlbumRating(artistId, albumTitle) {
    // Poistaa albumin arvosanan paikallisesta tallennustilasta.
    const ratingKey = `rating-${artistId}-${albumTitle.replace(/\s+/g, '-')}`;
    localStorage.removeItem(ratingKey);
    console.log(`Arvio poistettu albumilta "${albumTitle}" artistilta ID ${artistId}`);

    updateRatingDisplay(artistId, albumTitle, ''); // Päivittää käyttöliittymän näyttämään, ettei arviota ole.
}

function openMusicBrainzPage(artistId) {
    // Avaa artistin MusicBrainz-sivun uudessa välilehdessä.
    window.open(`https://musicbrainz.org/artist/${artistId}`, '_blank');
}

document.addEventListener('DOMContentLoaded', () => {
    // Tämä koodi suoritetaan, kun koko HTML-dokumentti on ladattu.
    const unrateAllButton = document.getElementById('unrateAllButton');
    const unrateAllPopup = document.getElementById('unrate-all-popup');
    const confirmUnrateAllButton = document.getElementById('confirm-unrate-all');
    const cancelUnrateAllButton = document.getElementById('cancel-unrate-all');

    if (unrateAllButton) {
        unrateAllButton.addEventListener('click', () => {
            unrateAllPopup.style.display = 'block'; // Näyttää "Poista kaikki arviot" -vahvistusponnahdusikkunan.
        });
    }

    if (cancelUnrateAllButton) {
        cancelUnrateAllButton.addEventListener('click', () => {
            unrateAllPopup.style.display = 'none'; // Piilottaa "Poista kaikki arviot" -ponnahdusikkunan.
        });
    }

    if (confirmUnrateAllButton) {
        confirmUnrateAllButton.addEventListener('click', () => {
            removeAllRatings(); // Kutsuu funktion kaikkien tallennettujen arvioiden poistamiseksi.
            unrateAllPopup.style.display = 'none'; // Piilottaa "Poista kaikki arviot" -ponnahdusikkunan.
        });
    }
});

function removeAllRatings() {
    // Poistaa kaikki 'rating-' -alkuiset avaimet paikallisesta tallennustilasta.
    for (let i = localStorage.length - 1; i >= 0; i--) {
        const key = localStorage.key(i);
        if (key.startsWith('rating-')) {
            localStorage.removeItem(key);
        }
    }
    showRatedAlbums(); // Päivittää näytettävät arvioidut albumit.
}

window.onload = () => {
    // Tämä koodi suoritetaan, kun koko sivu on ladattu.
    showFavoriteArtists(); // Näyttää tallennetut suosikkiartistit sivun latautuessa.
    checkNewAlbums(); // Tarkistaa uudet albumit suosikkiartisteilta sivun latautuessa.
};
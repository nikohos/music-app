let currentRatingArtistId = null; // Tallentaa tällä hetkellä arvioitavan albumin artistin ID:n.
let currentRatingAlbumTitle = null; // Tallentaa tällä hetkellä arvioitavan albumin nimen.

function showLoadingMessage() {
    // Näyttää latausviestin hakutulosten alueella.
    const resultsDiv = document.getElementById("results");
    const loadingDiv = document.createElement("p");
    loadingDiv.id = "loading";
    loadingDiv.innerHTML = "<span class='loader'></span> Fetching official studio albums...";
    resultsDiv.appendChild(loadingDiv);
}

function hideLoadingMessage() {
    // Piilottaa latausviestin, jos se on näkyvissä.
    const loading = document.getElementById("loading");
    if (loading) loading.remove();
}

function renderArtistHeader(artist) {
    // Näyttää artistin nimen hakutulosten yläosassa ja "Save as Favorite" sekä "View on MusicBrainz" -napit.
    const resultsDiv = document.getElementById("results");
    resultsDiv.innerHTML = `<h2>${artist.name}</h2>`;
    resultsDiv.insertAdjacentHTML('beforeend', `
        <div class="album-actions">
            <button class="save-favorite" onclick="saveFavoriteArtist('${artist.id}', '${artist.name}')">Save as Favorite</button>
            <button class="view-on-musicbrainz" onclick="openMusicBrainzPage('${artist.id}')">View on MusicBrainz</button>
        </div>
    `);
}


function showAlbums(albums) {
    // Näyttää albumilistan hakutulosten alueella.
    const resultsDiv = document.getElementById("results");

    let list = resultsDiv.querySelector(".album-list");
    if (!list) {
        list = document.createElement("div");
        list.classList.add("album-list");
        resultsDiv.appendChild(list);

        // Lisätään ohjeteksti arviointia varten vain kerran.
        if (!document.getElementById("rating-instruction")) {
            const instructionText = document.createElement("p");
            instructionText.id = "rating-instruction";
            instructionText.textContent = "Click an album name to rate it.";
            instructionText.style.fontWeight = "600";
            resultsDiv.insertBefore(instructionText, list);
        }
    }

    // Lajitellaan albumit julkaisuvuoden mukaan ennen näyttämistä.
    albums.sort((a, b) => (!a.date ? 1 : !b.date ? -1 : a.date.localeCompare(b.date)));

    albums.forEach(album => {
        const albumContainer = document.createElement("div");
        albumContainer.classList.add("album-container");

        // Album Name -lohko, joka on myös klikattava arviointia varten.
        const albumTitle = document.createElement("strong");
        albumTitle.classList.add("click-to-rate");
        albumTitle.dataset.artistId = currentArtistId;
        albumTitle.dataset.albumTitle = album.title;
        albumTitle.textContent = album.title;

        // Julkaisupäivämäärä.
        const releaseDate = document.createElement("span");
        releaseDate.textContent = album.date ? ` (${album.date})` : "";

        // Arvosanan näyttölohko.
        const ratingKey = `rating-${currentArtistId}-${album.title.replace(/\s+/g, '-')}`;
        const savedRating = localStorage.getItem(ratingKey) || '';
        const ratingDisplay = document.createElement("span");
        ratingDisplay.classList.add("album-rating-display");
        ratingDisplay.dataset.artistId = currentArtistId;
        ratingDisplay.dataset.albumTitle = album.title;
        // Näytetään "Rated:" vain, jos arvosana on tallennettu.
        ratingDisplay.textContent = savedRating ? `Rated: ${savedRating}/10` : "";
        ratingDisplay.style.backgroundColor = getRatingColor(savedRating);

        // Lisätään klikkaustapahtumankuuntelija albumin nimeen arviointi-popupin avaamiseksi.
        albumTitle.addEventListener("click", () => openRatingPopup(currentArtistId, album.title));

        // Lisätään elementit albumikonttiin.
        albumContainer.appendChild(albumTitle);
        albumContainer.appendChild(releaseDate);
        albumContainer.appendChild(ratingDisplay);
        list.appendChild(albumContainer);
    });

    resultsDiv.appendChild(list);

    // Varmistetaan, että arviointi-popup on olemassa.
    let ratingPopup = document.getElementById('rating-popup');
    if (!ratingPopup) {
        ratingPopup = document.createElement('div');
        ratingPopup.id = 'rating-popup';
        ratingPopup.classList.add('rating-popup');
        document.body.appendChild(ratingPopup);
        ratingPopup.style.display = 'none'; // Aluksi piilotettu.
    }
}

function showRatedAlbums() {
    // Näyttää listan arvioiduista albumeista.
    const resultsDiv = document.getElementById("results");
    resultsDiv.innerHTML = "<h2>Rated Albums</h2><ul class='rated-albums-list'></ul>";
    const ratedAlbumsList = resultsDiv.querySelector('.rated-albums-list');
    const ratedAlbums = [];

    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key.startsWith('rating-')) {
            const parts = key.split('-');
            const albumTitleParts = parts.slice(6);
            // Korvataan väliviivat välilyönneillä albumin nimessä.
            const albumTitle = albumTitleParts.join('-').replace(/-/g, ' ').replace(/\s+/g, ' ');
            const rating = parseInt(localStorage.getItem(key), 10);
            if (!isNaN(rating)) {
                ratedAlbums.push({ albumTitle, rating });
            }
        }
    }

    // Lajitellaan arvioidut albumit arvosanan mukaan laskevaan järjestykseen.
    ratedAlbums.sort((a, b) => b.rating - a.rating);

    if (ratedAlbums.length > 0) {
        ratedAlbums.forEach(album => {
            const listItem = document.createElement('li');
            listItem.innerHTML = `
                <span class="rated-album-title">${album.albumTitle}</span>
                <span class="album-rating-display">${album.rating}/10</span>
            `;
            listItem.querySelector('.album-rating-display').style.backgroundColor = getRatingColor(album.rating);
            ratedAlbumsList.appendChild(listItem);
        });
    } else {
        ratedAlbumsList.innerHTML = '<li>No albums have been rated yet.</li>';
    }

    const loadMoreButton = document.getElementById("loadMoreButton");
    if (loadMoreButton) {
        loadMoreButton.style.display = "none"; // Piilotetaan "Show more" -nappi arvioitujen albumien listassa.
    }
}

function openRatingPopup(artistId, albumTitle) {
    // Avataan popup-ikkuna albumin arviointia varten.
    currentRatingArtistId = artistId;
    currentRatingAlbumTitle = albumTitle;

    const ratingPopup = document.getElementById('rating-popup');
    ratingPopup.innerHTML = ''; // Tyhjennetään popupin edellinen sisältö.

    const title = document.createElement('h3');
    title.textContent = `Rate: ${albumTitle}`; // Asetetaan popupin otsikoksi arvioitavan albumin nimi.
    ratingPopup.appendChild(title);

    const ratingButtonsContainer = document.createElement('div');
    ratingButtonsContainer.classList.add('rating-buttons-container');

    // Luodaan napit arvosanoille 1-10.
    for (let i = 1; i <= 10; i++) {
        const button = document.createElement('button');
        button.textContent = i;
        button.classList.add('rating-number-button');
        button.addEventListener('click', () => {
            saveAlbumRating(currentRatingArtistId, currentRatingAlbumTitle, i); // Tallennetaan valittu arvosana.
            closeRatingPopup(); // Suljetaan popup.
            updateRatingDisplay(currentRatingArtistId, currentRatingAlbumTitle, i); // Päivitetään arvosanan näyttö käyttöliittymässä.
        });
        ratingButtonsContainer.appendChild(button);
    }

    // Lisätään "Poista arvio" -nappi.
    const unrateButton = document.createElement("button");
    unrateButton.textContent = "Unrate";
    unrateButton.classList.add("unrate-button");
    unrateButton.addEventListener("click", () => {
        removeAlbumRating(currentRatingArtistId, currentRatingAlbumTitle); // Poistetaan albumin arvosana.
        closeRatingPopup(); // Suljetaan popup.
    });
    ratingButtonsContainer.appendChild(unrateButton);

    // Lisätään peruutusnappi.
    const cancelButton = document.createElement("button");
    cancelButton.innerHTML = "&#10006;"; // ✖ Unicode-symboli.
    cancelButton.classList.add("cancel-rating-button");
    cancelButton.addEventListener("click", closeRatingPopup); // Suljetaan popup.
    ratingButtonsContainer.appendChild(cancelButton);


    ratingPopup.appendChild(ratingButtonsContainer);

    // Näytetään popup ENNEN tapahtumankuuntelijan lisäämistä.
    ratingPopup.style.display = 'block';

    // Suljetaan popup, jos klikataan sen ulkopuolelle.
    setTimeout(() => {
        document.addEventListener("click", function (event) {
            if (!ratingPopup.contains(event.target) && ratingPopup.style.display === 'block') {
                closeRatingPopup();
            }
        }, { once: true }); // Tapahtumankuuntelija suoritetaan vain kerran.
    }, 100); // Pieni viive estää välittömän sulkeutumisen.
}

function closeRatingPopup() {
    // Suljetaan arviointi-popup.
    const ratingPopup = document.getElementById('rating-popup');
    ratingPopup.style.display = 'none';
}



function showFavoriteArtists(favoritesList) {
    // Näyttää suosikkiartistien listan sivupalkissa.
    const favoritesDiv = document.getElementById("favorites");
    let favorites = favoritesList || JSON.parse(localStorage.getItem("favoriteArtists")) || [];

    favoritesDiv.innerHTML = "<h2>Favorite Artists</h2>";
    if (favorites.length === 0) {
        favoritesDiv.innerHTML += "<p>No favorite artists saved.</p>";
        return;
    }

    // Lajitellaan artistit aakkosjärjestykseen nimen perusteella (varmistetaan järjestys).
    favorites.sort((a, b) => a.name.localeCompare(b.name));

    let list = document.createElement("ul");
    favorites.forEach(artist => {
        let item = document.createElement("li");
        item.innerHTML = `<span class="favorite-artist" data-artist-id="${artist.id}">${artist.name}</span>
    <button class="remove-favorite-button" data-artist-id="${artist.id}">✖</button>`;
        list.appendChild(item);
    });
    favoritesDiv.appendChild(list);

    // Lisätään tapahtumankuuntelijat artistin nimen klikkaamiseen (näyttää albumit) ja poistonapin klikkaamiseen (poistaa suosikeista).
    favoritesDiv.addEventListener("click", function (event) {
        if (event.target.classList.contains("favorite-artist")) {
            const artistId = event.target.dataset.artistId;
            fetchArtistAndShowAlbums(artistId);
        }
    });

    favoritesDiv.addEventListener("click", function (event) {
        if (event.target.classList.contains("remove-favorite-button")) {
            const artistId = event.target.dataset.artistId;
            removeFavoriteArtist(artistId);
        }
    });
}

window.onload = () => {
    // Tämä suoritetaan, kun sivu on täysin latautunut.
    const favorites = JSON.parse(localStorage.getItem("favoriteArtists")) || [];
    showFavoriteArtists(favorites); // Näytetään suosikkiartistit sivun latautuessa.
    checkNewAlbums(); // Tarkistetaan uudet albumit suosikkiartisteilta sivun latautuessa.
};


function removeFavoriteArtist(artistId) {
    // Poistaa artistin suosikkilistalta.
    const listItem = document.querySelector(`#favorites li button[data-artist-id="${artistId}"]`).parentNode;
    if (listItem) {
        listItem.classList.add("removing"); // Lisätään poistoanimaatiota varten (jos CSS:ssä määritelty).
        setTimeout(() => {
            let favorites = JSON.parse(localStorage.getItem("favoriteArtists")) || [];
            favorites = favorites.filter(artist => artist.id !== artistId);

            // Lajitellaan suosikit aakkosjärjestykseen poiston jälkeenkin.
            favorites.sort((a, b) => a.name.localeCompare(b.name));

            localStorage.setItem("favoriteArtists", JSON.stringify(favorites));
            showFavoriteArtists(); // Päivitetään suosikkilistan näkymä.
        }, 300); // Pieni viive animaatiota varten.
    } else {
        console.error("Listan elementtiä ei löydetty poistettavalle artistille ID:llä:", artistId);
    }
}

function updateRatingDisplay(artistId, albumTitle, rating) {
    // Päivittää albumin arvosanan näytön hakutuloksissa.
    const ratingDisplay = document.querySelector(`.album-container span.album-rating-display[data-artist-id="${artistId}"][data-album-title="${albumTitle}"]`);

    if (ratingDisplay) {
        if (rating) {
            ratingDisplay.textContent = `Rated: ${rating}/10`;
            ratingDisplay.style.backgroundColor = getRatingColor(rating); // Asetetaan taustaväri arvosanan perusteella.
        } else {
            ratingDisplay.textContent = ''; // Asetetaan tyhjäksi, jos arvosana poistetaan.
            ratingDisplay.style.backgroundColor = 'transparent'; // Palautetaan oletustausta.
        }
    }
}


function getRatingColor(rating) {
    // Palauttaa arvosanaa vastaavan värin.
    rating = parseInt(rating, 10);

    if (rating >= 9) return "#4CAF50";   // Pehmeämpi vihreä parhaille arvosanoille (9-10).
    if (rating >= 7) return "#C2A600";   // Hillitty keltainen hyville albumeille (7-8).
    if (rating >= 5) return "#D18B47";   // Vaalea oranssi keskitason albumeille (5-6).
    if (rating >= 3) return "#A85D3A";   // Ruskehtavan oranssi heikommille albumeille (3-4).
    if (rating >= 1) return "#A84343";   // Tummanpunainen huonoille albumeille (1-2).
    return "transparent";                 // Oletusväri arvioimattomille albumeille.
}

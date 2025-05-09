const albumsPerPage = 10; // Määrittelee, kuinka monta albumia kerralla ladataan API:sta.

async function makeApiRequest(url, options) {
    await new Promise(resolve => setTimeout(resolve, 1200)); // Simuoi pientä viivettä API-pyyntöön.
    try {
        const res = await fetch(url, options);
        if (!res.ok) throw new Error(`Pyyntö epäonnistui: ${res.status} ${res.statusText}`); // Jos vastaus ei ole ok (esim. 404, 500), heitetään virhe.
        return await res.json(); // Parsitaan vastaus JSON-muotoon.
    } catch (error) {
        console.error("API-pyyntö epäonnistui:", error); // Kirjataan virhe konsoliin.
        return null; // Palautetaan null, jos pyyntö epäonnistuu.
    }
}

async function fetchArtistByName(name) {
    // Hakee artistin nimen perusteella MusicBrainz API:sta.
    return await makeApiRequest(`https://musicbrainz.org/ws/2/artist?query=${encodeURIComponent(name)}&fmt=json`, {
        headers: { "User-Agent": "MusicAlbumNotifier/1.0 (me@example.com)" } // Lähetetään tunnistautumistieto API:lle.
    });
}

async function fetchReleasesByArtistId(artistId, offset) {
    // Hakee artistin ID:n perusteella albumeita (release-group) MusicBrainz API:sta.
    // 'offset' mahdollistaa sivutuksen hakutuloksissa.
    return await makeApiRequest(`https://musicbrainz.org/ws/2/release-group?artist=${artistId}&type=album&fmt=json&limit=${albumsPerPage}&offset=${offset}`, {
        headers: { "User-Agent": "MusicAlbumNotifier/1.0 (me@example.com)" } // Lähetetään tunnistautumistieto API:lle.
    });
}

async function fetchArtistById(artistId) {
    // Hakee yksittäisen artistin tiedot ID:n perusteella MusicBrainz API:sta.
    const apiUrl = `https://musicbrainz.org/ws/2/artist/${artistId}?fmt=json`;
    try {
        const response = await fetch(apiUrl);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`); // Jos vastaus ei ole ok, heitetään virhe.
        }
        const data = await response.json();
        return data; // Palautetaan artistin tiedot JSON-muodossa.
    } catch (error) {
        console.error("Failed to fetch artist by ID:", error); // Kirjataan virhe konsoliin.
        throw error; // Heitetään virhe uudelleen, jotta se voidaan käsitellä kutsuvassa funktiossa.
    }
}
import axios from "axios";
import ASong from "../ASong.js";
import YoutubeSong from "../youtube/YoutubeSong.js";
import { Readable } from "stream";
import Logger from "../../../logging/Logger.js";

export default class SpotifySong extends ASong {

    /* ==== CONSTRUCTOR ===================================================== */
    /** Initialize song with requried data and length in seconds (always
     *  present) and thumbnail (if any). */
    public constructor(id: string, title: string, lengthSeconds: number, thumbnail?: string) {
        super(ASong.SongType.SPOTIFY, id, title, `https://open.spotify.com/track/${id}`);
        this.thumbnail = thumbnail;
        this.lengthSeconds = lengthSeconds;
    }

    /* ==== METHODS ========================================================= */
    /** Spotify songs are actually Youtube videos under the hood (for now).
     *  TODO: try to retrieve Readable stream from Spotify directly.
     *  Youtube is queried with the song title (which contains song name and
     *  artists) and the first result is used to retrieve the stream.
     *  If there is no result found, throw an error. */
    async getStream(): Promise<Readable> {
        const { items } = await YoutubeSong.search(this.title, 1);

        const youtubeSong = items[0];
        if(!youtubeSong) throw new Error("No Youtube result found.");

        return youtubeSong.getStream();
    }

    /* ==== STATIC PROPERTIES =============================================== */
    /** Regex that matches a valid Spotify song uri and extract its id. */
    private static songRegex = /^https:\/\/open.spotify.com\/(?:intl-[\w]{0,3}\/)?track\/(.{22})(\?.*)?$/;
    /** Regex that matches a valid Spotify album uri and extract its id. */
    private static albumRegex = /^https:\/\/open.spotify.com\/(?:intl-[\w]{0,3}\/)?album\/(.{22})(\?.*)?$/;
    /** Regex that matches a valid Spotify playlist uri and extract its id. */
    private static playlistRegex = /^https:\/\/open.spotify.com\/(?:intl-[\w]{0,3}\/)?playlist\/(.{22})(\?.*)?$/;

    /* ==== PUBLIC STATIC METHODS =========================================== */
    /** Checks whether the provided uri is a valid Spotify song uri.
     *  If it is, it extracts the song id and creates a song instance with the
     *  metadata retrieved from the APIs for the given id. */
    public static async fromSongUri(uri: string): Promise<SpotifySong[] | undefined> {

        // Check uri and extract song id
        const id: string | undefined = SpotifySong.getSongId(uri);
        if(!id) return undefined;

        Logger.info("Provided URI is a Spotify Song");
        Logger.debug(`Retrieving Spotify song metadata for id: '${id}'`);

        // Retrieve song JSON metadata
        const response = await axios.get(`https://api-partner.spotify.com/pathfinder/v1/query`, { params:{
            "operationName": "getTrack",
            "variables": `{"uri":"spotify:track:${id}"}`,
            "extensions": "{\"persistedQuery\":{\"version\":1,\"sha256Hash\":\"ae85b52abb74d20a4c331d4143d4772c95f34757bfa8c625474b912b9055b5c0\"}}"
        }, headers: { "authorization": `Bearer ${await SpotifySong.getAccessToken()}` }})

        // Extract data from retrieved JSON
        const metadata: any = response.data.data.trackUnion;
        const lengthSeconds: number = Math.ceil(metadata.duration.totalMilliseconds / 1000);
        const name: string = metadata.name; // name + artists
        const artist: string = metadata.firstArtist.items.map((i: any) => i.profile.name).join(", ");
        const title: string = `${name} - ${artist}`;
        const thumbnail: string = metadata.albumOfTrack.coverArt.sources.pop().url;

        // Return Spotify song instance as an array
        return [new SpotifySong(id, title, lengthSeconds, thumbnail)];
    }

    /** Checks whether the provided uri is a valid Spotify album uri.
     *  If it is, it extracts the album id and creates a song instances list
     *  with metadata retrieved from the APIs for the given album id. */
    public static async fromAlbumUri(uri: string): Promise<SpotifySong[] | undefined> {

        // Check uri and extract song id
        const id: string | undefined = SpotifySong.getAlbumId(uri);
        if(!id) return undefined;

        Logger.info("Provided URI is a Spotify Album");
        Logger.debug(`Retrieving Spotify album metadata for id: '${id}'`);

        let offset = 0, limit = 500;
        let totalCount: number;
        const results: SpotifySong[] = [];

        do {
            // Retrieve album JSON metadata
            const response = await axios.get(`https://api-partner.spotify.com/pathfinder/v1/query`, { params:{
                "operationName": "getAlbum",
                "variables": `{"uri":"spotify:album:${id}","locale":"","offset":${offset},"limit":${limit}}`,
                "extensions": "{\"persistedQuery\":{\"version\":1,\"sha256Hash\":\"0b8f7f117d97694e0a2b3ce210ba17102f4a4ee7fcfbcd4caaac815b940ac5ef\"}}"
            }, headers: { "authorization": `Bearer ${await SpotifySong.getAccessToken()}` }})

            // Keep track of total amount of playlist items
            totalCount = response.data.data.albumUnion.tracksV2.totalCount;
            // Increase retrieved items count for the next iteration (if needed)
            offset += limit;

            // Extract data from retrieved JSON
            const thumbnail = response.data.data.albumUnion.coverArt.sources.pop().url;
            const songs: any[] = response.data.data.albumUnion.tracksV2.items;
            songs.forEach(({ track }) => {
                const lengthSeconds: number = Math.ceil(track.duration.totalMilliseconds / 1000);
                const name: string = track.name; // name + artists
                const artist: string = track.artists.items.map((i: any) => i.profile.name).join(", ");
                const title: string = `${name} - ${artist}`;
                const id: string = track.uri.split(":").pop();
        
                // Add Spotify song instance to the results array
                results.push(new SpotifySong(id, title, lengthSeconds, thumbnail));
            });

            // Keep retrieving until all the items are retrieved: Spotify query
            // has an item limit and the offset is increased in each iteration. 
        } while(totalCount > offset + limit);

        // Return accumulated results
        return results;
    }

    /** Checks whether the provided uri is a valid Spotify playlist uri.
     *  If it is, it extracts the playlist id and creates a song instances list
     *  with metadata retrieved from the APIs for the given playlist id. */
    public static async fromPlaylistUri(uri: string): Promise<SpotifySong[] | undefined> {

        // Check uri and extract song id
        const id: string | undefined = SpotifySong.getPlaylistId(uri);
        if(!id) return undefined;

        Logger.info("Provided URI is a Spotify Playlist");
        Logger.info(`Retrieving Spotify playlist metadata for id: '${id}'`);

        let offset = 0, limit = 500;
        let totalCount: number;
        const results: SpotifySong[] = [];

        do {
            // Retrieve album JSON metadata
            const response = await axios.get(`https://api-partner.spotify.com/pathfinder/v1/query`, { params:{
                "operationName": "fetchPlaylist",
                "variables": `{"uri":"spotify:playlist:${id}","offset":${offset},"limit":${limit}}`,
                "extensions": "{\"persistedQuery\":{\"version\":1,\"sha256Hash\":\"9086f110a0571ad24df2e16191f4efa31740df7bc11a2ee8b336f5d3a52e2bd8\"}}"
            }, headers: { "authorization": `Bearer ${await SpotifySong.getAccessToken()}` }})

            // Keep track of total amount of playlist items
            totalCount = response.data.data.playlistV2.content.totalCount;
            // Increase retrieved items count for the next iteration (if needed)
            offset += limit;

            // Extract data from retrieved JSON
            const songs: any[] = response.data.data.playlistV2.content.items;
            songs.forEach(({ itemV2 }: any) => {
                // Only retrieve "real" (non local) tracks
                // TODO: handle podcasts?
                if(itemV2.__typename !== "TrackResponseWrapper") return null!;

                const track = itemV2.data;
                const lengthSeconds: number = Math.ceil(track.trackDuration.totalMilliseconds / 1000);
                const name: string = track.name; // name + artists
                const artist: string = track.artists.items.map((i: any) => i.profile.name).join(", ");
                const title: string = `${name} - ${artist}`;
                const thumbnail = track.albumOfTrack.coverArt.sources.pop().url;
                const id: string = track.uri.split(":").pop();
        
                // Add Spotify song instance to the results array
                results.push(new SpotifySong(id, title, lengthSeconds, thumbnail));
            });

            // Keep calling until all the items are retrieved: Spotify query
            // has an item limit and the offset is increased in each iteration. 
        } while(totalCount > offset + limit);

        // Return accumulated results
        return results;
    }

    /* ==== PRIVATE STATIC METHODS ========================================== */
    /** Retrieves a valid Spotify accessToken that can be used to use other
     *  Spotify APIs to retrieve metadata without logging in.
     *  This token cannot be used to retrieve full audio streams of songs.
     *  TODO: is the latter true? Check. */
    private static async getAccessToken() {
        // Call Spotify home page and retrieve initial data
        const html: string = (await axios.get("https://open.spotify.com")).data;
        // Extract accessToken from inner <script> context data with regex
        const accessToken: string | undefined = /{"accessToken":"([\w-]*)"/.exec(html)?.[1];
        Logger.trace(`Retrieved Spotify accessToken: '${accessToken}'`);
        return accessToken;
    }

    /** Parses an URL in order to check if it refers to a Spotify track.
     *  If it does, the track id is returned. */
    private static getSongId(url: string): undefined | string {
        const result = SpotifySong.songRegex.exec(url);
        if(result && result.length > 1) return result[1];
    }

    /** Parses an URL in order to check if it refers to a Spotify album.
     *  If it does, the album id is returned. */
    private static getAlbumId(url: string): undefined | string {
        const result = SpotifySong.albumRegex.exec(url);
        if(result && result.length > 1) return result[1];
    }

    /** Parses an URL in order to check if it refers to a Spotify playlist.
     *  If it does, the playlist id is returned. */
    private static getPlaylistId(url: string): undefined | string {
        const result = SpotifySong.playlistRegex.exec(url);
        if(result && result.length > 1) return result[1];
    }
}
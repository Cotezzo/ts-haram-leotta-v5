import axios from "axios";
import YoutubeSong from "./YoutubeSong.js";
import { stringToSeconds } from "../../../../utils/length.js";
import ASong from "../ASong.js";
import Logger from "../../../logging/Logger.js";
import { Readable } from "stream";

export default class YoutubeMixSong extends ASong {
  
    /* ==== CONSTRUCTOR ===================================================== */
    /** Initialize required data, add MIX uri and save informations about the
     *  mix (queue of songs, visitorData token).
     *  A mix has no defined duration and title, but it changes with the current
     *  song that is playing at the moment. */
    private constructor(id: string, visitorData: string, queue: YoutubeSong[]) {
        super(ASong.SongType.YOUTUBE_MIX, id, "MIX", `https://www.youtube.com/watch?v=${id}&list=RD${id}`);
        this.visitorData = visitorData;
        this.queue = queue;

        // Update metadata with current song's
        this.updateMetadata();
    }

    /* ==== PROPERTIES ====================================================== */
    /** Current stored songs. When the array is empty, new entries are
     *  retrieved using Youtube APIs and stored. */
    queue: YoutubeSong[] = [];
    /** Token used by Youtube APIs to keep track of Mix context informations.
     *  Necessary in order to retrieve new entries when the queue empties. */
    visitorData: string;
    /** Stores the id of the last played Youtube video.
     *  Used when retrieving new Mix entries: the Youtube API also return
     *  already played songs, so this id is used to check the last already
     *  seen entry and read from there. */
    lastVideoId: string | undefined;

    /* ==== PUBLIC METHODS ================================================== */
    /** Returns the stream of the song to be played. */
    public getStream(): Promise<Readable> { return this.getCurrent().getStream(); }

    /** Retrieves first element in the inner songs queue. */
    public getCurrent(): YoutubeSong { return this.queue[0]; }
    
    /** Called by the MusicPlayer when the previous Mix song finished playing.
     *  Saves the id of the latest song and removes it from the queue.
     *  If the queue empties, new items are retrieved from Youtube APIs.
     *  Update current metadata with first enqueued song and return TRUE.
     *  FALSE would cause the MusicPlayer to skip the YoutubeMixSong. */
    public async skip(): Promise<boolean> {
        // Remove first element in the queue (if any)
        this.lastVideoId = this.queue.shift()?.id;

        // If queue is empty, retrieve and push new elements to the inner queue
        if(!this.queue.length) {
            const songs = await YoutubeMixSong.getNextVideos(this.id, this.lastVideoId, this.visitorData);
            this.queue.push(...songs);
        }

        // Update metadata with current song's
        this.updateMetadata();

        // Mixs are infinite, return TRUE: there always is something to play
        return true;
    }

    /* ==== PRIVATE METHODS ================================================= */
    /** A mix has no defined metadata. This method sets the song metadata to
     *  whatever the current playing song in the queue has, with slight
     *  changes in order to remind the user that this is a Mix. */
    private updateMetadata() {
        // Retrieve current song
        const song = this.getCurrent();
        // Add "MIX" to the original song title
        this.title = `MIX - ${song.title}`;
        // Create Youtube video url for this Mix
        this.uri = `https://www.youtube.com/watch?v=${song.id}&list=RD${this.id}`;
        // Use original durations and thumbnail
        this.lengthSeconds = song.lengthSeconds;
        this.lengthString = song.lengthString;
        this.thumbnail = song.thumbnail
    }

    /* ==== PUBLIC STATIC METHODS =========================================== */
    /** Creates and returns a YoutubeMixSong instance, creating a Mix with the
     *  input video id that can be played indefinitely. */
    public static async fromId(videoId: string): Promise<YoutubeMixSong> {
        // Call Youtube endopint and retrieve metadata associated to this
        // visitor Mix - a Mix is identified by "RD" + the original video id.
        const uri = `https://www.youtube.com/watch?v=${videoId}&list=RD${videoId}`;
        const { data }: { data: string } = await axios.get(uri/*, { headers: { cookie }}*/);

        // This endpoint is not an API - extract json data from html elements
        const response = JSON.parse(data.split('var ytInitialData =')[1].split("</script>")[0].slice(0, -1));

        // Parse json response and extract visitorData, used to navigate the Mix
        const trackings: any[] = response.responseContext.serviceTrackingParams;
        const trackingParams: any[] = trackings.filter(t => t.service === "GFEEDBACK")[0].params;
        const visitorData: string = trackingParams.filter(t => t.key === "visitor_data")[0].value;
    
        // Extract song metadata from Json response
        const songs: YoutubeSong[] = YoutubeMixSong.extractSongsFromResponse(response);

        // Return initialized YoutubeMixSong instance
        return new YoutubeMixSong(videoId, visitorData, songs);
    }

    /* ==== PRIVATE STATIC METHODS ========================================== */
    /** Retrieves the next elements of the Youtube Mix playlist, starting from
     *  the last video already enqueued. */
    private static async getNextVideos(mixId: string, lastVideoId: string | undefined, visitorData: string) {
        // Call Youtube API and retrieve metadata associated to this visitor Mix
        const uri = `https://www.youtube.com/youtubei/v1/next?prettyPrint=false`;
        const body = {
            "context": { "client": {
                "visitorData": visitorData,
                "clientName": "WEB",
                "clientVersion": "2.20240910.03.00",
            } },
            // Last video, new items will be retrieved from its index in the Mix
            "videoId": lastVideoId,
            // Mix id, which is RD + id of the first video of the mix
            "playlistId": `RD${mixId}`
        }
        const { data: response } = await axios.post(uri, body/*, { headers: { cookie }}*/);
    
        // Extract song metadata from Json response
        const songs: YoutubeSong[] = YoutubeMixSong.extractSongsFromResponse(response);

        // Only retrieve items PAST the last video id: the Youtube service also
        // returns already seen videos, so we need to filter manually.
        // Find the index of the last seen video and slice all items after that.
        // If the id is not found, -1 +1 is 0, which is the array start. Take all.
        const startIndex = songs.findIndex(s => s.id === lastVideoId) + 1;
        const filteredQueue = songs.slice(startIndex);
        Logger.debug(`Adding to queue ${filteredQueue.length} new mix items: ${filteredQueue.map(i => i.id)}`);

        return filteredQueue;

        //this.queue.push(...filteredQueue);
    }

    /** Youtube Mixes JSON data is always the same.
     *  When a JSON payload is retrieved, this method is used to extract raw
     *  data and parse it into YoutubeSong instances. */
    private static extractSongsFromResponse(response: any) {
        // Extract song metadata from Json response
        const contents: any[] = response.contents.twoColumnWatchNextResults.playlist.playlist.contents;

        // Filter response items metadata and convert to YoutubeSong instances
        const songs: YoutubeSong[] = contents.map(({ playlistPanelVideoRenderer: song }) => {
            const title = song.title.simpleText;
            const id = song.videoId;
            const lengthString = song.lengthText.simpleText;
            const lengthSeconds = stringToSeconds(lengthString);
            const thumbnail = song.thumbnail.thumbnails.pop().url;
    
            return new YoutubeSong(title, id, lengthSeconds, lengthString, thumbnail);
        });
        Logger.debug(`Retrieved ${songs.length} new mix songs: ${songs.map(i => i.id)}`);
        return songs;
    }
}
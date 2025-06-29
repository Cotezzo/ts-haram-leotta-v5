import axios from "axios";
import ASong from "../ASong";
import YoutubeSong from "./YoutubeSong";
import Logger from "../../../logging/Logger";

export default class YoutubePlaylistSong extends ASong {

    /* ==== CONSTRUCTOR ===================================================== */
    /** Initialize required data, add playlist URI and custom length, which is
     *  not a timestamp but is the size of the Playlist in items. */
    public constructor(title: string, id: string, size: number) {
        super(ASong.SongType.YOUTUBE_PLAYLIST, id, title, `https://www.youtube.com/playlist?list=${id}`);
        this.lengthString = `Playlist ${size}`;
    }

    //! getStream is not implemented! This song type is not meant to be played.

    /* ==== PUBLIC STATIC METHODS =========================================== */
    /** Returns a list of YoutubeSong instances with all the songs retrieved
     *  from the input playlist id. */
    public static async fromUri(uri: string): Promise<YoutubeSong[] | undefined> {
        const id: string | undefined = YoutubePlaylistSong.getPlaylistId(uri);
        if(!id) return undefined;

        Logger.info(`Provided URI is a Youtube Playlist with id "${id}"`);
        return await YoutubePlaylistSong.getSongs(id);
    };
    
    /** Returns a list of YoutubeSong instances with all the songs retrieved
     *  from the input playlist id. */
    public static async getSongs(id: string): Promise<YoutubeSong[]> {
        const { initData, apiToken, context } = await YoutubePlaylistSong.getPlaylistInitData(id);

        const items: YoutubeSong[] = [];
        let continuation: any | undefined = undefined;

        do {
            let lastItem: any | undefined = undefined;
            
            // Retrieve first 100 playlist elements + continuation data
            if(continuation === undefined) {
                const contents = initData.contents.twoColumnBrowseResultsRenderer.tabs[0]
                    .tabRenderer.content.sectionListRenderer.contents[0]
                    .itemSectionRenderer.contents[0]
                    .playlistVideoListRenderer.contents;
                lastItem = contents[contents.length - 1];
    
                // {"continuationItemRenderer":{"trigger":"CONTINUATION_TRIGGER_ON_ITEM_SHOWN","continuationEndpoint":{"clickTrackingParams":"CCQQ7zsYACITCOPC3-SGoogDFcJdegUduTYrDw==","commandMetadata":{"webCommandMetadata":{"sendPost":true,"apiUrl":"/youtubei/v1/browse"}},"continuationCommand":{"token":"4qmFsgKSAhIkVkxQTGhEWFYwaW5ueWFXM2luU0pRTjFyZ0ZKMU03STZGTUE2GsQBQ0FGNmpnRlFWRHBEUjFGcFJVUkNSMUpWUlRGU2FtYzFUMVJOTTFGclNURk5SRmx2UVZWcE5qaGZia2RmWDNsR1FURkJRbGRyVldsUk1teExWVlpTU0dGRlZsaFNiR3d6V1Zaak1XUlhWbGhTYkdoT1RXMTRNVlpVUW5kVmJGSnhVbTVzWVUxR2NFeFVWbFYzVFRGT1ZWZHJaRlZXVlZWNVVsZGtNMU5VVGs1VlNFcDZWVlpzVW1Fd01IcGthbEl6VWxOSpoCIlBMaERYVjBpbm55YVczaW5TSlFOMXJnRkoxTTdJNkZNQTY%3D","request":"CONTINUATION_REQUEST_TYPE_BROWSE"}}}}
    
                items.push( ...YoutubePlaylistSong.getResultsFromPlaylistContents(contents) );
            }
            
            // If continuation token is present, retrieve next (102+) elements
            else {
                const { data }: any = await axios.post(`https://www.youtube.com/youtubei/v1/browse?key=${apiToken}`,
                    { context, continuation }, { headers: { "content-type": "application/json" } });
                if(data.onResponseReceivedActions) {
                    const contents = data.onResponseReceivedActions[0].appendContinuationItemsAction.continuationItems;
                    lastItem = contents[contents.length - 1];
    
                    items.push( ...YoutubePlaylistSong.getResultsFromPlaylistContents(contents) );
                }
            }
    
            // Last item should contain continuation token (100+ elements playlists)
            // If token is present, keep looping

            // The first time the playlist is retrieved, the continuation token
            // is in the "commands" object array, inside the lastItem.
            // For 100+ elements playlists, further continuation tokens can be
            // found inside the continuationCommand (see code below).
            const continuationEndpoint = lastItem?.continuationItemRenderer?.continuationEndpoint
            continuation = continuationEndpoint?.commandExecutorCommand?.commands?.pop()?.continuationCommand?.token;
            if(!continuation)
                continuation = continuationEndpoint?.continuationCommand.token

            if(!continuation) Logger.debug(`lastItem: ${JSON.stringify(lastItem)}`);
            Logger.debug(`Playlist continuation token: ${continuation}`);
        } while(continuation);
    
        return items;
    };

    /* ==== PRIVATE STATIC METHODS ========================================== */
    /** Regex that matches a valid Youtube playlist uri and extract its id. */
    private static regex: RegExp = /youtu(?:\.be|be(?:-nocookie)?\.com)\/playlist\?list=([0-9a-zA-Z_-]{18,41})(&si=[0-9a-zA-Z_-]*)?$/;

    /** Validates a Youtube URI, returning the playlist id if the URI is valid. */
    private static getPlaylistId = function(url: string): undefined | string {
        const result = YoutubePlaylistSong.regex.exec(url);
        if(result && result.length > 1) return result[1];
    }

    /** Retrieve initial context metadata necessary to navigate the playlist. */
    private static async getPlaylistInitData(id: string): Promise<any> {
        // Call Youtube endopint and retrieve initData associated to playlist.
        const uri = `https://www.youtube.com/playlist?list=${id}`;
        const { data }: { data: string } = await axios.get(uri/*, { headers: { cookie }}*/);
    
        // This endpoint is not an API - extract json data from html elements
        const initData = JSON.parse(data.split('var ytInitialData =')[1].split("</script>")[0].slice(0, -1));
    
        // Extract API key
        const innerTubeApiKey: string[] = data.split("innertubeApiKey");
        const apiToken: string | undefined = innerTubeApiKey.length > 0 ? innerTubeApiKey[1].trim().split(",")[0].split('"')[2] : undefined;
    
        // Extract context
        const innerTubeContext: string[] = data.split('INNERTUBE_CONTEXT');
        const context: string = innerTubeContext.length > 0 ? JSON.parse(innerTubeContext[1].trim().slice(2, -2)) : null;
    
        return { initData, apiToken, context };
    };
        
    /** Youtube Playlists JSON data is similar from first call to follow ups.
     *  When a JSON payload is retrieved, this method is used to extract raw
     *  data and parse it into YoutubeSong instances. */
    private static getResultsFromPlaylistContents(contents: any): YoutubeSong[] {
        const results = [];
        for(const item of contents) {
            const videoRender = item.playlistVideoRenderer;
            if (videoRender?.videoId) {
                const thumb: string | undefined = videoRender.thumbnail?.thumbnails?.pop()?.url;
    
                const lengthString: string = videoRender.lengthText?.simpleText;
                const lengthSeconds: number = parseInt(videoRender.lengthSeconds);
    
                results.push(new YoutubeSong(videoRender.title.runs[0].text, videoRender.videoId,
                    lengthSeconds, lengthString, thumb));
            }
        }
        return results;
    }

    /* DEPRECATED: YouTubeSearchApi cannot retrieve 100+ songs from playlists.
    public static async getPlaylistSongs(id: string): Promise<YoutubeSong[]> {
        let { items } = await YouTubeSearchApi.GetPlaylistData(id);
        return items.map(({ id, title, length, thumbnail }: any) => {
            const thumb: string | undefined = thumbnail?.thumbnails?.pop()?.url;
            const lengthString: string = length?.simpleText;
            const lengthSeconds: number = (lengthString && lengthString.includes(':')) ? stringToSeconds(lengthString) : 0;
            return new YoutubeSong(title, id, lengthSeconds, lengthString, thumb);
        });
    }*/
}
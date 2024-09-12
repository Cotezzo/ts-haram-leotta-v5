import ytdl from "@distube/ytdl-core";
//import ytdl from "ytdl-core";
import { secondsToString, stringToSeconds } from "../../utils/length";
import { ASong, SongType } from "../../classes/music/song/ASong";
import { Readable } from 'stream';
import { Logger } from "../../classes/logging/Logger";
import { YoutubeMixSong } from "../../classes/music/song/youtube/YoutubeMixSong";
import { YoutubePlaylistSong } from "../../classes/music/song/youtube/YoutubePlaylistSong";
const YouTubeSearchApi = require("youtube-search-api");

export class YoutubeSong extends ASong {

    /** ==== STATIC METHODS ================================================= */
    /** Regex that matches video ids in a Youtube video URIs - here's some insights
     *  Ignore initial http(s), since the url might have another encoded youtube url
     *  (ex: http://www.youtube.com/oembed?url=http%3A//www.youtube.com/watch?v%3D-wtIMTCHWuI&format=json)
     *  Youtube has different possible domains:
     *  - youtu.be, youtube.com, m.youtube.com, www.youtube.com, www.youtube-nocookie.com
     *  Also, ignore first domain (m, www) since it's optional anyway - ((www|m)\.)?

    *  Youtube video IDs can be placed after a specific path param:
    *  - /, /v/, /vi/, /e/, /embed/, /shorts/, /live/, /user/.../1/ (or any number)

    *  Youtube video IDs can be in query parameter, even encoded (see first comment)
    *  - v=, vi=, v%3D */
    public static regex: RegExp = /youtu(?:\.be|be(?:-nocookie)?\.com)\/(?:(?:(?:watch|vi?|shorts|e(?:mbed)?|live|user.*[0-9])\/)|.*vi?(?:%3D|=))?([a-zA-Z0-9_-]{11})/;
    //public static regex: RegExp = /(?:(?:www|m)\.)?youtu(?:\.be|be(?:-nocookie)?\.com)\/(?:(?:(?:watch|vi?|e(?:mbed)?|shorts|live|user.*[0-9])\/)|.*vi?(?:%3D|=))?([a-zA-Z0-9_-]{11})/gm;
    //public static regex: RegExp = /(?:youtu\.be\/|youtube\.com(?:\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=|shorts\/)|youtu\.be\/|embed\/|v\/|m\/|watch\?(?:[^=]+=[^&]+&)*?v=))([^"&?\/\s]{11})/gm;

    /** Validates a Youtube URI, returning the video id if the URI is valid. */
    public static getVideoId = function(url: string): undefined | string {
        const result = YoutubeSong.regex.exec(url);
        if(result && result.length > 1) return result[1];
    }

    /** Retrieves metadata from a valid Youtube video url. */
    public static getVideoInfo = async function(id: string): Promise<YoutubeSong> {
        YoutubeMixSong.getYoutubeMixIds(id);

        // Normalize URI after extracting video ID
        const uri = `https://www.youtube.com/watch?v=${id}`;
        const info = await ytdl.getBasicInfo(uri);
        const { title, lengthSeconds: seconds, thumbnails } = info.videoDetails;
        const lengthSeconds = +seconds;
        return new YoutubeSong(
            title, id, lengthSeconds, secondsToString(lengthSeconds),
            thumbnails.pop()?.url
        );
    }

    public static async search(query: string, limit: number, token?: object): Promise<{ items: YoutubeSong[], nextPage?: object }> {
        // If the token (nextPage token) is provided, use it to go to the next page
        // TODO: handle playlists
        let items, nextPage;
        if(token)   ({ items, nextPage } = await YouTubeSearchApi.NextPage(token, true, limit));
        else        ({ items, nextPage } = await YouTubeSearchApi.GetListByKeyword(query, true, limit, [{type:"video/playlist"}]));// "video/channel/playlist/movie"

        // Filter youtube items with useful data
        items = items.map(({ id, title, length, thumbnail, isLive, type }: any) => {

            // Retrieve thumbnail
            const thumb: string | undefined = thumbnail?.thumbnails?.pop()?.url;

            // If item is a youtube playlist, create different instance
            if(type === "playlist") {
                Logger.info(`ID: ${id}`)
                return new YoutubePlaylistSong(title, id, parseInt(length));
            }

            // If video is LIVE, don't calculate video length (use 0)
            const lengthString: string = isLive ? "🔴LIVE" : length?.simpleText;
            const lengthSeconds: number = (lengthString && lengthString.includes(':')) ? stringToSeconds(lengthString) : 0;

            // Return YoutubeSong instance
            return new YoutubeSong(title, id, lengthSeconds, lengthString, thumb);
        });

        // Return parsed items and nextPage token
        return { items: items, nextPage };
    }



    /** ==== CONSTRUCTOR ==================================================== */
    public constructor(title: string, id: string, lengthSeconds: number, lengthString: string, thumbnail?: string) {
        super(SongType.YOUTUBE, id, title, `https://www.youtube.com/watch?v=${id}`);
        this.thumbnail = thumbnail;
        this.lengthSeconds = lengthSeconds;
        this.lengthString = lengthString;
    }

    /** ==== METHODS ======================================================== */
    getStream(): Readable {
        return ytdl(this.uri!, {
            begin: 0, agent: ytdl.createAgent(),
            filter: "audioonly", quality: "highestaudio", highWaterMark: 1048576 * 32
        });
    }
}

// playmix, clear, leave, join, bind, nowplaying, queue, favourites

/* TODO: use following code as test case
const tests = ["http://www.youtube.com/watch?v=-wtIMTCHWuI",
"http://youtube.com/watch?v=-wtIMTCHWuI",
"http://m.youtube.com/watch?v=-wtIMTCHWuI",
"https://www.youtube.com/watch?v=lalOy8Mbfdc",
"https://youtube.com/watch?v=lalOy8Mbfdc",
"https://m.youtube.com/watch?v=lalOy8Mbfdc",
"http://www.youtube.com/watch?v=yZv2daTWRZU&feature=em-uploademail",
"http://youtube.com/watch?v=yZv2daTWRZU&feature=em-uploademail",
"http://m.youtube.com/watch?v=yZv2daTWRZU&feature=em-uploademail",
"https://www.youtube.com/watch?v=yZv2daTWRZU&feature=em-uploademail",
"https://youtube.com/watch?v=yZv2daTWRZU&feature=em-uploademail",
"https://m.youtube.com/watch?v=yZv2daTWRZU&feature=em-uploademail",
"http://www.youtube.com/watch?v=0zM3nApSvMg&feature=feedrec_grec_index",
"http://youtube.com/watch?v=0zM3nApSvMg&feature=feedrec_grec_index",
"http://m.youtube.com/watch?v=0zM3nApSvMg&feature=feedrec_grec_index",
"https://www.youtube.com/watch?v=0zM3nApSvMg&feature=feedrec_grec_index",
"https://youtube.com/watch?v=0zM3nApSvMg&feature=feedrec_grec_index",
"https://m.youtube.com/watch?v=0zM3nApSvMg&feature=feedrec_grec_index",
"http://www.youtube.com/watch?v=0zM3nApSvMg#t=0m10s",
"http://youtube.com/watch?v=0zM3nApSvMg#t=0m10s",
"http://m.youtube.com/watch?v=0zM3nApSvMg#t=0m10s",
"https://www.youtube.com/watch?v=0zM3nApSvMg#t=0m10s",
"https://youtube.com/watch?v=0zM3nApSvMg#t=0m10s",
"https://m.youtube.com/watch?v=0zM3nApSvMg#t=0m10s",
"http://www.youtube.com/watch?v=cKZDdG9FTKY&feature=channel",
"http://youtube.com/watch?v=cKZDdG9FTKY&feature=channel",
"http://m.youtube.com/watch?v=cKZDdG9FTKY&feature=channel",
"https://www.youtube.com/watch?v=oTJRivZTMLs&feature=channel",
"https://youtube.com/watch?v=oTJRivZTMLs&feature=channel",
"https://m.youtube.com/watch?v=oTJRivZTMLs&feature=channel",
"http://www.youtube.com/watch?v=lalOy8Mbfdc&playnext_from=TL&videos=osPknwzXEas&feature=sub",
"http://youtube.com/watch?v=lalOy8Mbfdc&playnext_from=TL&videos=osPknwzXEas&feature=sub",
"http://m.youtube.com/watch?v=lalOy8Mbfdc&playnext_from=TL&videos=osPknwzXEas&feature=sub",
"https://www.youtube.com/watch?v=lalOy8Mbfdc&playnext_from=TL&videos=osPknwzXEas&feature=sub",
"https://youtube.com/watch?v=lalOy8Mbfdc&playnext_from=TL&videos=osPknwzXEas&feature=sub",
"https://m.youtube.com/watch?v=lalOy8Mbfdc&playnext_from=TL&videos=osPknwzXEas&feature=sub",
"http://www.youtube.com/watch?v=lalOy8Mbfdc&feature=youtu.be",
"http://youtube.com/watch?v=lalOy8Mbfdc&feature=youtu.be",
"http://m.youtube.com/watch?v=lalOy8Mbfdc&feature=youtu.be",
"https://www.youtube.com/watch?v=lalOy8Mbfdc&feature=youtu.be",
"https://youtube.com/watch?v=lalOy8Mbfdc&feature=youtu.be",
"https://m.youtube.com/watch?v=lalOy8Mbfdc&feature=youtu.be",
"http://www.youtube.com/watch?v=dQw4w9WgXcQ&feature=youtube_gdata_player",
"http://youtube.com/watch?v=dQw4w9WgXcQ&feature=youtube_gdata_player",
"http://m.youtube.com/watch?v=dQw4w9WgXcQ&feature=youtube_gdata_player",
"https://www.youtube.com/watch?v=dQw4w9WgXcQ&feature=youtube_gdata_player",
"https://youtube.com/watch?v=dQw4w9WgXcQ&feature=youtube_gdata_player",
"https://m.youtube.com/watch?v=dQw4w9WgXcQ&feature=youtube_gdata_player",
"http://www.youtube.com/watch?v=ishbTyLs6ps&list=PLGup6kBfcU7Le5laEaCLgTKtlDcxMqGxZ&index=106&shuffle=2655",
"http://youtube.com/watch?v=ishbTyLs6ps&list=PLGup6kBfcU7Le5laEaCLgTKtlDcxMqGxZ&index=106&shuffle=2655",
"http://m.youtube.com/watch?v=ishbTyLs6ps&list=PLGup6kBfcU7Le5laEaCLgTKtlDcxMqGxZ&index=106&shuffle=2655",
"https://www.youtube.com/watch?v=ishbTyLs6ps&list=PLGup6kBfcU7Le5laEaCLgTKtlDcxMqGxZ&index=106&shuffle=2655",
"https://youtube.com/watch?v=ishbTyLs6ps&list=PLGup6kBfcU7Le5laEaCLgTKtlDcxMqGxZ&index=106&shuffle=2655",
"https://m.youtube.com/watch?v=ishbTyLs6ps&list=PLGup6kBfcU7Le5laEaCLgTKtlDcxMqGxZ&index=106&shuffle=2655",
"http://www.youtube.com/watch?feature=player_embedded&v=dQw4w9WgXcQ",
"http://youtube.com/watch?feature=player_embedded&v=dQw4w9WgXcQ",
"http://m.youtube.com/watch?feature=player_embedded&v=dQw4w9WgXcQ",
"https://www.youtube.com/watch?feature=player_embedded&v=dQw4w9WgXcQ",
"https://youtube.com/watch?feature=player_embedded&v=dQw4w9WgXcQ",
"https://m.youtube.com/watch?feature=player_embedded&v=dQw4w9WgXcQ",
"http://www.youtube.com/watch?app=desktop&v=dQw4w9WgXcQ",
"http://youtube.com/watch?app=desktop&v=dQw4w9WgXcQ",
"http://m.youtube.com/watch?app=desktop&v=dQw4w9WgXcQ",
"https://www.youtube.com/watch?app=desktop&v=dQw4w9WgXcQ",
"https://youtube.com/watch?app=desktop&v=dQw4w9WgXcQ",
"https://m.youtube.com/watch?app=desktop&v=dQw4w9WgXcQ",
"http://www.youtube.com/watch/-wtIMTCHWuI",
"http://youtube.com/watch/-wtIMTCHWuI",
"http://m.youtube.com/watch/-wtIMTCHWuI",
"https://www.youtube.com/watch/-wtIMTCHWuI",
"https://youtube.com/watch/-wtIMTCHWuI",
"https://m.youtube.com/watch/-wtIMTCHWuI",
"http://www.youtube.com/watch/-wtIMTCHWuI?app=desktop",
"http://youtube.com/watch/-wtIMTCHWuI?app=desktop",
"http://m.youtube.com/watch/-wtIMTCHWuI?app=desktop",
"https://www.youtube.com/watch/-wtIMTCHWuI?app=desktop",
"https://youtube.com/watch/-wtIMTCHWuI?app=desktop",
"https://m.youtube.com/watch/-wtIMTCHWuI?app=desktop",
"http://www.youtube.com/v/dQw4w9WgXcQ",
"http://youtube.com/v/dQw4w9WgXcQ",
"http://m.youtube.com/v/dQw4w9WgXcQ",
"https://www.youtube.com/v/dQw4w9WgXcQ",
"https://youtube.com/v/dQw4w9WgXcQ",
"https://m.youtube.com/v/dQw4w9WgXcQ",
"http://www.youtube.com/v/-wtIMTCHWuI?version=3&autohide=1",
"http://youtube.com/v/-wtIMTCHWuI?version=3&autohide=1",
"http://m.youtube.com/v/-wtIMTCHWuI?version=3&autohide=1",
"https://www.youtube.com/v/-wtIMTCHWuI?version=3&autohide=1",
"https://youtube.com/v/-wtIMTCHWuI?version=3&autohide=1",
"https://m.youtube.com/v/-wtIMTCHWuI?version=3&autohide=1",
"http://www.youtube.com/v/0zM3nApSvMg?fs=1&hl=en_US&rel=0",
"http://youtube.com/v/0zM3nApSvMg?fs=1&hl=en_US&rel=0",
"http://m.youtube.com/v/0zM3nApSvMg?fs=1&hl=en_US&rel=0",
"https://www.youtube.com/v/0zM3nApSvMg?fs=1&amp;hl=en_US&amp;rel=0",
"https://www.youtube.com/v/0zM3nApSvMg?fs=1&hl=en_US&rel=0",
"https://youtube.com/v/0zM3nApSvMg?fs=1&hl=en_US&rel=0",
"https://m.youtube.com/v/0zM3nApSvMg?fs=1&hl=en_US&rel=0",
"http://www.youtube.com/v/dQw4w9WgXcQ?feature=youtube_gdata_player",
"http://youtube.com/v/dQw4w9WgXcQ?feature=youtube_gdata_player",
"http://m.youtube.com/v/dQw4w9WgXcQ?feature=youtube_gdata_player",
"https://www.youtube.com/v/dQw4w9WgXcQ?feature=youtube_gdata_player",
"https://youtube.com/v/dQw4w9WgXcQ?feature=youtube_gdata_player",
"https://m.youtube.com/v/dQw4w9WgXcQ?feature=youtube_gdata_player",
"http://youtu.be/-wtIMTCHWuI",
"https://youtu.be/-wtIMTCHWuI",
"http://youtu.be/dQw4w9WgXcQ?feature=youtube_gdata_player",
"https://youtu.be/dQw4w9WgXcQ?feature=youtube_gdata_player",
"http://youtu.be/oTJRivZTMLs?list=PLToa5JuFMsXTNkrLJbRlB--76IAOjRM9b",
"https://youtu.be/oTJRivZTMLs?list=PLToa5JuFMsXTNkrLJbRlB--76IAOjRM9b",
"http://youtu.be/oTJRivZTMLs&feature=channel",
"https://youtu.be/oTJRivZTMLs&feature=channel",
"http://youtu.be/lalOy8Mbfdc?t=1",
"http://youtu.be/lalOy8Mbfdc?t=1s",
"https://youtu.be/lalOy8Mbfdc?t=1",
"https://youtu.be/lalOy8Mbfdc?t=1s",
"http://youtu.be/M9bq_alk-sw?si=B_RZg_I-lLaa7UU-",
"https://youtu.be/M9bq_alk-sw?si=B_RZg_I-lLaa7UU-",
"http://www.youtube.com/oembed?url=http%3A//www.youtube.com/watch?v%3D-wtIMTCHWuI&format=json",
"http://youtube.com/oembed?url=http%3A//www.youtube.com/watch?v%3D-wtIMTCHWuI&format=json",
"http://m.youtube.com/oembed?url=http%3A//www.youtube.com/watch?v%3D-wtIMTCHWuI&format=json",
"https://www.youtube.com/oembed?url=http%3A//www.youtube.com/watch?v%3D-wtIMTCHWuI&format=json",
"https://youtube.com/oembed?url=http%3A//www.youtube.com/watch?v%3D-wtIMTCHWuI&format=json",
"https://m.youtube.com/oembed?url=http%3A//www.youtube.com/watch?v%3D-wtIMTCHWuI&format=json",
"http://www.youtube.com/attribution_link?a=JdfC0C9V6ZI&u=%2Fwatch%3Fv%3DEhxJLojIE_o%26feature%3Dshare",
"http://youtube.com/attribution_link?a=JdfC0C9V6ZI&u=%2Fwatch%3Fv%3DEhxJLojIE_o%26feature%3Dshare",
"http://m.youtube.com/attribution_link?a=JdfC0C9V6ZI&u=%2Fwatch%3Fv%3DEhxJLojIE_o%26feature%3Dshare",
"https://www.youtube.com/attribution_link?a=JdfC0C9V6ZI&u=%2Fwatch%3Fv%3DEhxJLojIE_o%26feature%3Dshare",
"https://youtube.com/attribution_link?a=JdfC0C9V6ZI&u=%2Fwatch%3Fv%3DEhxJLojIE_o%26feature%3Dshare",
"https://m.youtube.com/attribution_link?a=JdfC0C9V6ZI&u=%2Fwatch%3Fv%3DEhxJLojIE_o%26feature%3Dshare",
"http://www.youtube.com/attribution_link?a=8g8kPrPIi-ecwIsS&u=/watch%3Fv%3DyZv2daTWRZU%26feature%3Dem-uploademail",
"http://youtube.com/attribution_link?a=8g8kPrPIi-ecwIsS&u=/watch%3Fv%3DyZv2daTWRZU%26feature%3Dem-uploademail",
"http://m.youtube.com/attribution_link?a=8g8kPrPIi-ecwIsS&u=/watch%3Fv%3DyZv2daTWRZU%26feature%3Dem-uploademail",
"https://www.youtube.com/attribution_link?a=8g8kPrPIi-ecwIsS&u=/watch%3Fv%3DyZv2daTWRZU%26feature%3Dem-uploademail",
"https://youtube.com/attribution_link?a=8g8kPrPIi-ecwIsS&u=/watch%3Fv%3DyZv2daTWRZU%26feature%3Dem-uploademail",
"https://m.youtube.com/attribution_link?a=8g8kPrPIi-ecwIsS&u=/watch%3Fv%3DyZv2daTWRZU%26feature%3Dem-uploademail",
"http://www.youtube.com/embed/lalOy8Mbfdc",
"http://youtube.com/embed/lalOy8Mbfdc",
"http://m.youtube.com/embed/lalOy8Mbfdc",
"https://www.youtube.com/embed/lalOy8Mbfdc",
"https://youtube.com/embed/lalOy8Mbfdc",
"https://m.youtube.com/embed/lalOy8Mbfdc",
"http://www.youtube.com/embed/nas1rJpm7wY?rel=0",
"http://youtube.com/embed/nas1rJpm7wY?rel=0",
"http://m.youtube.com/embed/nas1rJpm7wY?rel=0",
"https://www.youtube.com/embed/nas1rJpm7wY?rel=0",
"https://youtube.com/embed/nas1rJpm7wY?rel=0",
"https://m.youtube.com/embed/nas1rJpm7wY?rel=0",
"http://www.youtube-nocookie.com/embed/lalOy8Mbfdc?rel=0",
"https://www.youtube-nocookie.com/embed/lalOy8Mbfdc?rel=0",
"http://www.youtube.com/e/dQw4w9WgXcQ",
"http://youtube.com/e/dQw4w9WgXcQ",
"http://m.youtube.com/e/dQw4w9WgXcQ",
"https://www.youtube.com/e/dQw4w9WgXcQ",
"https://youtube.com/e/dQw4w9WgXcQ",
"https://m.youtube.com/e/dQw4w9WgXcQ",
"http://www.youtube.com/shorts/j9rZxAF3C0I",
"http://youtube.com/shorts/j9rZxAF3C0I",
"http://m.youtube.com/shorts/j9rZxAF3C0I",
"https://www.youtube.com/shorts/j9rZxAF3C0I",
"https://youtube.com/shorts/j9rZxAF3C0I",
"https://m.youtube.com/shorts/j9rZxAF3C0I",
"http://www.youtube.com/shorts/j9rZxAF3C0I?app=desktop",
"http://youtube.com/shorts/j9rZxAF3C0I?app=desktop",
"http://m.youtube.com/shorts/j9rZxAF3C0I?app=desktop",
"https://www.youtube.com/shorts/j9rZxAF3C0I?app=desktop",
"https://youtube.com/shorts/j9rZxAF3C0I?app=desktop",
"https://m.youtube.com/shorts/j9rZxAF3C0I?app=desktop",
"http://www.youtube.com/live/8hBmepWUJoc",
"http://youtube.com/live/8hBmepWUJoc",
"http://m.youtube.com/live/8hBmepWUJoc",
"https://www.youtube.com/live/8hBmepWUJoc",
"https://youtube.com/live/8hBmepWUJoc",
"https://m.youtube.com/live/8hBmepWUJoc",
"http://www.youtube.com/live/8hBmepWUJoc?app=desktop",
"http://youtube.com/live/8hBmepWUJoc?app=desktop",
"http://m.youtube.com/live/8hBmepWUJoc?app=desktop",
"https://www.youtube.com/live/8hBmepWUJoc?app=desktop",
"https://youtube.com/live/8hBmepWUJoc?app=desktop",
"https://m.youtube.com/live/8hBmepWUJoc?app=desktop"];

for(const test of tests) {
    const id = getVideoId(test);
    if(id === undefined) Logger.error("AAAAAAAAAAAA"); 
    Logger.info(`Found id [${id}] URL [${test}]`)
}*/
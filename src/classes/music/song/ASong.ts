import { Readable } from 'stream';

/** This interface is used exclusively for the UserModel MongoDB model, but
 *  must be implemented by the actual Song classes. */
abstract class ASong {

    /* ==== CONSTRUCTOR ===================================================== */
    /** Default constructor that initializes requried data. */
    protected constructor(type: ASong.SongType, id: string, title: string, uri?: string) {
        this.type = type;
        this.id = id;
        this.title = title;
        this.uri = uri;
    }

    /* ==== PROPERTIES ====================================================== */
    /** Song type, needed when storing in DB in order to interpret inner data */
    type: number;
    /** Song id, to be used with type in order to retrieve the actual data */
    id: string;
    /** Song original uri, for embed hyperlinks or to be used instead of id */
    uri?: string;
    /** Song title */
    title: string;

    /** Image thumbnail uri - not required */
    thumbnail?: string;
    /** User who requested the song - not required (added after constructor) */
    requestor?: string;
    /** Actual resource length in seconds */
    lengthSeconds?: number;
    /** To be displayed resource length - could be "???", "LIVE", ... */
    lengthString?: string;

    /* ==== METHODS ========================================================= */
    /** Method to be implemented by the actual song class.
     *  It must retrieve the a Readable stream containing the data to be played
     *  by the music bot.
     *  Some special song types could not implement this (ex: Playlists), since
     *  are actually converted to normal songs before being played. */
    getStream(): Readable | Promise<Readable> { throw new Error("Method not implemented."); }
    
    /** Some special song types are actually a collection of songs (ex: Mixes).
     *  This method is used to navigate this inner queue.
     *  The method must return FALSE if the inner queue has been exhausted.
     *  This is the default behaviour for normal songs. */
    skip(): boolean | Promise<boolean> { return false; }
}

module ASong {
    /** Each song must identify its type so that, when saving and retrieving from
     *  MongoDB, the inner data can be interpreted correctly. */
    export enum SongType { YOUTUBE, YOUTUBE_PLAYLIST, YOUTUBE_MIX, SPOTIFY, RAW_URI }
}

export default ASong;
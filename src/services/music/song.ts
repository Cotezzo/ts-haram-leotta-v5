import { ISong } from "../../data/model/userModel";
import { Readable } from 'stream';

export enum SongType { YOUTUBE, YOUTUBE_PLAYLIST, YOUTUBE_MIX, SOUNDCLOUD, SPOTIFY }

export abstract class ASong implements ISong {

    /** ==== CONSTRUCTOR ==================================================== */
    protected constructor(title: string, uri: string, type: SongType) {
        this.title = title;
        this.uri = uri;
        this.type = type;
    }

    /** ==== PROPERTIES ===================================================== */
    title: string;
    uri: string;
    type: number;

    requestor?: string | undefined;

    thumbnail?: string | undefined;
    lengthSeconds?: number | undefined;
    lengthString?: string | undefined;
    begin?: number | undefined;

    /** ==== ABSTRACT METHODS =============================================== */
    abstract getStream(): Readable | Promise<Readable>;
    skip(): boolean | Promise<boolean> { return false; }
}
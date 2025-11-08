import axios from "axios";
import ASong from "./ASong.js";
import { Readable } from "stream";
import Logger from "../../logging/Logger.js";

export default class RawUriSong extends ASong {

    /* ==== CONSTRUCTOR ===================================================== */
    /** Initialize song with required data. */
    public constructor(uri: string) {
        const title = (uri.split("/").pop() || uri).split(".")[0];
        super(ASong.SongType.RAW_URI, uri, title, uri);
    }

    /* ==== METHODS ========================================================= */
    /** Blindly try to retrieve stream from the provided uri. */
    async getStream(): Promise<Readable> {
        Logger.info(`Retrieving audio stream for ${this.uri}`);
        return (await axios.get(this.id, { responseType: "stream" })).data;
    }
}
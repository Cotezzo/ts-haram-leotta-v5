import Logger from "../logging/Logger";
import MusicPlayer from "./MusicPlayer";
import ASong from "./song/ASong";

export default abstract class MusicQueue {

    /* ==== CONSTRUCTOR ===================================================== */
    constructor(cacheSize: number = 5, loopPolicy: MusicPlayer.LoopPolicy = MusicPlayer.LoopPolicy.NONE) {
        this.cacheSize = cacheSize;
        this.loopPolicy = loopPolicy;
    }

    /* ==== PROPERTIES ====================================================== */
    /** Songs currently in queue. */
    public queue: ASong[] = [];
    /** Cache of songs that have already been played.
     *  Used for commands that rewind the playlist to play skipped songs.
     *  The cache has a maximum size defined by property `this.cacheSize`. */
    public cache: ASong[] = [];
    /** Max size of played songs cache. Provided as a constructor parameter. */
    private cacheSize: number;
    /** Changes the `skip()` command behaviour.
     *  "NONE": `skip()` effectively removes the current song.
     *  "SONG": `skip()` has no effect on queue - current song is played again.
     *  "ALL": `skip()` puts current song at the top of the queue. */
    public loopPolicy: MusicPlayer.LoopPolicy;

    /* ==== ABSTRACT METHODS ================================================ */
    public abstract play(): Promise<boolean>;
    public abstract stop(): Promise<void>;
    public abstract updateDynamicMessages(): Promise<void>;
    public abstract deleteDynamicMessages(): Promise<void>;

    /* ==== PRIVATE METHODS ================================================= */
    /** Adds a song at last position of the cached songs.
     *  If maximum cache size is 0, nothing is cached.
     *  If maximum cache size is not 0 but has been reached, the oldest entry
     *  is removed from the cache and the new one is pushed. */
    private addToCache(song: ASong) {
        // Cache size == 0: do nothing
        if(!this.cacheSize) return;

        // If cache size has reached maximum, evict oldest entry before pushing
        if(this.cache.length == this.cacheSize) { this.cache.shift(); }
        
        // Save song to cache
        this.cache.push(song);
    }

    /* ==== METHODS ========================================================= */
    /** Add a new song to the queue. */
    public async add(...songs: ASong[]): Promise<void> {
        Logger.trace("Entering MusicQueue::add()");

        const prevLen = this.queue.length;
        this.queue.push(...songs);

        // If queue was empty, play new song
        // TODO: ok?
        if(prevLen == 0) {
            await this.play();
        } else {
            await this.updateDynamicMessages();
        }
    }

    /** Remove first queue element (currently playing song).
     *  The command behaviour changes based on the loop policy.
     *  "NONE": effectively removes and caches the current song (if any).
     *  "SONG": has no effect on queue - current song is played again.
     *  "ALL": puts current song at the top of the queue. */
    public async skip(force: boolean = false): Promise<void> {
        Logger.trace("Entering MusicPlayer::skip()");

        // Some "songs" are actually a collection of songs (undefined amount).
        // In this case, do not handle a normal skip modifying the queue, but
        // rather using the song skip method.
        // The song skip method is expected to return false when the actual
        // inner queue is exhausted.
        // This is only used in Youtube mixes for now.
        // The skipmix command bypasses this logic and forces a normal skip.
        const keep: boolean = force || !!await this.getCurrent()?.skip?.();

        // If skip has been forced or the song inner queue is empty, skip song
        if(force || !keep) {
            if(this.loopPolicy === MusicPlayer.LoopPolicy.NONE) {
                const song = this.queue.shift();
                if(song) this.addToCache(song);
            }
            
            else if(this.loopPolicy === MusicPlayer.LoopPolicy.ALL) {
                const song = this.queue.shift();
                if(song) await this.add(song);
            } 
            // If LoopPolicy.SONG, queue is not to be modified, play current song
        }

        // After updating queue, stop current song and play new one
        // TODO: ok?
        await this.stop();
        const playing = await this.play();

        // If no song has started playing, delete
        if(!playing) {
            await this.deleteDynamicMessages();
        }
    }

    /** Remove last cache element (latest played song).
     *  If the cache wasn't empty, save song to played songs cache. */
    public async back(): Promise<void> {
        const song = this.cache.pop();
        if(song) this.queue.unshift(song);
        
        // After updating queue, stop current song and play new one
        // TODO: ok?
        await this.stop();
        await this.play();
    }

    /** Remove an element from the current queue, without caching the removed
     *  song. If the removed song was currently playing, the new current song
     *  must be played. */
    public async remove(index: number): Promise<void> {
        this.queue.splice(index, 1);

        // If the removed song is at position 0, it means it is being played.
        // Stop it and play the new one in queue (if any).
        // TODO: ok?
        if(index == 0) {
            await this.stop();
            await this.play();
        } else {
            await this.updateDynamicMessages();
        }
    }

    //! `clear()` not implemented: delete this object entry (and stop playing?)

    /** Updates the current loop policy for this player.
     *  If no policy is specified, it is updated based on current setting. */
    public async setLoopPolicy(loopPolicy?: MusicPlayer.LoopPolicy): Promise<void> {
        if(loopPolicy)  this.loopPolicy = loopPolicy;
        else            this.toggleLoopPolicy();

        await this.updateDynamicMessages();
    }

    /** Updates the current loop policy based on the current setting. */
    public toggleLoopPolicy() {
        if(this.loopPolicy == MusicPlayer.LoopPolicy.NONE)
            return this.loopPolicy = MusicPlayer.LoopPolicy.SONG;

        if(this.loopPolicy == MusicPlayer.LoopPolicy.SONG)
            return this.loopPolicy = MusicPlayer.LoopPolicy.ALL;

        if(this.loopPolicy == MusicPlayer.LoopPolicy.ALL)
            return this.loopPolicy = MusicPlayer.LoopPolicy.NONE;
    }

    /** Randomly changes the position of all the songs in the queue, except
     *  for the currently playing one. */
    public async shuffle() {
        for (let i = 1; i < this.queue.length; i++) {
            const j = Math.floor(Math.random() * (this.queue.length - 1)) + 1;
            [this.queue[i], this.queue[j]] = [this.queue[j], this.queue[i]];
        }
        await this.updateDynamicMessages();
    }

    /** Retrieves the currently playing song. */
    public getCurrent(): ASong | undefined {
        return this.queue[0];
    }
}
import { GuildMember, Interaction, Message, PermissionsBitField, TextBasedChannel, TextChannel, VoiceBasedChannel } from "discord.js";
import MusicQueue from "./MusicQueue";
import { AudioPlayer, AudioPlayerError, AudioPlayerState, AudioPlayerStatus, AudioResource, StreamType, VoiceConnection, VoiceConnectionStatus, createAudioPlayer, createAudioResource, joinVoiceChannel } from "@discordjs/voice";
import { Readable } from 'stream';
import { sleep } from "../../utils/sleep";
import YoutubeSong from "./song/youtube/YoutubeSong";
import SpotifySong from "./song/spotify/SpotifySong";
import Logger from "../logging/Logger";
import NowPlayingMessage from "./message/nowPlayingMessage";
import QueueMessage from "./message/queueMessage";
import YoutubePlaylistSong from "./song/youtube/YoutubePlaylistSong";
import ASong from "./song/ASong";
import RawUriSong from "./song/RawUriSong";

class MusicPlayer extends MusicQueue {

    /* ==== STATIC PROPERTIES =============================================== */
    /** Map used to memorize music oplayer information relatively to servers. */
    public static cache: Map<string, MusicPlayer> = new Map();
    /** Set used to lock cache entries to aviod concurrency issues. */
    public static locks: Set<string> = new Set();

    /* ==== STATIC METHODS ================================================== */
    /** To be used before musicPlayer instance retrival.
     *  Locks the musicPlayer instance in the lock map to avoid concurrency. */
    protected static lock = async function (groupId: string, reason?: string) {
        // This functionality has a lock on the entire cache group, to avoid
        // concurrency issues: this method may modify the entry.
        //! "Loop" must use an async method - read RedditService for more info.
        while (MusicPlayer.locks.has(groupId)) await sleep(0);
        MusicPlayer.locks.add(groupId);
        Logger.debug(`${groupId} locked [${reason}]`);
    }

    /** To be used after finishing maniuplating the musicPlayer instance.
     *  Unlocks the musicPlayer instance in the lock map. */
    protected static unlock = function (groupId: string, reason?: string) {
        // Whatever happens, remove lock at all costs
        MusicPlayer.locks.delete(groupId);
        Logger.debug(`${groupId} unlocked [${reason}]`);
    }

    /** Wraps callback execution in try-finally block with musicPlayer locks. */
    public static async locking<O>(groupId: string, callback: () => O, reason?: string): Promise<O> {
        // Wait for the lock to free up and lock for this process
        await MusicPlayer.lock(groupId, reason);
        try {
            return await callback();
        } finally {
            // Whatever happens, unlock instance after calback execution
            MusicPlayer.unlock(groupId, reason);
        }
    }

    /** Checks whether the user that sent the message / interaction has actually
     *  joined a voice channel in which the bot has permissions. If it has, the
     *  voiceChannel instance is returned. */
    protected static async checkVoicePresence(i: Message | Interaction): Promise<VoiceBasedChannel | undefined> {
        let member: GuildMember | undefined;

        // If user is cached, retrieve it directly from the message/interaction
        if (i.member instanceof GuildMember) {
            member = i.member;
        }

        // If it's not, fetch it
        else {
            member = await i.guild?.members.fetch(i.member?.user.id as string)
                .catch(_ => undefined);
        }

        // Check if the member is found and has a voice channel
        const channel: VoiceBasedChannel | undefined | null = member?.voice.channel;

        // If member is in voiceChannel in which bot has permissions, return it
        if(!channel || !MusicPlayer.checkVoiceChannelPermissions(channel)) {
            throw new Error("Bot has no permissions on the voice channel");
        }
        return channel;
        
        /*
        // Retrieve voice channel permissions for "me" (bot user)
        const me = channel.guild.members.me;
        if (!me) return;
        const permissions = channel.permissionsFor(me);

        // Check if bot can join and speak in the voice channel
        if (!permissions.has(PermissionsBitField.Flags.Connect)) return;
        if (!permissions.has(PermissionsBitField.Flags.Speak)) return;
        return channel;*/
    }

    public static checkVoiceChannelPermissions(channel: VoiceBasedChannel) {
        // Retrieve voice channel permissions for "me" (bot user)
        const me = channel.guild.members.me;
        if (!me) return false;
        const permissions = channel.permissionsFor(me);
    
        // Check if bot can join and speak in the voice channel
        if (!permissions.has(PermissionsBitField.Flags.Connect)) return false;
        if (!permissions.has(PermissionsBitField.Flags.Speak)) return false;
        return true;
    }

    /** Checks whether the cpmmand sent by the user actually is in a valid text
     *  channel in which the bot has permissions. If it has, the textChannel instance is returned. */
    public static checkTextChannelPermissions(i: Message | Interaction): TextChannel | undefined {

        // Retrieve text channel in which the command has been sent
        const channel: TextBasedChannel | null = i.channel;

        // If there is not text channel, or it isn't a guild channel, return
        if (!channel || !(channel instanceof TextChannel)) return;

        // Retrieve voice channel permissions for "me" (bot user)
        const me = channel.guild.members.me;
        if (!me) return;
        const permissions = channel.permissionsFor(me);

        // Check if bot can view and send messages in the text channel
        if (!permissions.has(PermissionsBitField.Flags.ViewChannel)) return;
        if (!permissions.has(PermissionsBitField.Flags.SendMessages)) return;
        return channel;
    }

    /** To be used to perform methods on a musicPlayer instance.
     *  MusicPlayer instances can only retrieved and used with this method,
     *  which locks the instance used to avoid concurrency.
     *  After the callback function is completed, the lock is free'd. */
    public static async get(msg: Message | Interaction, callback: (player: MusicPlayer) => any): Promise<void> {
        // Retrieve server id as cache lock policy.
        // If there is no guild, return; the message was probably sent in PMs.
        const groupId: string | undefined = msg.guild?.id;
        if (!groupId) return;

        // Check if user is in a voice channel in which the bot has permissions
        const voiceChannel: VoiceBasedChannel | undefined = await MusicPlayer.checkVoicePresence(msg);
        if (!voiceChannel) return;

        const textChannel: TextChannel | undefined = MusicPlayer.checkTextChannelPermissions(msg);

        // Retrieve musicPlayer and execute requested logic safely (with locks)
        MusicPlayer.locking(groupId, async () => {
            // Retrieve player from cache (create instance if it not present)
            let musicPlayer: MusicPlayer | undefined = MusicPlayer.cache.get(groupId);
            if (!musicPlayer) {
                musicPlayer = new MusicPlayer(groupId, voiceChannel, textChannel);
                MusicPlayer.cache.set(groupId, musicPlayer);
            }

            // If player had a voice channel, check if it's the same as user's
            if (musicPlayer.voiceChannel.id !== voiceChannel.id) return;

            //return player;
            await callback(musicPlayer);
        }, "MusicPlayer::get");
    }

    /** Parses an uri into ASong instances that can be played on the MusicPlayer.
     *  If the uri is invalid or not supported, undefined is returned. */
    public static async getSong(uri: string): Promise<ASong[]> {

        let songs: ASong[] | undefined;
        if(songs = await YoutubeSong.fromUri(uri))          return songs;
        if(songs = await YoutubePlaylistSong.fromUri(uri))  return songs;
        if(songs = await SpotifySong.fromSongUri(uri))      return songs;
        if(songs = await SpotifySong.fromAlbumUri(uri))     return songs;
        if(songs = await SpotifySong.fromPlaylistUri(uri))  return songs;
        
        // TODO: SoundCloud
        // TODO: YewTube (Youtube mature content that needs authentication)

        return [new RawUriSong(uri)];

        // Uri is not supported, throw
        throw new Error("Invalid or unhandled uri");
    }

    /* ==== CONSTRUCTOR ===================================================== */
    /** MusicPlayer instances can only be created from the get() method in case
     *  the provided groupId is not present in the musicPlayer list. */
    private constructor(groupId: string, voiceChannel: VoiceBasedChannel, textChannel?: TextChannel) {
        super(5, MusicPlayer.LoopPolicy.NONE);
        this.voiceChannel = voiceChannel;
        this.groupId = groupId;

        // Initialize inner player and subscribe to meaningful events
        this.player = createAudioPlayer();

        // Override previous implementation adding the "manual" parameter;
        // used to tell apart "resourced finished" from "resourced stopped".
        this.player.stop = function (force = false, manual: boolean = false) {
            if (this.state.status === "idle" /* Idle */)
                return false;
              if (force || this.state.resource.silencePaddingFrames === 0) {
                this.state = {
                  status: "idle", manual
                } as any;
              } else if (this.state.resource.silenceRemaining === -1) {
                this.state.resource.silenceRemaining = this.state.resource.silencePaddingFrames;
              }
              return true;
        };

        // If errors occur during reproduction, skip broken resource
        this.player.on("error", (error: AudioPlayerError) => {
            Logger.error("Player error", error);
            MusicPlayer.locking(this.groupId, async () => await this.skip(), "player error -> this.skip");
        });

        // If state transitions from Playing to Idle, a resources stopped
        // playing - that could be due to it finishing or due to manual stop.
        // If the resource finished playing, skip to the next song.
        // If the resource has been manually stopped, do nothing.
        this.player.on("stateChange", (oldState: AudioPlayerState, newState: AudioPlayerState) => {
            Logger.trace(`Player stateChange: ${oldState.status} -> ${newState.status}`);

            if (
                oldState.status === AudioPlayerStatus.Playing
                && newState.status === AudioPlayerStatus.Idle
                && !(newState as any).manual
            ) {
                MusicPlayer.locking(this.groupId, async () => await this.skip(), "player stateChange -> finished");
            }
        });

        // If textChannel exists and the bot has the right permissions,
        // create dynamic message.
        if(textChannel) {
            Logger.debug("Valid textChannel");
            this.nowPlayingMessage = new NowPlayingMessage(textChannel);
            this.queueMessage = new QueueMessage(textChannel);
        }
    }

    /* ==== PROPERTIES ====================================================== */
    /** Voice channel in which the bot is connected to play the music.
     *  Cannot be undefined. */
    public voiceChannel: VoiceBasedChannel;
    /** Key used for locking logic. Events can start self-locking processes. */
    public groupId: string;
    /** Manages the resources being played on the connection, and contains
     *  informations about the current state of the playing resource. */
    public player: AudioPlayer;
    /** Resource audio volume. Initialized at 1. */
    public volume: number = 1;

    /** Actual connection to the voice channel. */
    public connection: VoiceConnection | undefined = undefined;
    /** Current playing song object; contains actual data stream with audio
     *  playing and metadata and other settings (volume, duration, ...). */
    public resource: AudioResource | undefined = undefined;

    public nowPlayingMessage: NowPlayingMessage | undefined;
    public queueMessage: QueueMessage | undefined;

    /* ==== METHODS ========================================================= */
    /** Connect the bot to the selected voice channel, if the connection hasn't
     *  been established already or it has been terminated. */
    public connect() {
        // If the connection already exists, check its current state
        if (this.connection) {
            // If connection is valid (not disconnected or destroyed), return
            if (
                this.connection?.state.status !== VoiceConnectionStatus.Destroyed &&
                this.connection?.state.status !== VoiceConnectionStatus.Disconnected
            ) return;

            // If connection is invalid, destroy before reconnecting
            this.disconnect();
        }

        // Instance new voice channel connection
        this.connection = joinVoiceChannel({
            channelId: this.voiceChannel.id, guildId: this.voiceChannel.guildId,
            adapterCreator: this.voiceChannel.guild.voiceAdapterCreator as any
        });

        this.connection.on("stateChange", async (_, newState) => {
            Logger.trace("Connection state changed to " + newState.status);

            /*// Someone moved or disconnected the bot - destroy connection
            if (
                newState.status === VoiceConnectionStatus.Destroyed ||
                newState.status === VoiceConnectionStatus.Disconnected
            ) this.disconnect();*/
        });

        this.connection.on("error", e => {
            Logger.error("Connection error", e);
            this.destroy();
        });

        // Apply player to the connection
        this.connection.subscribe(this.player);
    }

    /** Disconnect the bot from the voice channel, terminating and removing
     *  the connection (if any). */
    public disconnect() {
        if (!this.connection) return;
        Logger.trace("Manually destroying connection");

        // Destroy connection to prevent memory leaks
        if (this.connection.state.status !== VoiceConnectionStatus.Destroyed) this.connection.destroy();
        this.connection = undefined;
    }

    /** Returns true if the song is a valid resource and started playing. */
    public async play(): Promise<boolean> {
        Logger.trace("Entering MusicPlayer::play()");

        const song: ASong | undefined = super.getCurrent();
        if (!song) return false;
        
        let stream: Readable;
        try {
            stream = await song.getStream();
        } catch(e: any) {
            Logger.error("Error retrieving stream\n", e);
            await this.skip();
            return false;
        }

        // Create audio resource with retrieved stream
        this.resource = createAudioResource(stream, {
            inlineVolume: true,
            inputType: StreamType.Arbitrary
        });

        // Connect to voice channel (if not connected already)
        this.connect();
        // Update resource volume
        this.setVolume();
        // Bind resource to player
        this.player.play(this.resource);

        // Update dynamic message displaying the currently playing song
        await this.nowPlayingMessage?.updateContent(this)?.resend();

        return true;
    }

    public async stop() {
        Logger.trace("Entering MusicPlayer::stop()");

        // Assert player is unpaused first
        //this.unpause();

        // Message is not deleted here: if play() is called after the player has
        // stopped, it will update the message:
        // - if another song is played, the message is updated (or resent)
        // - if no song is left, the message is deleted
        (this.player.stop as any)(true, true);
    }

    /** Updates the volume to be used for the resources to be played.
     *  It can be called without parameters to update the volume of the current
     *  resource, since it has to be set each time a new one is cerated. */
    public setVolume = (volume: number = this.volume) => {
        // Update volume property
        this.volume = volume;
        // If a resource is present, update its volume
        this.resource?.volume?.setVolume(this.volume);
    }

    /** Pauses the current playing resource. */
    public async pause(): Promise<void> {
        this.player.pause();

        // Update queue message
        await this.nowPlayingMessage?.updateContent(this)?.resend();
    }

    /** Resumes the current paused resource. */
    public async unpause(): Promise<void> {
        this.player.unpause();

        // Update queue message
        await this.nowPlayingMessage?.updateContent(this)?.resend();
    }

    /** Stops the current resource from playing and disconnects the bot;
     *  removes this music player from the global cache and cleans pending
     *  event listeners to prevent memory leaks. */
    public async destroy() {
        await this.stop();
        await this.nowPlayingMessage?.delete();
        await this.queueMessage?.delete();
        this.disconnect();
        this.player.removeAllListeners();
        this.connection?.removeAllListeners();
        MusicPlayer.cache.delete(this.groupId);
        Logger.info("MusicPlayer destroyed");
    }

    /** Updates the content of nowPlayingMessage and queueMessage messages. */
    public async updateDynamicMessages(): Promise<void> {
        await this.nowPlayingMessage?.updateContent(this)?.update();
        if(this.queueMessage?.message) {
            await this.queueMessage?.updateContent(this)?.update();
        }
    }

    /** Deletes nowPlayingMessage and queueMessage messages. */
    public async deleteDynamicMessages(): Promise<void> {
        await this.nowPlayingMessage?.delete();
        await this.queueMessage?.delete();
    }
}

module MusicPlayer {
    export enum LoopPolicy { NONE, SONG, ALL }
}

export default MusicPlayer;
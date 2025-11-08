import { ActionRowBuilder, ButtonBuilder, ButtonStyle, Interaction, Message, TextChannel } from "discord.js";
import DynamicMessage from "./dynamicMessage.js";
import MusicPlayer from "../MusicPlayer.js";
import ASong from "../song/ASong.js";
import { sleep } from "../../../utils/sleep.js";
import Logger from "../../logging/Logger.js";
import UserRepository from "../../user/UserRepository.js";

const RESULTS_PER_PAGE: number = 10;

export default class FavouritesMessage extends DynamicMessage {

    /* ==== STATIC PROPERTIES =============================================== */
    /** Map used to memorize music oplayer information relatively to servers. */
    public static cache: Map<string, FavouritesMessage> = new Map();
    /** Set used to lock cache entries to aviod concurrency issues. */
    public static locks: Set<string> = new Set();

    /* ==== STATIC METHODS ================================================== */
    /** To be used before musicPlayer instance retrival.
     *  Locks the musicPlayer instance in the lock map to avoid concurrency. */
    protected static lock = async function (groupId: string, reason?: string) {
        // This functionality has a lock on the entire cache group, to avoid
        // concurrency issues: this method may modify the entry.
        //! "Loop" must use an async method - read RedditService for more info.
        while (FavouritesMessage.locks.has(groupId)) await sleep(0);
        FavouritesMessage.locks.add(groupId);
        Logger.debug(`${groupId} locked [${reason}]`);
    }

    /** To be used after finishing maniuplating the musicPlayer instance.
     *  Unlocks the musicPlayer instance in the lock map. */
    protected static unlock = function (groupId: string, reason?: string) {
        // Whatever happens, remove lock at all costs
        FavouritesMessage.locks.delete(groupId);
        Logger.debug(`${groupId} unlocked [${reason}]`);
    }

    /** Wraps callback execution in try-finally block with musicPlayer locks. */
    public static async locking<O>(groupId: string, callback: () => O, reason?: string): Promise<O> {
        // Wait for the lock to free up and lock for this process
        await FavouritesMessage.lock(groupId, reason);
        try {
            return await callback();
        } finally {
            // Whatever happens, unlock instance after calback execution
            FavouritesMessage.unlock(groupId, reason);
        }
    }

    /** To be used to perform methods on a favouriteMessage instance.
     *  FavouriteMessage instances can only retrieved and used with this method,
     *  which locks the instance used to avoid concurrency.
     *  After the callback function is completed, the lock is free'd. */
    public static async get(i: Message | Interaction, callback: (message: FavouritesMessage | undefined) => any, create: boolean = false): Promise<void> {
        // Retrieve server id + user id as cache lock policy.
        // If there is no guild, return; the message was probably sent in PMs.
        if (!i.guild?.id || !i.member?.user.id) return;
        const userId = i.member.user.id;
        const groupId: string | undefined = i.guild.id + userId;

        // Check for textChannel - if none, return
        const textChannel: TextChannel | undefined = MusicPlayer.checkTextChannelPermissions(i);
        if(!textChannel) return;

        // Retrieve musicPlayer and execute requested logic safely (with locks)
        FavouritesMessage.locking(groupId, async () => {
            // Retrieve message from cache (if any)
            let favouritesMessage: FavouritesMessage | undefined = FavouritesMessage.cache.get(groupId);

            if(create) {
                // If message was already present, delete it and create a new one
                if(favouritesMessage) await favouritesMessage.delete();

                favouritesMessage = new FavouritesMessage(textChannel, userId, groupId);
                await favouritesMessage.updateQueue();
                FavouritesMessage.cache.set(groupId, favouritesMessage);
            }

            await callback(favouritesMessage);
        }, "FavouritesMessage::get");
    }

    /* ==== CONSTRUCTOR ===================================================== */
    constructor(textChannel: TextChannel, userId: string, groupId: string) {
        super(textChannel);
        this.userId = userId;
        this.groupId = groupId;
    }

    public userId: string;
    public groupId: string;
    public currentPage: number = 0;
    public queue: ASong[] = [];

    public async updateQueue() {
        this.queue = await UserRepository.getUserFavourites(this.userId) || [];
    }

    private getLastPage(): number {
        return Math.ceil(this.queue.length / RESULTS_PER_PAGE) - 1;
    }

    /** Generates the message string content containing the list of songs in the
     *  queue for at the specified page index.
     *  If the page number is invalid, it is normalized (if < 0, 0 is used;
     *  if > last possible page, last page is used).
     *  The displayed page index is saved in the queueMessage istance. */
    private getContent(page: number, lastPage: number): string {

        // If queue is empty, return default message
        if(!this.queue.length) return "```swift\nNo favourite songs yet. You can use \"ham favadd\" on a playing song to add it to your list.```";

        // If provided page is negative (invalid), use 0 instead (first page)
        if(page < 0) {
            page = 0;
        }

        // If provided page is too high (first result number doesn't exist),
        // use the last page instead
        if((page * RESULTS_PER_PAGE) + 1 > this.queue.length) {
            page = lastPage;
        }

        // Update current displaying page
        this.currentPage = page;

        // Retrieve the first RESULT_PER_PAGE songs at the page index 
        const firstIndex = this.currentPage * RESULTS_PER_PAGE;
        const songs = this.queue.slice(firstIndex, firstIndex + RESULTS_PER_PAGE);


        // Generate header with queue summary
        const header = `\`\`\`swift\nYour favourite songs (${this.queue.length} elements)\n\n`;

        // For each song in the queue, extract queue position, title and length
        const body = songs.map((s: ASong, index: number) => {
            const songLength: string = s.lengthString || "???";
            return `${index + firstIndex + 1}) [${songLength}] ${s.title}`;
        }).join("\n");

        // Generate footer with page summary
        const footer = `\n\nPage ${this.currentPage + 1}/${lastPage + 1}            Choose a song typing "ham favplay <n>"\`\`\``;

        return header + body + footer;
    }

    /** Generates the new message content for the queueMessage and creates the
     *  button interactions used by users to navigate the queue. */
    public updateContent(page: number = this.currentPage): DynamicMessage {
        const lastPage = this.getLastPage();
        const content = this.getContent(page, lastPage);
        
        // Generate embed reactions to be used as command shortcuts
        const component = new ActionRowBuilder().addComponents(

            new ButtonBuilder()
                .setCustomId(`fav-first`)
                .setStyle(ButtonStyle.Secondary)
                .setEmoji("877853994255527946")
                .setDisabled(this.currentPage === 0),

            new ButtonBuilder()
                .setCustomId(`fav-previous`)
                .setStyle(ButtonStyle.Secondary)
                .setEmoji("877853994255527946")
                .setDisabled(this.currentPage === 0),

            new ButtonBuilder()
                .setCustomId(`fav-next`)
                .setStyle(ButtonStyle.Secondary)
                .setEmoji("877853994326851634")
                .setDisabled(this.currentPage >= lastPage),

            new ButtonBuilder()
                .setCustomId(`fav-last`)
                .setStyle(ButtonStyle.Secondary)
                .setEmoji("877853994326851634")
                .setDisabled(this.currentPage >= lastPage),

            new ButtonBuilder()
                .setCustomId(`fav-delete`)
                .setStyle(ButtonStyle.Secondary)
                .setEmoji("✖️")
        );

        return super.setContent({ content, components: [component] });
    }

    /** Updates the message content to display the first queue page index. */
    public first(): DynamicMessage {
        return this.updateContent(0);
    }
    /** Updates the message content to display the previous queue page index. */
    public previous(): DynamicMessage {
        return this.updateContent(this.currentPage - 1);
    }
    /** Updates the message content to display the next queue page index. */
    public next(): DynamicMessage {
        return this.updateContent(this.currentPage + 1);
    }
    /** Updates the message content to display the last queue page index. */
    public last(): DynamicMessage {
        return this.updateContent(this.getLastPage());
    }

    /** Retrieves the song at the provided index. If the index is out of bounds,
     *  undefined is returned. */
    public getSong(index: number): ASong | undefined {
        return this.queue[index];
    }

    /** Deletes the message and removes this instance from the cache. */
    public async destroy() {
        await this.delete();
        FavouritesMessage.cache.delete(this.groupId);
    }
}
import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";
import DynamicMessage from "../../../classes/music/message/dynamicMessage.js";
import MusicPlayer from "../MusicPlayer.js";
import { secondsToString } from "../../../utils/length.js";
import ASong from "../song/ASong.js";

const RESULTS_PER_PAGE: number = 10;

export default class QueueMessage extends DynamicMessage {
    public currentPage: number = 0;

    /** Calculates the last usable page index (starting from 0) for the queue
     *  visualization. Only returns a valid index when the queue has at least
     *  one item (otherwise, -1). */
    private getLastPageIndex(musicPlayer: MusicPlayer): number {
        return Math.ceil(musicPlayer.queue.length / RESULTS_PER_PAGE) - 1;
    }

    /** Generates the message string content containing the list of songs in the
     *  queue for at the specified page index.
     *  If the page number is invalid, it is normalized (if < 0, 0 is used;
     *  if > last possible page, last page is used).
     *  The displayed page index is saved in the queueMessage istance. */
    private getContent(musicPlayer: MusicPlayer, page: number, lastPage: number): string {
        const queue = musicPlayer.queue;

        // If queue is empty, return default message
        if(!queue.length) return "```swift\n                             Nothing to see here.```";

        // If provided page is negative (invalid), use 0 instead (first page)
        if(page < 0) {
            page = 0;
        }

        // If provided page is too high (first result number doesn't exist),
        // use last page instead
        if((page * RESULTS_PER_PAGE) + 1 > queue.length) {
            page = lastPage;
        }

        // Update current displaying page
        this.currentPage = page;

        // Generate header with queue summary
        const queueLength: string = secondsToString(queue.reduce((total, song) => total += song.lengthSeconds || 0, 0));
        const header = `\`\`\`swift\n${queue.length} enqueued songs - Total duration: ${queueLength}\n\n`;

        // Retrieve the first RESULT_PER_PAGE songs at the page index 
        const firstIndex = this.currentPage * RESULTS_PER_PAGE;
        const songs = queue.slice(firstIndex, firstIndex+RESULTS_PER_PAGE);

        // For each song in the queue, extract queue position, title and length
        const body = songs.map((s: ASong, index: number) => {
            const songLength: string = s.lengthSeconds ? secondsToString(s.lengthSeconds) : "???";
            return `${index + firstIndex + 1}) [${songLength}]   ${s.title}`;
        }).join("\n");

        // Generate footer with page summary
        const footer = `\n\nPage ${this.currentPage + 1}/${lastPage + 1}                 ${
            this.currentPage === lastPage 
                ? `Nothing else to see here. `
                : `${queue.length - ((this.currentPage) * RESULTS_PER_PAGE + songs.length)
            } more songs... `}`
            + `\`\`\``;

        return header + body + footer;
    }

    /** Generates the new message content for the queueMessage and creates the
     *  button interactions used by users to navigate the queue. */
    public updateContent(musicPlayer: MusicPlayer, page: number = this.currentPage): DynamicMessage | undefined {
        const lastPage = this.getLastPageIndex(musicPlayer);

        const content = this.getContent(musicPlayer, page, lastPage);
        
        // Generate embed reactions to be used as command shortcuts
        const component = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`queue-first`)
                .setStyle(ButtonStyle.Secondary)
                .setEmoji("877853994255527946")
                .setDisabled(this.currentPage === 0),

            new ButtonBuilder()
                .setCustomId(`queue-previous`)
                .setStyle(ButtonStyle.Secondary)
                .setEmoji("877853994255527946")
                .setDisabled(this.currentPage === 0),

            new ButtonBuilder()
                .setCustomId(`queue-next`)
                .setStyle(ButtonStyle.Secondary)
                .setEmoji("877853994326851634")
                .setDisabled(this.currentPage === lastPage),

            new ButtonBuilder()
                .setCustomId(`queue-last`)
                .setStyle(ButtonStyle.Secondary)
                .setEmoji("877853994326851634")
                .setDisabled(this.currentPage === lastPage),

            new ButtonBuilder()
                .setCustomId(`queue-delete`)
                .setStyle(ButtonStyle.Secondary)
                .setEmoji("✖️")
        );


        return super.setContent({ content, components: [component] });
    }

    /** Updates the message content to display the first queue page index. */
    first(musicPlayer: MusicPlayer): DynamicMessage | undefined {
        return this.updateContent(musicPlayer, 0);
    }
    /** Updates the message content to display the previous queue page index. */
    previous(musicPlayer: MusicPlayer): DynamicMessage | undefined {
        return this.updateContent(musicPlayer, this.currentPage - 1);
    }
    /** Updates the message content to display the next queue page index. */
    next(musicPlayer: MusicPlayer): DynamicMessage | undefined {
        return this.updateContent(musicPlayer, this.currentPage + 1);
    }
    /** Updates the message content to display the last queue page index. */
    last(musicPlayer: MusicPlayer): DynamicMessage | undefined {
        return this.updateContent(musicPlayer, this.getLastPageIndex(musicPlayer));
    }
}
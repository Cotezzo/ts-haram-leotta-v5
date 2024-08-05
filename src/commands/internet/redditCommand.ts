import { EmbedBuilder, TextChannel } from "discord.js";
import { CommandMetadata, RedditSortBy } from "../../types/types";
import ClassLogger from "../../utils/logger";
import { isSortbyValid, retrieveLatestPost } from "../../services/redditService";
import HaramLeotta from "../..";

const logger: ClassLogger = new ClassLogger("reddit");

/** Define command metadata and handler methods for text and slash commands. */
const redditCommandMetadata: CommandMetadata<{ groupId: string, subreddit: string, sortby?: RedditSortBy, nsfw: boolean }, { content?: string, embeds?: EmbedBuilder[] }> = {
    // Command metadata for "help" command and general info about the command
    category: "Internet", description: "Retrieves a post from the specified subreddit, if exists.",
    aliases: ["reddit", "r/", "r"], usage: "`ham reddit memes` // Retrieves a post from the `meme` community, sorting by 'hot'\
    \n`ham reddit memes best` // Retrieves a post from the `meme` community, sorting by 'best'",
    
    // Actual core command with business logic implementation
    command: ({ groupId, subreddit, sortby, nsfw }, callback) => {

        // Search for the first available post and parse its metadata
        retrieveLatestPost(groupId, subreddit, sortby)
            .then(post => {
                // If no post is found, send an error message
                if(!post) return callback({ content: "Subreddit not found" });

                //! Crosspost check removed: already processed in post retrival.
                //! Output posts from the exported methods are never crossposts.

                // If the post is NSFW and the channel is not, block.
                // risp.channel instanceof TextChannel && !risp.channel?.nsfw
                if(post.nsfw && !nsfw) {
                    return callback({ embeds: [new EmbedBuilder()
                        .setColor(HaramLeotta.get().embedColor)
                        .setTitle("This channel is not NSFW.")
                        .setFooter({ text: "The post you are trying to view is NSFW. Try again in another channel. " })
                    ]});
                }

                // If the post contains gallery data, send title and all the images
                if (post.gallery_data) {
                    callback({ content: `**${post.title}**`});

                    (Object.values(post.media_metadata) as any[])
                        .map(e => e.s)
                        .filter(s => s.u || s.gif)
                        .map(s => s.u ?? s.gif)
                        .map(e => callback({ content: e }));

                    return;
                }  

                // Check for the specific post type and behave accordingly
                switch (post.post_hint) {

                    // If the post is an image, the "url" property contains the image uri.
                    case "image":
                        return callback({ embeds: [new EmbedBuilder()
                            .setColor(HaramLeotta.get().embedColor)
                            .setAuthor({ name: post.subreddit_name_prefixed })
                            .setTitle(`${post.title?.substring(0, 256)}`)
                            .setURL(`https://www.reddit.com${post.permalink}`)
                            .setImage(post.url)
                            .setFooter({text: `👍🏿 ${post.upvotes}     ✉️ ${post.comments}`})
                        ]});
                    
                    // If the post is a link, content is in one of the url properties
                    case "link":
                        return callback({ content: `**${post.title}**\n${post.url || post.url_overridden_by_dest || ""}`});

                    // If the post is a rich video, content is the video url
                    case "rich:video":
                        return callback({ content: `**${post.title}**\n${post.url_overridden_by_dest}`});

                    // For hosted videos, send the post link: Discord supports Reddit embeds
                    case "hosted:video":
                        return callback({ content: `https://www.reddit.com${post.permalink}`});

                    // For title/selftext only posts (case "self": case undefined:)
                    default:
                        // If the post contains a fallback video or an url, send it
                        let title = `**${post.title}**`;
                        const a: string = post.media?.reddit_video?.fallback_url || post.url_overridden_by_dest || "";
                        if(a /* || !post.selftext */) return callback({ content: title + "\n" + a });

                        // Otherwise, prepare embed for post content
                        const embed = new EmbedBuilder()
                            .setColor(HaramLeotta.get().embedColor)
                            .setAuthor({ name: post.subreddit_name_prefixed })
                            .setURL(`https://www.reddit.com${post.permalink}`)
                            .setFooter({text: `👍🏿 ${post.upvotes}     ✉️ ${post.comments}`});

                        // If title is longer than 255 characters, send it as field
                        if(title.length > 255) embed.addFields({ name: "­", value: title });
                        else embed.setTitle(title);

                        // If the post has no description, the embed is complete
                        if(!post.selftext) return callback({ embeds: [ embed ] });

                        // If content is > 5950, is too long for a single embed.
                        // Also, media (links) are not displayed in embeds.
                        // In this case, post is sent as multiple messages.
                        const tooLong: boolean = title.length + post.selftext.length > 5950 || !!post.media_metadata;

                        // For long texts, send N separate messages
                        if(tooLong) {
                            callback({ content: title + "\n" + post.selftext.substring(0, 1000) });
                            for (let i = 1; i < Math.floor(post.selftext.length / 1000) + 1; i++) {
                                callback({ content: post.selftext.substring(0 + (1000 * i), 1000 * (i + 1)) });
                            }
                        }
                        
                        // For shorter texts, add fields to the final embed
                        else {
                            for (let i = 0; i < Math.floor(post.selftext.length / 1000) + 1; i++) {
                                embed.addFields({name: "­", value: `**${post.selftext.substring(0 + (1000 * i), 1000 * (i + 1))}**`});
                            }
                            callback({ embeds: [embed] });
                        }
                }
            })
            .catch(e => logger.error(e));
    },

    // Transformer that parses the text input before invoking the core command,
    // and handles the message reply with the provided output.
    onMessageCreateTransformer: (msg, _content, args, command) => {
        // Retrieve subreddit name
        const subreddit: string | undefined = args.shift();
        let sortby: RedditSortBy | undefined = undefined;

        // If no subreddit is provided, return
        if(!subreddit?.length) return;

        // Retrieve sortby configuration, if any
        if(args.length && isSortbyValid(args[0])) {
            sortby = args.shift() as RedditSortBy;
        }

        // If there are arguments left, join the sentence and call che command
        command({ groupId: msg.channel.id, subreddit, sortby, nsfw: (msg.channel as TextChannel)?.nsfw },
            function callback(reply: { content?: string, embeds?: EmbedBuilder[] }): void {
                msg.channel.send(reply).catch(e => logger.error("Message reply error: " + e));
            }
        )
    }

    // TODO: slash command handler
}
export default redditCommandMetadata;
import { EmbedBuilder, TextChannel, PartialGroupDMChannel } from "discord.js";
import { CommandMetadata } from "../types.js";
import HaramLeotta from "../../index.js";
import { RedditPost, RedditSortBy } from "../../classes/reddit/types.js";
import Reddit from "../../classes/reddit/Reddit.js";
import { msgReactErrorHandler, msgReplyResponseTransformer } from "../../events/onMessageCreate.js";
import { ephemeralReplyErrorHandler, interactionReplyResponseTransformer } from "../../events/onInteractionCreate.js";

const redditCommandMetadata: CommandMetadata<{ groupId: string, subreddit: string, sortby?: RedditSortBy, nsfw?: boolean }, { content?: string, embeds?: EmbedBuilder[] }[]> = {
    category: "Internet", description: "Retrieves a post from the specified subreddit, if exists.",
    aliases: ["reddit", "r/", "r"], usage: "`ham reddit memes` // Retrieves a post from the `meme` community, sorting by 'hot'\
    \n`ham reddit memes best` // Retrieves a post from the `meme` community, sorting by 'best'",
    
    command: async ({ groupId, subreddit, sortby, nsfw }) => {

        // Search for the first available post and parse its metadata
        const post: RedditPost | undefined = await Reddit.retrieveLatestPost(groupId, subreddit, sortby);

        // If no post is found, send an error message
        if(!post) throw new Error("Subreddit not found");

        //! Crosspost check removed: already processed in post retrival.
        //! Output posts from the exported methods are never crossposts.

        // If the post is NSFW and the channel is not, block.
        // risp.channel instanceof TextChannel && !risp.channel?.nsfw
        if(post.nsfw && !nsfw) {
            return [{ embeds: [new EmbedBuilder()
                .setColor(HaramLeotta.get().embedColor)
                .setTitle("This channel is not NSFW.")
                .setFooter({ text: "The post you are trying to view is NSFW. Try again in another channel. " })
            ]}];
        }

        // If the post contains gallery data, send title and all the images
        if (post.gallery_data) {
            const output = [{ content: `**${post.title}**`}];

            (Object.values(post.media_metadata) as any[])
                .map(e => e.s)
                .filter(s => s.u || s.gif)
                .map(s => s.u ?? s.gif)
                .map(e => output.push({ content: e }));

            return output;
        }  

        // Check for the specific post type and behave accordingly
        switch (post.post_hint) {

            // If the post is an image, the "url" property contains the image uri.
            case "image":
                return [{ embeds: [new EmbedBuilder()
                    .setColor(HaramLeotta.get().embedColor)
                    .setAuthor({ name: post.subreddit_name_prefixed })
                    .setTitle(`${post.title?.substring(0, 256)}`)
                    .setURL(`https://www.reddit.com${post.permalink}`)
                    .setImage(post.url)
                    .setFooter({text: `👍🏿 ${post.upvotes}     ✉️ ${post.comments}`})
                ]}];
            
            // If the post is a link, content is in one of the url properties
            case "link":
                return [{ content: `**${post.title}**\n${post.url || post.url_overridden_by_dest || ""}`}];

            // If the post is a rich video, content is the video url
            case "rich:video":
                return [{ content: `**${post.title}**\n${post.url_overridden_by_dest}`}];

            // For hosted videos, send the post link: Discord supports Reddit embeds
            case "hosted:video":
                return [{ content: `https://www.reddit.com${post.permalink}`}];

            // For title/selftext only posts (case "self": case undefined:)
            default:
                // If the post contains a fallback video or an url, send it
                let title = `**${post.title}**`;
                const a: string = post.media?.reddit_video?.fallback_url || post.url_overridden_by_dest || "";
                if(a /* || !post.selftext */) return [{ content: title + "\n" + a }];

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
                if(!post.selftext) return [{ embeds: [ embed ] }];

                // If content is > 5950, is too long for a single embed.
                // Also, media (links) are not displayed in embeds.
                // In this case, post is sent as multiple messages.
                const tooLong: boolean = title.length + post.selftext.length > 5950 || !!post.media_metadata;

                // For long texts, send N separate messages
                if(tooLong) {
                    const output = [{ content: title + "\n" + post.selftext.substring(0, 1000) }];
                    for (let i = 1; i < Math.floor(post.selftext.length / 1000) + 1; i++) {
                        output.push({ content: post.selftext.substring(0 + (1000 * i), 1000 * (i + 1)) });
                    }
                    return output;
                }
                
                // For shorter texts, add fields to the final embed
                else {
                    for (let i = 0; i < Math.floor(post.selftext.length / 1000) + 1; i++) {
                        embed.addFields({name: "­", value: `**${post.selftext.substring(0 + (1000 * i), 1000 * (i + 1))}**`});
                    }
                    return [{ embeds: [embed] }];
                }
        }
    },

    onMessage: {
        requestTransformer: (msg, _content, args) => {
            // PartialGroupDMChannel (whatever that is) doesn't support sending
            // messages, so if the message has been sent there, ignore the command.
            const channel = msg.channel;
            if (!channel || channel instanceof PartialGroupDMChannel )
                throw new Error("Invalid msg.channel");
    
            // Retrieve subreddit name
            const subreddit: string | undefined = args.shift();
            let sortby: RedditSortBy | undefined = undefined;
    
            // If no subreddit is provided, return
            if(!subreddit?.length)
                throw new Error("No subreddit specified");
    
            // Retrieve sortby configuration, if any
            if(args.length && Reddit.isSortbyValid(args[0])) {
                sortby = args.shift() as RedditSortBy;
            }
    
            const groupId = channel.id;
            const nsfw = (channel as TextChannel).nsfw;
            return { groupId, subreddit, sortby, nsfw };
        },
        responseTransformer: async (msg, replies) => {
            for(const reply of replies) {
                // TODO: if multiple messages are delivered in the wrong order, uncomment the "await"
                /* await */msgReplyResponseTransformer(msg, reply);
            }
        },
        errorHandler: msgReactErrorHandler
    },

    onSlash: {
        requestTransformer: (interaction) => {
            const subreddit: string = interaction.options.getString("subreddit", true);
            const sortby: RedditSortBy | undefined = interaction.options.getString("sortby") as RedditSortBy || undefined;
    
            const channel = interaction.channel;
            const groupId = channel?.id;
            if(!groupId) throw new Error("No channelId found");

            const nsfw = (channel as TextChannel)?.nsfw;
            return { groupId, subreddit, sortby, nsfw };
        },
        responseTransformer: async (interaction, replies) => {
            for(const reply of replies) {
                // TODO: if multiple messages are delivered in the wrong order, uncomment the "await"
                /* await */interactionReplyResponseTransformer(interaction, reply);
            }
        },
        errorHandler: ephemeralReplyErrorHandler
    }
}
export default redditCommandMetadata;
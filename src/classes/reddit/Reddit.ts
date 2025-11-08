import axios from "axios"
import he from "he";
import { sleep } from "../../utils/sleep.js"
import { RedditPost, RedditSortBy, Subreddit } from "./types.js"
import Logger from "../logging/Logger.js"

export default class Reddit {

    /* ==== STATIC PROPERTIES =============================================== */
    /** Maximum number of reddit subreddits that can be saved in cache.
     *  This number affect the number of subreddits that can be navigated
     *  at the same time, without losing track of seen post and current page. */
    static readonly maxSubs: number = parseInt(process.env.REDDIT_MAX_SUBS || "10");

    /** Map used to memorize subreddits information relatively to server channels */
    static readonly cache: Map<string, Map<string, Subreddit>> = new Map();
    static readonly locks: Set<string> = new Set();

    /** Regex that can be used to check whether a given subreddit name is legal. */
    static readonly validNameRegex = new RegExp(/^\w+$/);

    /* ==== PUBLIC STATIC METHODS =========================================== */
    /** Checks whether the provided sortby value is supported or not. */
    public static isSortbyValid(sortby: string): sortby is RedditSortBy {
        return ["hot", "top", "new"].includes(sortby);
    }

    /** Retrieves the latest post for the channel in which the command has
     *  been sent, searching the provided subreddit name and sortBy config.
     *  If in the channel has already been requested the subreddit+sortBy,
     *  the latest cached post is retrieved. */
    public static async retrieveLatestPost(groupId: string, subredditName: string, sortby: RedditSortBy = "hot"): Promise<undefined | RedditPost> {
        subredditName = subredditName.toLowerCase();
        const subredditKey = subredditName + sortby;

        // If the subreddit name is invalid, do nothing
        if (!Reddit.validNameRegex.test(subredditName)) return;

        // This functionality has a lock on the entire cache group.
        // Since this method may delete entries when the cache is full, to avoid
        // pointing to a evicted entry, grant only one access at a time.
        // A lower level lock (subreddit) could be placed, permitting concurrent
        // searches on different subreddits on the same channel, but it may
        // cause issues when reaching the entry limit.
        //! An async method is NEEDED here (sleep), since a simple while(false);
        //! would lock the thread when running an async method, since it waits
        //! for the sync code to exit - but an infinite loop is running.
        //! Node is single-threaded.
        while(Reddit.locks.has(groupId)) await sleep(0);
        Reddit.locks.add(groupId);
        Logger.trace(groupId + " locked");

        try {
            // Retrieve cached channel - If there is no entry, create it.
            let subredditMap: Map<string, Subreddit> | undefined = Reddit.cache.get(groupId);
            if(!subredditMap) {
                subredditMap = new Map();
                Reddit.cache.set(groupId, subredditMap);
            }

            // Retrieve subreddit cached for this channel.getCrosspost
            // Subreddit name is saved as it's name plus the sortBy policy.
            let sub: Subreddit | undefined | void = subredditMap.get(subredditKey);

            // If there is no entry or the cached subreddits queue is empty,
            // fetch new posts for subreddit and sortBy config.
            if (!sub || !sub.posts.length) {
                Logger.debug("Cache missed, retrieving new posts");
                sub = await Reddit.getPosts(subredditName, sortby, sub?.after)
                    .catch( e => Logger.error("Error retrieving posts", e));
                // If the requested sub is invalid, do nothing
                if(!sub) return;
                subredditMap.set(subredditKey, sub);
            }

            // Retrieve and remove latest post from cache.
            // Do it BEFORE deleting old subreddits to avoid concurrency issues.
            const post: RedditPost | undefined = sub.posts.shift();

            // If the maximum subreddits are configured, check if cache is full
            if(Reddit.maxSubs) {
                // If there are more subs than the limit, delete oldest search
                const entries = Object.entries(subredditMap);
                if(entries.length >  Reddit.maxSubs) {
                    // Initialize with current sub - loop through subs and delete oldest
                    let mins: [number, string] = [Date.now(), subredditName];
                    for (const [key, {lastSearch}] of entries)
                        if(mins[0] > lastSearch) mins = [lastSearch, key];
                    subredditMap.delete(mins[1]);
                }
            }

            return post;
        } finally {
            // Whatever happens, remove lock at all costs
            Reddit.locks.delete(groupId);
            Logger.trace(groupId + " unlocked");
        }
    }

    /* ==== PRIVATE STATIC METHODS ========================================== */
    /** Retrieves specific post data by id and returns its RedditPost object. */
    private static async getPost(id: string): Promise<RedditPost> {
        const headers = { "user-agent": "*" };
        // Given the id fetch the post
        const r = await axios.get(`https://www.reddit.com/by_id/${id}.json`, { headers });
        return Reddit.parsePostData(r.data.data.children[0].data);
    }

    /** Retrieves posts from a subreddit with the given sortBy configuration and
     *  an optional "after" token, used to keep track of the already seen posts.
     *  Returns posts, "after" to be used for next query and current timestamp. */
    private static getPosts(subreddit: string, sortBy: RedditSortBy, after: string | undefined): Promise<Subreddit | undefined> {

        // Setup URI with subreddit name, sortBy; prepare query params and headers
        const params: any = {};
        const headers = { "user-agent": "*" };
        const url: string = `https://www.reddit.com/r/${subreddit}/${sortBy}/.json`;

        // If "after" property has a value, use it to navigate to the correct page
        if(after) params.after = after;

        // Call Reddit API to retrieve posts data
        return axios.get(url, { headers, params })
            .then(r => r.data )
            .then(async body => {

                // Parse post data to only retrieve valid posts
                const posts: RedditPost[] = (body?.data?.children as any[])
                    // Extract data from children array
                    ?.map(child => child.data)
                    // Filter out pinned posts and ghost subreddits
                    .filter(data => data.subreddit && !data.stickied)
                    // Retrieve useful informations from data
                    .map(data => Reddit.parsePostData(data));

                // If there are no posts, the subreddit may not exist - do nothing
                if (!posts || !posts.length) return;

                // If posts refer to other posts (crossposts), fetch the right data
                for (let i = 0; i < posts.length; i++) {
                    const { crosspost_parent } = posts[i];
                    if(crosspost_parent) posts[i] = await Reddit.getPost(crosspost_parent);
                }

                // Update timestamp (used to remove entries
                // if cache is full) and return subreddit data
                return { posts, after: body.data.after, lastSearch: Date.now() };
            });
    }

    /** Parses the raw Reddit post data and returns an edible RedditPost object. */
    private static parsePostData(data: any): RedditPost {
        let post: RedditPost = {
            // Post upvotes, comments and nsfw flag
            upvotes:                    data.ups,
            comments:                   data.num_comments,
            nsfw:                       data.over_18,

            // Post title, urls, descriptions and type
            title:                      data.title,
            subreddit_name_prefixed:    data.subreddit_name_prefixed,
            permalink:                  data.permalink,
            url_overridden_by_dest:     data.url_overridden_by_dest,
            url:                        data.url,
            selftext:                   data.selftext,
            post_hint:                  data.post_hint,

            // Post media, gallery and crossposting data
            media:                      data.media?.reddit_video ? { reddit_video: { fallback_url: data.media.reddit_video.fallback_url } } : undefined,
            // Defined if post contains media (maybe??)
            media_metadata:             data.media_metadata,
            // Defined if post is a gallery
            gallery_data:               data.gallery_data,
            // Defined if post is a crosspost - contains the real post id
            crosspost_parent:           data.crosspost_parent,
            //html: data.media?.oembed?.html:null});
        };

        // Remove all the html encodings
        post = JSON.parse(he.decode(JSON.stringify(post)));
        post.selftext = he.decode(post.selftext);
        return post;
    }
}
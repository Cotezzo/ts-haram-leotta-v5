export interface RedditPost {
    upvotes: number;
    comments: number;
    nsfw: boolean;

    title: string;
    subreddit_name_prefixed: string;
    permalink: string;
    url_overridden_by_dest: string;
    url: string;
    selftext: string;

    post_hint: string | undefined;
    media: any;
    media_metadata: any;
    gallery_data: any;
    crosspost_parent: any;
};

export interface Subreddit {
    posts: RedditPost[];
    after: string | undefined;
    lastSearch: number;
};

export type RedditSortBy = "hot" | "new" | "top";
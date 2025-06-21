import Logger from "../logging/Logger";
import IUserModel from "../../data/interfaces/IUserModel";
import UserModel from "../../data/model/UserModel";
import { Message, User } from "discord.js";
import ASong from "../music/song/ASong";
import YoutubeSong from "../music/song/youtube/YoutubeSong";
import SpotifySong from "../music/song/spotify/SpotifySong";
import RawUriSong from "../music/song/RawUriSong";

export default class UserRepository {

    /* ==== PUBLIC STATIC METHODS =========================================== */
    /** Given Discord user id, retrieve its prefix from database (if exists).
     *  If no user o saved prefix is found, return undefined. */
    public static async getUserPrefix(userId: string): Promise<string | undefined> {
        try {
            const user = await UserRepository.getUser(userId);
            return user?.prefix;
        } catch (e) {
            Logger.error("Error during query", e as Error);
        }
    }

    /** Given Discord user id and new prefix, update user's prefix in database */
    public static async updateUserPrefix(userId: string, prefix: string): Promise<void> {
        try {
            // Retrieve user from database - if it doesn't exist, create it
            let user: IUserModel = await UserRepository.getUser(userId) ?? new UserModel({ _id: userId });
            // Update user prefix to new one
            user.prefix = prefix;
            // Save model to database
            await user.save();
            Logger.debug("Prefix updated");
        } catch(e) {
            Logger.error("Error during query", e as Error);
        }
    }

    /** Retrieves a user instance for a user mentioned in the message or a user
     *  which name matches with the first command argument.
     *! NOT A MONGODB METHOD, BUT A USER-RELATED METHOD NONETHELESS. */
    public static getUserFromMessage = async (msg: Message, username?: string): Promise<User | undefined> => {
        // If there is no mentioned user, directly return the message author
        if (!username) return msg.author;

        // If there is a mention in the message, use it to retrieve the user
        if(msg.mentions?.users?.size)
            return msg.mentions.users.last();

        // If there is no mention, manually search for the user in the server with
        // a query - if the user exists, return it
        return msg.guild?.members.fetch({ query: username, limit: 1 })
            .then(member => member.first()?.user);
    }

    public static async getUserFavourites(userId: string): Promise<ASong[] | undefined> {
        try {
            const user = await UserRepository.getUser(userId);
            const favourites = user?.favourites || [];

            return favourites.map(f => {
                if(f.type === ASong.SongType.YOUTUBE)
                    return new YoutubeSong(f.title, f.id, f.lengthSeconds!, f.lengthString!, f.thumbnail);

                if(f.type === ASong.SongType.SPOTIFY)
                    return new SpotifySong(f.id, f.title, f.lengthSeconds!, f.thumbnail);


                if(f.type === ASong.SongType.RAW_URI)
                    return new RawUriSong(f.id);
            }).filter(i => i !== undefined);
            
        } catch (e) {
            Logger.error("Error during query", e as Error);
        }
    }

    public static async getUserFavourite(userId: string, index: number): Promise<ASong | undefined> {
        const favourites: ASong[] | undefined = await UserRepository.getUserFavourites(userId);

        if(!favourites || index < 0 || index >= favourites.length) return;
        return favourites[index];
    }

    public static async addUserFavourite(userId: string, song: YoutubeSong | SpotifySong | RawUriSong): Promise<void> {
        // Deconstruct and only retrieve useful data
        const { id, title, lengthString, lengthSeconds, thumbnail, type } = song;
        Logger.info(`Adding song to facourites: ${JSON.stringify({ id, title, lengthString, lengthSeconds, thumbnail, type })}`)

        try {
            // Retrieve user from database - if it doesn't exist, create it
            let user: IUserModel = await UserRepository.getUser(userId) ?? new UserModel({ _id: userId });
            // Initialize favourites arrya if not present
            if(!user.favourites) user.favourites = [];
            // Push song essential data to favourites array
            user.favourites.push({ id, title, lengthString, lengthSeconds, thumbnail, type } as ASong);
            Logger.info(`Updated favourites: ${JSON.stringify(user.favourites)}`)
            // Save updated data to Mongo
            await user.save();
            Logger.info("Favourites updated");
        } catch(e) {
            Logger.error("Error during query", e as Error);
        }
    }

    public static async deleteUserFavourite(userId: string, index: number): Promise<void> {
        try {
            // Retrieve user from database - if it doesn't exist, create it
            let user: IUserModel | null = await UserRepository.getUser(userId);
            // If the element isn't actually there, do nothing
            if(!user?.favourites?.[index]) return;
            // Remove song metadata from favourites array
            user.favourites.splice(index, 1);
            // Save updated data to Mongo
            await user.save();
            Logger.info("Favourites updated");
        } catch(e) {
            Logger.error("Error during query", e as Error);
        }
    }

    /* ==== PRIVATE STATIC METHODS ========================================== */
    /** Retrieve user from database, if any. */
    private static getUser(userId: string): Promise<IUserModel | null> {
        return UserModel.findById(userId);
    }
}
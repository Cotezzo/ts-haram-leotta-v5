import { Document } from "mongoose";
import ASong from "../../classes/music/song/ASong.js";

/** This interface is used exclusively for the UserModel MongoDB model.
 *  Extend document to let TypeScript see IUserModel as a child of UserModel. */
export default interface IUserModel extends Document {
    /** MongoDB primary key - populated with Discord user id */
	_id: string;
    /** Custom text command prefix (saved with `ham prefix` command).
     *  If null, default is used. */
    prefix?: string;
    /** User favourite songs (saved with `ham favourite add` command).
     *  For properties definition, see `ASong`. */
    favourites: ASong[];
}
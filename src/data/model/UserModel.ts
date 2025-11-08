import mongoose from "mongoose";
import IUserModel from "../interfaces/IUserModel";
import ASong from "../../classes/music/song/ASong";

/** Model to be used to read, save and update User metadata to Mongo database.
 *  All the properties reflect the ones described in `IUserModel` and `ASong`.
 *  Check those interfaces for more informations about the properties. */
const UserModel = mongoose.model<IUserModel>("User", new mongoose.Schema<IUserModel>({
    _id: { type: String, required: true },
    prefix: String,
    favourites: [ new mongoose.Schema<ASong>({
        title: { type: String, required: true },
        id: { type: String, required: true },
        type: { type: Number, required: true },
        
        thumbnail: String,
        lengthSeconds: Number,
        lengthString: String
    }) ]
}));

export default UserModel;
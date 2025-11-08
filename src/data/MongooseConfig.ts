import mongoose, { ConnectOptions } from "mongoose";    // MongoDB Database connector
import Logger from "../classes/logging/Logger.js";

export default class MongooseConfig {
    /** Mongoose connection uri - from env */
    private static readonly host: string = process.env.MONGO_HOST!;
    private static readonly port: string = process.env.MONGO_PORT!;
    private static readonly database: string = process.env.MONGO_DB!;

    /** Mongoose connection options */
    private static readonly options: ConnectOptions = {
        // Limit connections
        maxPoolSize: 20
    };
    
    public static initialize() {
        // Mongoose options
        mongoose.set("strictQuery", true);

        // Connect to MongoDB using Mongoose
        const uri = `mongodb://${MongooseConfig.host}:${MongooseConfig.port}/${MongooseConfig.database}`;
        return mongoose.connect(uri, MongooseConfig.options)
            .then(() => Logger.info(`Successfully connected to '${uri}'`))
            .catch((e) => Logger.error(`Error connecting to '${uri}': ${e}`));
    }
}
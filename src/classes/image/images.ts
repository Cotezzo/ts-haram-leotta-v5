import Jimp from "jimp";
import { OverlapOptions } from "./types.js";

export default class Images {

    /** Overlaps different images, given a base image path and a set of options for
     *  each other image to be palced on top of it. */
    public static async overlap(baseImagePath: string, optionsArray: OverlapOptions[]) : Promise<Buffer> {
        // Parse base image path
        const baseImage = await Jimp.read(baseImagePath);

        // For each image to be put on the base, apply the options
        for(let { path, xPos, yPos, xRes, yRes, round } of optionsArray) {
            // Parse input image
            const image = await Jimp.read(path);

            // Resize image to desired resolution (if specified)
            xRes = xRes || image.getWidth();
            yRes = yRes || image.getHeight();
            image.resize(xRes, yRes);

            // Circle the image (if specified)
            if(round) image.circle({ radius: xRes / 2, x: xRes / 2, y: yRes / 2 });

            // Apply image as an overlay to the base image
            baseImage.composite(image, xPos || 0, yPos || 0);
        }

        // Create buffer from finished image
        return await baseImage.getBufferAsync(baseImage.getMIME());

        // Return the Discord resolved image
        // return new AttachmentBuilder(buffer, {name: "overlap.png"});
        // return await DataResolver.resolveFile(buffer);
    }

}
import Jimp from "jimp";

export interface OverlapOptions {
    /** Link of the image to be put over the base image */
    path: string;

    /** New image x position */
    xPos: number | undefined;
    /** New image y position */
    yPos: number | undefined;

    /** New image resolution */
    xRes: number | undefined;
    /** New image resolution */
    yRes: number | undefined;

    /** Round the image */
    round: boolean | undefined;
}

/** Overlaps different images, given a base image path and a set of options for
 *  each other image to be palced on top of it. */
export const overlap = async (baseImagePath: string, optionsArray: OverlapOptions[]) : Promise<Buffer> => {
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

/*
const mask: string = "./assets/images/mask4.png";
async function roundCorners() {
    const maskImage = await Jimp.read(mask);
    for(const file of files2) {
        console.log(file);
        const baseImage = await Jimp.read(file);

        baseImage.mask(maskImage, 0, 0);

        // Convert the masked image to a buffer
        //return baseImage.getBufferAsync(Jimp.MIME_PNG);
        baseImage.write("fedeout/2/"+file.split("/").pop()!);
    }
}
*/
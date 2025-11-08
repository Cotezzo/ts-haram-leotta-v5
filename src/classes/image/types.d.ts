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
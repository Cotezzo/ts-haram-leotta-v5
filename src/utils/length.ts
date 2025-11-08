export const secondsToString = (ss: number): string => {
    let mm = Math.floor(ss / 60);
    ss = ss % 60;
    let hh = Math.floor(mm / 60);
    mm = mm % 60;
    return `${hh ? `${hh}:` : ''}${mm ? (mm > 9 ? `${mm}:` : (hh ? `0${mm}:` : `${mm}:`)) : hh ? `00:` : `0:`}${(ss < 10) ? `0${ss}` : ss}`;
}

export const stringToSeconds = (str: string): number => {
    let arr = str.split(':');
    if (arr[2]) return +arr[0] * 60 * 60 + +arr[1] * 60 + +arr[2];
    if (arr[1]) return +arr[0] * 60 + +arr[1];
    return +arr[0];
}
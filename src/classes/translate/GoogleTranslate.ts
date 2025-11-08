import axios from "axios";
import Logger from "../logging/Logger.js";

export default class GoogleTranslate {

    /* ==== STATIC PROPERTIES =============================================== */
    /** List of languages supported by Google Translate's APIs. */
    public static readonly supportedLanguages = new Set([
        "af", "sq", "am", "ar", "hy", "az", "eu", "be", "bn", "bs", "bg", "ca",
        "ceb", "zh-CN", "zh-TW", "co", "hr", "cs", "da", "nl", "en", "eo", "et",
        "fi", "fr", "fy", "gl", "ka", "de", "el", "gu", "ht", "ha", "haw", "iw",
        "hi", "hmn", "hu", "is", "ig", "id", "ga", "it", "ja", "jv", "kn", "kk",
        "km", "rw", "ko", "ku", "ky", "lo", "la", "lv", "lt", "lb", "mk", "mg",
        "ms", "ml", "mt", "mi", "mr", "mn", "my", "ne", "no", "ny", "or", "ps",
        "fa", "pl", "pt", "pa", "ro", "ru", "sm", "gd", "sr", "st", "sn", "sd",
        "si", "sk", "sl", "so", "es", "su", "sw", "sv", "tl", "tg", "ta", "tt",
        "te", "th", "tr", "tk", "uk", "ur", "ug", "uz", "vi", "cy", "xh", "yi",
        "yo", "zu"
    ]);
    /** Regex that tells if an emoji is a valid flag. */
    public static readonly flagEmojiRegex: RegExp = /[\uD83C][\uDDE6-\uDDFF]{2}/u;
    /** Map between "normalized" flags and corresponding Translate language.
     *  Some flags are not supported and are associated to undefined. */
    public static readonly countryCodeToLanguage: { [k: string]: string | undefined } = {
        "af": "ps", "ax": "sv", "al": "sq", "dz": "ar", "as": "sm", "ad": "es",
        "ao": "pt", "ag": "en", "ar": "es", "am": "hy", "aw": "nl", "au": "en",
        "at": "de", "az": "az", "bh": "ar", "bd": "en", "by": "be", "be": "nl",
        "bz": "en", "bj": "fr", "bm": "en", "bo": "es", "ba": "bs", "br": "pt",
        "bs": "en", "io": "en", "bg": "bg", "bf": "fr", "bi": "fr", "kh": "km",
        "cm": "en", "ca": "en", "ic": "es", "cv": "pt", "bq": "nl", "cf": "fr",
        "td": "fr", "cl": "es", "cn": "zh-CN", "cx": "en", "cc": "en",
        "co": "es", "km": "fr", "cg": "fr", "cd": "fr", "cr": "sp", "ci": "fr",
        "hr": "hr", "cu": "es", "cw": "nl", "cy": "el", "cz": "cs", "dk": "da",
        "dj": "ar", "dm": "en", "do": "es", "ec": "es", "eg": "ar", "sv": "es",
        "gq": "es", "er": "am", "ee": "et", "et": "am", "fo": "da", "fj": "hi",
        "fi": "fi", "fr": "fr", "gf": "fr", "pf": "fr", "ga": "fr", "gm": "en",
        "ge": "ka", "de": "de", "gh": "en", "gi": "en", "gr": "el", "gl": "da",
        "gd": "en", "gp": "fr", "gu": "en", "gt": "es", "gg": "en", "gn": "fr",
        "gw": "pt", "gy": "en", "ht": "ht", "hn": "es", "hk": "zh-CN",
        "hu": "hu", "is": "is", "in": "hi", "id": "id", "ir": "fa", "iq": "ar",
        "ie": "en", "im": "en", "il": "iw", "it": "it", "jm": "en", "jp": "ja",
        "je": "en", "jo": "ar", "kz": "kk", "ke": "sw", "ki": "en", "xk": "sq",
        "kw": "ar", "kg": "ky", "la": "lo", "lv": "lv", "lb": "ar", "ls": "st",
        "lr": "en", "ly": "ar", "li": "de", "lt": "lt", "lu": "lb",
        "mo": "zh-CN", "mk": "mk", "mg": "mg", "mw": "en", "my": "ms",
        "mv": "ar", "ml": "fr", "mt": "mt", "mh": "en", "mq": "fr", "mr": "ar",
        "mu": "fr", "yt": "fr", "mx": "es", "fm": "en", "md": "ro", "mc": "fr",
        "mn": "mn", "me": "sr", "ms": "en", "ma": "ar", "mz": "pt", "mm": "my",
        "na": "af", "nr": "en", "np": "ne", "nl": "nl", "nc": "fr", "nz": "mi",
        "ni": "es", "ne": "fr", "ng": "ha", "nu": "en", "nf": "en", "kp": "ko",
        "mp": "en", "no": "no", "om": "ar", "pk": "ur", "pw": "en", "ps": "ar",
        "pa": "es", "pg": "en", "py": "es", "pe": "es", "ph": "tl", "pl": "pl",
        "pt": "pt", "pr": "es", "qa": "ar", "re": "fr", "ro": "ro", "ru": "ru",
        "rw": "rw", "ws": "sm", "sm": "it", "st": "pt", "sa": "ar", "sn": "fr",
        "rs": "sr", "sc": "en", "sl": "en", "sg": "ms", "sx": "nl", "sk": "sk",
        "si": "sl", "sb": "en", "so": "so", "za": "af", "kr": "ko", "ss": "sw",
        "es": "es", "lk": "si", "bl": "fr", "kn": "en", "lc": "en", "pm": "fr",
        "vc": "en", "sd": "ar", "sr": "nl", "sz": "zu", "se": "sv", "ch": "de",
        "sy": "ar", "tw": "zh-CN", "tj": "tk", "tz": "sw", "th": "th",
        "tl": "pt", "tg": "fr", "tk": "en", "to": "en", "tt": "en", "tn": "ar",
        "tr": "tr", "tm": "tk", "vi": "en", "tv": "en", "ug": "sw", "ua": "uk",
        "ae": "ar", "gb": "en", "us": "en", "uy": "es", "uz": "uz", "vu": "fr",
        "va": "la", "ve": "es", "vn": "vi", "wf": "fr", "eh": "ar", "ye": "ar",
        "zm": "ny", "zw": "sn", "bv": "no", "cp": "fr", "ea": "es", "dg": "en",
        "hm": "en", "mf": "fr", "sj": "no", "um": "en",
        "vg": undefined, "ky": undefined, "bw": undefined, "bt": undefined,
        "aq": undefined, "ai": undefined, "ck": undefined, "eu": undefined,
        "fk": undefined, "tf": undefined, "pn": undefined, "gs": undefined,
        "sh": undefined, "tc": undefined, "ac": undefined, "ta": undefined,
        "un": undefined
    };

    /* ==== STATIC METHODS ================================================== */
    /** Distance between special flag characters and normal lowerCase letters (UNICODE) */
    private static readonly OFFSET = 127397 - 32;
    /** Function copied from the internet that converst flag emojis to normal letters.
     *  Loops for each flag element (char?), returns array of c.codePointAt() - OFFSET, returns string from normalized characters in the array.
     *  @param {string} flag Unicode flag emoji
     *  @returns {string} Corresponding letters */
    public static emojiToCountryCode = (flag: string): string => String.fromCodePoint(...([...flag].map(c => c.codePointAt(0)! - GoogleTranslate.OFFSET)));

    /** Checks whether the provided language is supported by Wikipedia or not. */
    public static isLanguageValid(language: string | undefined): boolean {
        return !!language && GoogleTranslate.supportedLanguages.has( language );
    }

    /** Translates a given text from a language to another.
     *  If no source language is specified, automatic recognition is used. */
    public static async translate(query: string, targetLanguage: string, sourceLanguage: string = "auto"): Promise<string> {
        Logger.debug(`Translating "${query}" from ${sourceLanguage} to ${targetLanguage}`);

        // Assert the languages have a value and are supported
        if(!GoogleTranslate.isLanguageValid(targetLanguage)) throw new Error(`Invalid target language "${targetLanguage}"`);
        if(sourceLanguage !== "auto" && !GoogleTranslate.isLanguageValid(sourceLanguage)) throw new Error(`Invalid source language "${sourceLanguage}"`);

        // Call Google translate endpoint with query language and target language
        const result = await axios.post(
            `https://translate.google.it/_/TranslateWebserverUi/data/batchexecute?rpcids=MkEWBc&client=gtx&f.sid=-7075841764636485169&bl=boq_translate-webserver_20210215.17_p0&hl=it&soc-app=1&soc-platform=1&soc-device=1&_reqid=1944506&rt=c`,
            `f.req=%5B%5B%5B%22MkEWBc%22%2C%22%5B%5B%5C%22${encodeURI(query)}%5C%22%2C%5C%22${sourceLanguage}%5C%22%2C%5C%22${targetLanguage}%5C%22%2Ctrue%5D%2C%5Bnull%5D%5D%22%2Cnull%2C%22generic%22%5D%5D%5D&at=AD08yZm8SCo9gO2LTBwTCjgyWhJQ%3A1613560907885&`,
            { headers: { "content-type": "application/x-www-form-urlencoded;charset=UTF-8" }}
        )

        // Initialize output string to empty string
        let output: string = "";

        // Finds the text to output in the... whatever this is supposed to be
        (JSON.parse(JSON.parse(((result.data as string).substring(7).replace(/[0-9]{2,4}\n\[\[/g,`\n[[`)).split('\n\n')[0])[0][2])[1][0][0][5]).forEach((res: any) => output += res[0]+' ');
        Logger.debug(`Translation "${output}"`);
        return output;
    }
}
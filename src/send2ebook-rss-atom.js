const Parser = require('rss-parser');
const Send2Ebook = require('./send2ebook')

class Send2EbookRssAtom {


    constructor(options) {
        this.options = options;
    }

    async process([...rssOrAtomUrlAndLimit]) {

        const dateAndTime = this.dateAndTime();
        let urlsToBeProcessed = [];

        if (this.options.singleFileOutput) {
            await Promise.all(rssOrAtomUrlAndLimit.map(async ({ url, limit = 8 }) => {
                const parser = new Parser();
                const feed = await parser.parseURL(url);
                const toBeProccessed = feed.items.slice(0, limit).map(a => a.link);
                urlsToBeProcessed = urlsToBeProcessed.concat(toBeProccessed);
            }));
            const send2ebook = new Send2Ebook(this.options);
            send2ebook.process(urlsToBeProcessed, dateAndTime);
            

        } else {
            this.multiFilesOutput(rssOrAtomUrlAndLimit, dateAndTime);
        }
    }


    multiFilesOutput(rssOrAtomUrlAndLimit, dateAndTime) {
        rssOrAtomUrlAndLimit.map(async ({ url, limit = 8 }) => {
            const parser = new Parser();
            const feed = await parser.parseURL(url);
            const urlsToBeProcessed = feed.items.slice(0, limit).map(a => a.link);
            const send2ebook = new Send2Ebook(this.options);
            send2ebook.process(urlsToBeProcessed, `${feed.title}_${dateAndTime}`);
        });
    }

    dateAndTime() {
        return new Date().toISOString().substr(0, 19).replace("T", "_").replace(/[:]/gi, ".");
    }
}
module.exports = Send2EbookRssAtom;


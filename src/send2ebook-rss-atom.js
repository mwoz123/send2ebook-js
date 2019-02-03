const Parser = require('rss-parser');
const Send2Ebook = require('./send2ebook')

class Send2EbookRssAtom {


    constructor({ host, user, pass, port = 21, folder = "/" }, { singleFileOutput = false }) {
        let connectionSettings = {
            host, user, pass, port, folder
        }
        this.options = { connectionSettings, singleFileOutput }
    }

    async process([...rssOrAtomUrlAndLimit]) {

        const dateAndTime = this.dateAndTime();
        const connectionSettings = this.options.connectionSettings;
        let urlsToBeProcessed = [];

        if (this.options.singleFileOutput) {
            await Promise.all(rssOrAtomUrlAndLimit.map(async ({ url, limit = 8 }) => {
                const parser = new Parser();
                const feed = await parser.parseURL(url);
                const toBeProccessed = feed.items.slice(0, limit).map(a => a.link);
                urlsToBeProcessed = urlsToBeProcessed.concat(toBeProccessed);
            }));
            const send2ebook = new Send2Ebook(connectionSettings);
            send2ebook.process(urlsToBeProcessed, dateAndTime);
            

        } else {
            this.multiFileOutput(rssOrAtomUrlAndLimit, connectionSettings, dateAndTime);
        }
    }


    multiFileOutput(rssOrAtomUrlAndLimit, connectionSettings, dateAndTime) {
        rssOrAtomUrlAndLimit.map(async ({ url, limit = 8 }) => {
            const parser = new Parser();
            const feed = await parser.parseURL(url);
            const urlsToBeProcessed = feed.items.slice(0, limit).map(a => a.link);
            const send2ebook = new Send2Ebook(connectionSettings);
            send2ebook.process(urlsToBeProcessed, `${feed.title}_${dateAndTime}`);
        });
    }

    dateAndTime() {
        return new Date().toISOString().substr(0, 19).replace("T", "_").replace(/[:]/gi, ".");
    }
}
module.exports = Send2EbookRssAtom;


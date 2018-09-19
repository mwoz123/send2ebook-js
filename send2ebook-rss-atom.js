'use strict';
const Parser = require('rss-parser');
const Send2Ebook = require('./send2ebook.js')

class Send2EbookRssAtom {

    constructor({ host, user, pass, port = 21, folder = "/" }) {
        this.connectionSettings = {
            host, user, pass, port, folder
        }
    }

    async process([...rssOrAtomUrlAndLimit]) {

        const dateAndTime = this.dateAndTime();
        const connectionSettings = this.connectionSettings;

        rssOrAtomUrlAndLimit.map(async ({ url, limit }) => {

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


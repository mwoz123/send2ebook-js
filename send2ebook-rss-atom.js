const Parser = require('rss-parser');
const Send2Ebook = require('./send2ebook.js')


class Send2EbookRssAtom {

    constructor({ host, user, pass, port = 21, folder = "/" }) {
        this.connectionSettings = {
            host, user, pass, port, folder
        }
    }

    async process([...data]) {

        data.map(async (rssAtomUrl, limit) => {

            const urls = [];
            const parser = new Parser();
            let feed = await parser.parseURL(rssAtomUrl);
            console.log(feed.title);

            for (let i = 0; i < limit; i++) {
                let item = feed.items[i];
                console.log(item.title + ':' + item.link)
                urls.push(item.link);
            }

            const send2ebook = new Send2Ebook(this.connectionSettings);
            send2ebook.process(urls, feed.title);

        });

    }

}
module.exports = Send2EbookRssAtom;

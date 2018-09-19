const Parser = require('rss-parser');
const Send2Ebook = require('./send2ebook.js')

let connectionSettings; //FIXME move to instance

class Send2EbookRssAtom {

    constructor({ host, user, pass, port = 21, folder = "/" }) {
        connectionSettings = {
            host, user, pass, port, folder
        }
    }

    async process([...data]) {
        let dateAndTime = this.dateAndTime() ;
        data.map(async function ({url, limit})  {

            const urls = [];
            const parser = new Parser();
            let feed = await parser.parseURL(url);
            
            console.log(feed.title);

            for (let i = 0; i < limit; i++) {
                let item = feed.items[i];
                console.log(item.title + ':' + item.link)
                urls.push(item.link);
            }

            const send2ebook = new Send2Ebook(connectionSettings);
            send2ebook.process(urls, feed.title ); //TODO feed.title + dateAndTime()

        });

    }


    dateAndTime(){
        return new Date().toISOString().substr(0, 19).replace("T", "_").replace(/[:]/gi, ".");
    }
}
module.exports = Send2EbookRssAtom;
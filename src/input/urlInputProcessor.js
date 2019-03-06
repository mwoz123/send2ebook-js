const { JSDOM } = require("jsdom");
const axios = require('axios');
const sanitizeHtml = require('sanitize-html');
const absolutify = require('absolutify')
const URL = require('url');
const { tidy } = require('htmltidy2');

module.exports = class UrlInputProcessor {


    async gatherEbookData(urls, data, errors) {

        return await Promise.all(urls.map(async (url) => {
            console.log(`Processing: ${url}`);
            try {
                const response = await axios.get(url);
                const dom = new JSDOM(response.data);
                const docTitle = dom.window.document.title;

                this.addAdditionalContent(dom.window.document, data, url);

                this.ifNoOutputnameAndSingleUrlThenUseHtmlTitleAsFilename(urls, data, docTitle);

                const cleanedHtml = await this.sanitarizeData(url, response);
                data.content.push({
                    title: docTitle,
                    data: cleanedHtml,
                    author: url
                });
            }
            catch (err) {
                errors.set(url, err);
            }
        }));
    }

    addAdditionalContent(document, data, url) {
        const elements = new Map();
        const imgs = document.querySelectorAll("img");
        const allreadyProcessing = [];

        imgs.forEach(img => {
            if (img.src && !allreadyProcessing.includes(img.src)) {
                console.log("Processing img:" + img.src)
                allreadyProcessing.push(img.src);

                axios({
                    method: 'get',
                    url: img.src,
                    responseType: 'stream'
                }).then((imgResp) => {
                        if (imgResp.status === 200) {

                            // const name = this.extractFilename(img.src);
                            // const consumer = fs.createWriteStream("./data/" + name);
                            // imgResp.data.pipe(consumer);

                            elements.set(img.src, imgResp.data)
                        }
                    });
            } else {
                console.log("Allready processing: " + img.src);
            }
        });
        data[url] = [];
        data[url].push(elements);
    }


    extractFilename(path) {
        return path.replace(/^.*[\\\/]/, '');
    }


    ifNoOutputnameAndSingleUrlThenUseHtmlTitleAsFilename(urls, data, docTitle) {
        if (urls.length == 1 && !data.outputname) {
            data.title = docTitle;
        }
    }



    async sanitarizeData(url, response) {
        const location = URL.parse(url);
        const site = `${location.protocol}//${location.host}`;
        let parsed = absolutify(response.data, site);

        parsed = parsed.replace(/src=\'\/\//gm, `src='http://`);

        parsed = parsed.replace(/src=\"\/\//gm, `src='http://`);

        const cleanedHtml = await sanitizeHtml(parsed, {
            allowedTags: sanitizeHtml.defaults.allowedTags.concat(['img', 'html', 'body', 'head', 'title', 'article', 'style']),
            preserveDoctypes: true,
            allowProtocolRelative: false,
            exclusiveFilter: function (frame) {
                return frame.tag === 'img' && !frame.attribs.src; //fix exception when empty <img /> 
            }
        });


        const validHtml = await new Promise((resolve, reject) => {
            tidy(cleanedHtml, async (err, html) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(html);
                }
            });
        });
        return validHtml;
    }


}

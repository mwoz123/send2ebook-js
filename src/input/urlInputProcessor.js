const { JSDOM } = require("jsdom");
const axios = require('axios');
const sanitizeHtml = require('sanitize-html');
const absolutify = require('absolutify')
const URL = require('url');
const { tidy } = require('htmltidy2');

module.exports = class UrlInputProcessor {


    async gatherEbookData(urls, ebookData, errors) {

        return await Promise.all(urls.map(async (url, index, array) => {
            console.log(`Processing: ${url}`);
            try {
                const response = await axios.get(url); //TODO add {auth}
                const dom = new JSDOM(response.data);
                const docTitle = dom.window.document.title;

                this.ifNoOutputnameAndSingleUrlThenUseHtmlTitleAsFilename(urls, ebookData, docTitle);

                const cleanedHtml = await this.sanitarizeData(url, response);

                this.addAdditionalContent(cleanedHtml, ebookData, url);

                ebookData.content.push({
                    title: docTitle,
                    data: cleanedHtml,
                    source: url,
                });
            }
            catch (err) {
                errors.set(url, err);
            }
        }));
    }

    async addAdditionalContent(html, ebookData, url) {

        const dom = new JSDOM(html);

        const elements = new Map();
        const imgs = dom.window.document.querySelectorAll("img");
        const allreadyProcessing = new Map();

        // imgs.forEach((img, index, array) => { //TODO find way to async update DOM 
        for (let index = 0; index < imgs.length; index++) {
            let img = imgs[index];
            if (img.src && !allreadyProcessing.has(img.src)) {
                console.log("Processing img: " + img.src);
                const name = this.extractFilename(img.src);
                allreadyProcessing.set(img.src, name);
                await axios.get(img.src, {
                    responseType: 'stream'
                }).then((imgResp) => {
                    elements.set(name, imgResp.data);
                    imgs[index].setAttribute("src", name);
                }).catch(err => console.log("Error processing img: " + img.src + " error: " + err));
            } else {
                console.log("Allready processing: " + img.src);
                const imgFileName = allreadyProcessing.get(img.src);
                imgs[index].setAttribute("src", imgFileName);
            }
            if (index + 1 === imgs.length) {
                ebookData.content.data = dom.serialize();
            }
        }
        ebookData[url] = [];
        ebookData[url].push(elements);
    }

    extractFilename(url) {
        const path = require('path');
        return path.basename(url);
        // return path.replace(/^.*[\\\/]/, '');
    }


    ifNoOutputnameAndSingleUrlThenUseHtmlTitleAsFilename(urls, ebookData, docTitle) {
        if (urls.length == 1 && !ebookData.outputname) {
            ebookData.title = docTitle;
        }
    }



    async sanitarizeData(url, response) {

        const site = this.getSite(url);

        let parsed = absolutify(response.data, site);

        parsed = parsed.replace(/src=\'\/\//gm, `src='http://`);
        parsed = parsed.replace(/src=\"\/\//gm, `src='http://`);

        // const cleanedHtml = await sanitizeHtml(parsed, {
        //     allowedTags: sanitizeHtml.defaults.allowedTags.concat(['img', 'html', 'body', 'head', 'title', 'article', 'style', 'link' , 'section' , 'doctype']),
        //     // preserveDoctypes: true,
        //     // allowProtocolRelative: false,
        //     exclusiveFilter: function (frame) {
        //         return frame.tag === 'img' && !frame.attribs.src; //fix exception when empty <img /> 
        //     }
        // });


        const validHtml = await new Promise((resolve, reject) => {
            tidy(parsed, { doctype: 'html5', hideComments: true }, async (err, html) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(html);
                }
            });
        });
        return validHtml;
    }


    getSite(url) {
        const location = URL.parse(url);
        return `${location.protocol}//${location.host}`;
    }

}

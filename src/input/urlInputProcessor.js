const { JSDOM } = require("jsdom");
const axios = require('axios');
const sanitizeHtml = require('sanitize-html');
const absolutify = require('absolutify')
const URL = require('url');
const { tidy } = require('htmltidy2');
const { of, Observable, from, bindCallback, Subject } = require("rxjs");
const { tap, map, flatMap, combineLatest, zip, retry, switchMap, skip } = require("rxjs/operators");
// const { create } = require("rxjs-spy");
// const spy = create();

module.exports = class UrlInputProcessor {


    gatherEbookData(urls, errors) {

        const chapterDataSubject = new Subject();
        const ebookData = {
            author: "Send2Ebook",
            content: []
        }
        let i = 0;
        urls.forEach(url => {
            console.log(`Processing: ${url}`);
            const url$ = of(url);
            const responseData$ = url$.pipe(
                flatMap(u => axios.get(u)), //TODO add {auth} //TODO check if cannot be replaced by JSDOM.from(url)
                retry(3),
                map(resp => resp.data),
            );

            const dom$ = responseData$.pipe(
                map(data => new JSDOM(data))
            )
            const title$ = dom$.pipe(
                map(dom => dom.window.document.title),
            )
            // this.ifNoOutputnameAndSingleUrlThenUseHtmlTitleAsFilename(urls, ebookData, docTitle);  //TODO move it to send2ebook.js

            //         await this.addAdditionalContent(cleanedHtml, chapterData);
            const sanitarized$ = this.sanitarizeData(url$, responseData$);

            const chapterData$ = sanitarized$.pipe(
                zip(title$, url$),
                map(arr => {
                    return {
                        data: arr[0],
                        title: arr[1],
                        source: arr[2],
                    }
                })
            )

            chapterData$.subscribe(
                cd => {
                    chapterDataSubject.next(cd);
                    if (++i === urls.length) {
                        chapterDataSubject.complete();
                    }
                },
                console.error);
        });

        return chapterDataSubject;
    }

    async addAdditionalContent(html, chapterData) {
        const dom = new JSDOM(html);

        chapterData.extraElements = new Map();
        const allreadyProcessing = new Map();

        // imgs.forEach((img, index, array) => { //TODO find way to async update DOM 
        await this.processImages(allreadyProcessing, chapterData, dom);
    }

    async processImages(allreadyProcessing, chapterData, dom) {

        const imgs = dom.window.document.querySelectorAll("img");

        for (let index = 0; index < imgs.length; index++) {
            let img = imgs[index];
            if (img.src && !allreadyProcessing.has(img.src)) {
                console.log("Processing img: " + img.src);
                const name = this.extractFilename(img.src);
                allreadyProcessing.set(img.src, name);
                await axios.get(img.src, {
                    responseType: 'stream'
                }).then((imgResp) => {
                    chapterData.extraElements.set(name, imgResp.data);
                    img.setAttribute("src", name);
                }).catch(err => {
                    console.log("Error processing img: " + img.src + " error: " + err);
                });
            }
            else {
                console.log("Allready processing: " + img.src);
                const imgFileName = allreadyProcessing.get(img.src);
                img.setAttribute("src", imgFileName);
            }
        }
    }


    extractFilename(url) {
        const path = require('path');
        return path.basename(url);
        // return path.replace(/^.*[\\\/]/, '');
    }


    ifNoOutputnameAndSingleUrlThenUseHtmlTitleAsFilename(urls, ebookData, docTitle) {
        if (urls.length == 1) {
            ebookData.title = docTitle;
        }
    }



    sanitarizeData(url$, response$) {

        const site$ = url$.pipe(
            map(url => this.getSite(url)));
        const absolute$ = response$.pipe(
            zip(site$),
            map(arr => absolutify(arr[0], arr[1])),

        );
        const tidy$ = absolute$.pipe(

            map(a =>
                a.replace(/src=\'\/\//gm, `src='http://`)), //TODO can be replaced with ' a.replace(/src=\('|")\/\//gm, `src='http://`)) ?
            map(a =>
                a.replace(/src=\"\/\//gm, `src='http://`)),

            flatMap(parsed => {
                const tidier$ = bindCallback(tidy);
                return tidier$(parsed, { doctype: 'html5', hideComments: true })
            }),
            switchMap(d => from(d)),
            skip(1),
        );
        return tidy$

    }


    getSite(url) {
        const location = URL.parse(url);
        return `${location.protocol}//${location.host}`;
    }

}

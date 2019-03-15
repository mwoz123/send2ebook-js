const { JSDOM } = require("jsdom");
const axios = require('axios');
const sanitizeHtml = require('sanitize-html');
const absolutify = require('absolutify')
const URL = require('url');
const { tidy } = require('htmltidy2');
const { of, Observable, from, bindCallback, Subject } = require("rxjs");
const { tap, map, flatMap, combineLatest, zip, concatMap, retry, switchMap, skip,
    distinct, filter, toArray, catchError, concat, groupBy, mergeMap } = require("rxjs/operators");
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
                catchError(err =>
                    console.error(`Error while requesting '${err.request._currentUrl}'. Exception: ${err.message}`)
                ),
                map(resp => resp.data),

            );

            const dom$ = responseData$.pipe(
                map(data => new JSDOM(data))
            )
            const title$ = dom$.pipe(
                map(dom => dom.window.document.title),
            )
            // this.ifNoOutputnameAndSingleUrlThenUseHtmlTitleAsFilename(urls, ebookData, docTitle);  //TODO move it to send2ebook.js


            const sanitarized$ = this.sanitarizeData(url$, responseData$);

            const imgs$ = this.addAdditionalContent(sanitarized$);

            const chapterData$ = sanitarized$.pipe(
                zip(title$, url$,
                    imgs$.pipe(toArray)),
                map(arr => {
                    return {
                        data: arr[0],
                        title: arr[1],
                        source: arr[2],
                        extraElements: arr[3]
                    }
                }),
            )

            chapterData$.subscribe( //TODO check if can be replace by chapterData$.subscribe(chapterDataSubject) or reverse
                cd => {
                    chapterDataSubject.next(cd);
                    console.log(cd);
                    if (++i === urls.length) {
                        chapterDataSubject.complete();
                    }
                },
                console.error);
        });

        return chapterDataSubject;
    }

    addAdditionalContent(sanitarized$) {
        const dom$ = sanitarized$.pipe(
            map(dom => new JSDOM(dom))
        )

        const chapterImgSubject = new Subject();

        dom$.subscribe(dom => {
            const imgs$ = from(dom.window.document.querySelectorAll("img"))
            const filteredImages$ = imgs$.pipe(
                filter(img => !!img.src),
                filter(img => !img.src.startsWith("data:image")), //can stay as is in html. No need to do anything

            );
            const x = filteredImages$.pipe(
                // distinct(img => img.src), // FIXME: distinct but must subscibe to change src in all <img>s
                flatMap(img => (axios.get(img.src, {
                    responseType: 'stream',
                    // httpAgent: false
                })).then(resp => ({ img, resp: resp.data }))),
                retry(3),
                catchError(err =>
                    console.error(`Error while requesting '${err.request._currentUrl}'. Exception: ${err.message}`)
                ),
                // filter(resp => !!resp.data),
                // map(resp => resp.data),
                // map(async img => {
                //     return {
                //         oldSrc: img.src,
                //         newSrc: this.extractFilename(img.src),
                //         img: img,
                //         // imgStream: 
                //     }
                // }),
                // concat(this.downloadStream(img.oldSrc)),
                // // tap(imgObj=> imgObj.img.src = imgObj.newSrc),
                tap(e =>
                    console.log(e)),
                // // switchMap(img =>
                //     flatMap(img=> ),
                //     tap(console.log),
                //     retry(3),
                //     catchError(err =>
                //         console.error(`Error while requesting '${err.request._currentUrl}'. Exception: ${err.message}`)
                //     ),
                //     tap(e=> 
                //         console.log(e)
                //         )
                // // )

            );//
            x.pipe().subscribe(
                e => {
                    e.img.oldSrc = e.img.src;
                    e.img.src = this.extractFilename(e.img.src);
                    chapterImgSubject.next(e);
                },
                console.error,

                () => { chapterImgSubject.complete(); console.log("complete img") })

            // filteredImages$.pipe(distinct(img => img.src),
            // // map(img=> {img: img, })
            // ).subscribe(
            //     img => {
            //         const img$ = of(img);
            //         const originalImgSrc$ = img$.pipe(
            //             map(img => img.src)
            //         );
            //         const fileWithoutPath$ = originalImgSrc$.pipe(
            //             map(this.extractFilename)
            //         );
            //         const imgStream$ = originalImgSrc$.pipe(
            //             flatMap(imgSrc => axios.get(imgSrc, {
            //                 responseType: 'stream',
            //                 // httpAgent: false
            //             })),
            //             retry(3),
            //             catchError(err =>
            //                 console.error(`Error while requesting '${err.request._currentUrl}'. Exception: ${err.message}`)
            //             ),
            //             filter(resp => !!resp.data),
            //             map(resp => resp.data),
            //         )
            //         const filenameAndImgStream$ = fileWithoutPath$.pipe(
            //             zip(imgStream$, img$, originalImgSrc$),

            //             map(arr => {
            //                 return {
            //                     fileName: arr[0],
            //                     // originalSrc: arr[2],
            //                     data: arr[1]

            //                 }
            //             }),
            //             // tap(console.log)
            //         )
            //         filenameAndImgStream$.subscribe(imgData => {
            //             console.log("adding data and chnagin src " + img.src );
            //             x.push(imgData);
            //             // chapterImgSubject.next(imgData)
            //             img.src = this.extractFilename(img.src);
            //         });
        },
            console.err,
            () => {
                console.log("completed Chapter data");

            }
        );

        // filteredImages$.subscribe(
        //     img => {
        //         // console.log(img.src);
        //         img.src = this.extractFilename(img.src);
        //     },
        //     console.error,

        // console.log(dom.serialize())
        // const imgs = dom.window.document.querySelectorAll("img")
        // from(imgs).pipe(
        //     map(img => img.src),
        //     groupBy(img => img),
        //     // groupBy(img=> img.src),

        //     mergeMap(group => group.pipe(toArray()))
        // ).subscribe(console.log)

        // );

        // })
        return chapterImgSubject;
        // return x;
    }


    extractFilename(url) {
        // const path = require('path');
        // return path.basename(url);
        return url.replace(/^.*[\\\/]/, '').replace(/[?].+/, "");
    }


    ifNoOutputnameAndSingleUrlThenUseHtmlTitleAsFilename(urls, ebookData, docTitle) {
        if (urls.length == 1) {
            ebookData.title = docTitle;
        }
    }

    async downloadStream(url) {
        let data;
        const prom = axios.get(url, {
            responseType: 'stream',
            // httpAgent: false
        });
        console.log("data " + data)
        await prom.then(resp => data = resp.data);
        console.log("data " + data)
        return data;
    }



    sanitarizeData(url$, response$) {

        const site$ = url$.pipe(
            map(url => this.getSite(url)));
        const absolute$ = response$.pipe(
            zip(site$),
            map(arr => absolutify(arr[0], arr[1])),

        );
        const tidy$ = absolute$.pipe(

            map(a => a.replace(/src=\'\/\//gm, `src='http://`)), //TODO can be replaced with ' a.replace(/src=\('|")\/\//gm, `src='http://`)) ?
            map(a => a.replace(/src=\"\/\//gm, `src='http://`)),

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

const { JSDOM } = require("jsdom");
const axios = require('axios');
const sanitizeHtml = require('sanitize-html');
const absolutify = require('absolutify')
const URL = require('url');
const { tidy } = require('htmltidy2');
const { of, Observable, from, bindCallback, Subject } = require("rxjs");
const { tap, map, flatMap, combineLatest, zip, retry, switchMap, skip,
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
            // imgs$.pipe(toArray()).subscribe(e => {
            //     console.log(e);
            // });

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
                    if (++i === urls.length) {
                        chapterDataSubject.complete();
                    }
                },
                console.error);
        });

        return chapterDataSubject;
    }

    addAdditionalContent(sanitarized$, chapterData) {
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

            filteredImages$.pipe(distinct(img => img.src)
            ).subscribe(
                img => {
                    const img$ = of(img);
                    const originalImgSrc$ = img$.pipe(
                        map(img => img.src)
                    );
                    const fileWithoutPath$ = originalImgSrc$.pipe(
                        map(this.extractFilename)
                    );
                    const imgStream$ = originalImgSrc$.pipe(
                        flatMap(imgSrc => axios.get(imgSrc, {
                            responseType: 'stream',
                            // httpAgent: false
                        })),
                        retry(3),
                        catchError(err =>
                            console.error(`Error while requesting '${err.request._currentUrl}'. Exception: ${err.message}`)
                        ),
                        map(resp => resp.data),
                    )
                    const filenameAndImgStream$ = fileWithoutPath$.pipe(
                        zip(imgStream$, img$, originalImgSrc$),

                        map(arr => {
                            return {
                                fileName: arr[0],
                                // originalSrc: arr[2],
                                data: arr[1]

                            }
                        }),
                        // tap(console.log)
                    )
                    filenameAndImgStream$.subscribe(imgData =>
                        chapterImgSubject.next(imgData)
                    );
                }
            );

            filteredImages$.subscribe(
                img => {
                    img.src = this.extractFilename(img.src);
                },
                console.error,
                () => {
                    chapterImgSubject.complete();
                    // const imgs = dom.window.document.querySelectorAll("img")
                    // from(imgs).pipe(
                    //     map(img => img.src),
                    //     groupBy(img => img),
                    //     // groupBy(img=> img.src),

                    //     mergeMap(group => group.pipe(toArray()))
                    // ).subscribe(console.log)
                }
            );

        })
        return chapterImgSubject;

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

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


    gatherEbookData(urls) {

        const chapterDataSubject = new Subject();

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
                filter(resp => !!resp),
                filter(resp => !!resp.data),
                map(resp => resp.data),

            );

            const title$ = responseData$.pipe(
                map(data => new JSDOM(data)),
                map(dom => dom.window.document.title),
            )


            const sanitarized$ = this.sanitarizeData(url$, responseData$);

            const imgs$ = this.addAdditionalContent(sanitarized$)
                .pipe(
                    tap(
                        imgData => imgData.img.src = imgData.newSrc),
                    tap(
                        imgData => imgData.img.newSrc = imgData.newSrc
                    ),
                    toArray())

            const chapterData$ = sanitarized$.pipe(
                zip(title$, url$, imgs$),
                map(arr => ({
                    title: arr[1],
                    extraElements: arr[3],
                    source: arr[2],
                    data: arr[0],
                })),
                map(obj => ({
                    ...obj, data: this.updateImagesSrcAndRemoveScripts(obj.data)
                })),
                // tap(console.log)
            )

            chapterData$.subscribe( //TODO check if can be replace by chapterData$.subscribe(chapterDataSubject) or reverse
                cd => {
                    chapterDataSubject.next(cd);
                    // console.log(cd);
                    if (++i === urls.length) {
                        chapterDataSubject.complete();
                    }
                },
                console.error);
        });

        return chapterDataSubject;
                // from(urls).pipe(
        //     zip(
        //         flatMap(u => axios.get(u)), //TODO add {auth} //TODO check if cannot be replaced by JSDOM.from(url)
        //         retry(3),
        //         catchError(err =>
        //             console.error(`Error while requesting '${err.request._currentUrl}'. Exception: ${err.message}`)
        //         ),
        //         map(resp => resp.data),
        //     )
        // ).subscribe(console.log)
    }

    updateImagesSrcAndRemoveScripts(html) {
        const dom = new JSDOM(html);
        const scripts = dom.window.document.querySelectorAll("script");
        for (let script of scripts.values()) {
            script.remove();
        }
        const imgs = dom.window.document.querySelectorAll("img");
        for (let img of imgs.values()) {
            img.src = this.extractFilename(img.src); //TODO check if needed as the observables are reordered
        }
        return dom.serialize();
    }

    addAdditionalContent(sanitarized$) {

        return sanitarized$.pipe(
            map(html => new JSDOM(html)),
            switchMap(dom => from(dom.window.document.querySelectorAll("img"))),
            filter(img => !!img.src),
            filter(img => img.src.startsWith("http") || img.src.startsWith("www")),
            distinct(img => img.src), // FIXME: distinct but must subscibe to all (change src in all <img>s)
            flatMap(img => (axios.get(img.src, {
                responseType: 'stream',
                // httpAgent: faldom.serialize()se
            })).then(resp => (
                { newSrc: this.extractFilename(img.src), img, imgStream: resp.data, }))
            ),
            retry(3),
            catchError(err =>
                console.error(`Error while requesting '${err.request._currentUrl}'. Exception: ${err.message}`)
            ),
        )

    }


    extractFilename(url) {
        return url.replace(/^.*[\\\/]/, '').replace(/[?].+/, "");
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

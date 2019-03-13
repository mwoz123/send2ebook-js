const Send2Ebook = require('./send2ebook');
const { Observable, interval, of, from, Subject, empty } = require("rxjs");
const { map, switchMap, flatMap, skip, distinct, filter, concat, mergeMap, 
    tap, take,  zip, throwError, catchError } = require("rxjs/operators");

const { JSDOM } = require("jsdom");


const html = "<!DOCTYPE html><html><head>    <title>Hello World</title></head> "
    + "<body> <img src='http://abc' alt='abc'> <img src='http://def' alt='def'> <p>a paragraph</p> "
    + "</body></html>";

// const dom$ = of(new JSDOM(html)).pipe(
//     tap(console.log)
// );

// const one$ = of(1);

const html$ = of(html);
// const dom$ = one$.pipe(
//     concat(html$),
//     skip(1),
//     map(arr=> new JSDOM(arr))
//     )
const dom$ = html$.pipe(
    // tap(console.log),
    map(html => new JSDOM(html)),
)

// const dom$ = of(html).pipe(
//     map(dom => new JSDOM(dom)),
//     tap(console.log),
// )
// const allImgs$ = dom$.pipe(flatMap(dom => from(dom.window.document.querySelectorAll("img"))));


function extractFilename(url) {
    // const path = require('path');
    // return path.basename(url);
    return url.replace(/^.*[\\\/]/, '').replace(/[?].+/, "") + "MOD";
}


dom$.subscribe(
    dom => {


        const i$ = from(dom.window.document.querySelectorAll("img"));
        const allImages$ = i$.pipe(
            filter(img => !!img.src),
            // tap(img => console.log(img.src)),
            filter(img => !
                img.src.startsWith("data:image")), //TODO: catch and migrate to observable
            distinct(img => img.src)
        );

        // allImages$.subscribe(
        //     img => {
        //         console.log(img);
        //         const img$ = of(img);
        //         const imgSrc$ = img$.pipe(map(img => img.src))
        //         const newSrc = imgSrc$.pipe(map(imgsrc => "modifiedSRC" + imgsrc))

        //         img$.pipe(
        //             zip(newSrc),
        //             tap(arr => arr[0].src = arr[1])
        //         ).subscribe(img =>
        //             console.log("replacing" + img.src), console.error,
        //             console.log("finished replacing")
        //         )

        //         // img.src = "modified" + img.src;
        //         // img.setAttribute("src", "modified" + img.src);
        //     },
        //     console.error,
        //     () => {
        //         console.log("complete all \n ");
        //         dom$.subscribe(dom => console.log(dom.serialize()))
        //     });


        // const dom = new JSDOM(html);

        // chapterData.extraElements = new Map();
        // const allreadyProcessing = new Map();

        // imgs.forEach((img, index, array) => { //TODO find way to async update DOM 
        //     await this.processImages(allreadyProcessing, chapterData, dom);
        // }

        // async processImages(allreadyProcessing, chapterData, dom) {

        // const imgs = dom.window.document.querySelectorAll("img");

        const chapterImgSubject = new Subject();

        allImages$.subscribe(
            img => {
                console.log("IMG: " +img);
                const img$ = of(img);
                const originalImgSrc$ = img$.pipe(
                    tap(e => console.log(e.src)),
                    map(img => img.src)
                );
                const fileWithoutPath$ = originalImgSrc$.pipe(
                    map(extractFilename)
                );
                const imgStream$ = originalImgSrc$.pipe(
                    flatMap(imgSrc => interval(1000).pipe(
                        take(1),
                        map(() => imgSrc))),
                        tap(console.log),
                        map(src=> src.startsWith("http") ? src : throwError("not starting from http:") ),
                    catchError(err =>
                        console.error(err)
                    ),
                )
                img$.pipe(zip(fileWithoutPath$),
                ).subscribe(arr => {
                    arr[0].src = arr[1]
                    // console.log(arr);
                    arr[0].setAttribute("src", arr[1]);
                });

                const filenameAndImgStream$ = fileWithoutPath$.pipe(
                    zip(imgStream$),
                    map(arr => {
                        return {
                            fileName: arr[0],
                            data: arr[1]

                        }
                    }),
                    tap(console.log)
                )
                filenameAndImgStream$.subscribe(imgData =>
                    chapterImgSubject.next(imgData)
                );
            },
            console.error,
            () => {
                // chapterImgSubject.complete(); 
                // dom$.subscribe(
                    // html => 
                    console.log(dom.serialize())
                // )
            }
        );

    }
)
// const images = dom.window.document.querySelectorAll("img");
// images.forEach((img, index, array) => {
//     img.src = "modified" + img.src;
//     img.setAttribute("src", "modified" + img.src);
//     if (array.length == index + 1) {
//         console.log(dom.serialize());
//     }
// })



// const s2e = new Send2Ebook(connectionSettings);
// s2e.process(["https://www.spidersweb.pl/2019/03/ludzkie-kosci-na-instagramie.html?full=1", "https://developer.mozilla.org/pl/docs/Web/JavaScript/Referencje/Obiekty/Array/forEach"]);



// let i = 0;
// log = (element) => {
//     console.log(element + " " + i++);
// }

// from(["abc", "def" ]).pipe(map(item => item)).subscribe(log);    

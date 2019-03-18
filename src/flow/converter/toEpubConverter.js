const Streampub = require('streampub')
const { of, Observable, from, bindCallback, Subject } = require("rxjs");
const { tap, map, flatMap, combineLatest, zip, concatMap, retry, switchMap, skip,
    distinct, filter, toArray, catchError, concat, groupBy, mergeMap } = require("rxjs/operators");

module.exports = class ToEpubConverter {

    convert(epubData, writeableStream) {
        epubData.fileExt = ".epub";
        epubData.author = "Send2Ebook";


        // from(epubData).pipe(
        //     map(data => ({
        //         data,
        //         epub: new Streampub({ title: data.title, author: data.author })
        //     })),
        //     tap(data => data.epub.pipe(writeableStream)),
        //     flatMap(data=> data.forEach())
        // )

        this.ifSingleUrlThenUseHtmlTitleAsFilename(epubData);

        const epub = new Streampub({ title: epubData.title, author: epubData.author });

        epub.pipe(writeableStream);

        return new Promise(resole => {


            epubData.forEach((chapterData, i, chapterArray) => {

                epub.write(Streampub.newChapter(chapterData.title, chapterData.data, i, `chapter-${i}.xhtml`));

                if (chapterData.extraElements.length > 0) {

                    chapterData.extraElements.forEach(({ newSrc, imgStream }, j, array) => {

                        epub.write(Streampub.newFile(newSrc, imgStream))

                        const allElementsProcessed = j + 1 === array.length && i + 1 === chapterArray.length;
                        if (allElementsProcessed) {
                            this.finishProcessing(epub, resole, writeableStream);
                        }
                    });
                } else if (i + 1 === chapterArray.length) {
                    this.finishProcessing(epub, resole, writeableStream);
                }
            });
        });
    }

    finishProcessing(epub, resole, writeableStream) {
        epub.end();
        resole(writeableStream);
    }


    ifSingleUrlThenUseHtmlTitleAsFilename(ebookData) {
        ebookData.title = ebookData.title || (ebookData.length === 1 ? ebookData[0].title : this.titleFromDate())
    }


    titleFromDate() {
        return new Date().toISOString().substr(0, 19).replace("T", "_").replace(/[:]/gi, ".");
    }
}

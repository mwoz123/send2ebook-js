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

        return new Promise(resole => {

            const epub = new Streampub({ title: epubData.title });
            epub.setAuthor(epubData.author);
            epub.pipe(writeableStream);

            epubData.forEach((chapterData, i, chapterArray) => {

                epub.write(Streampub.newChapter(chapterData.title, chapterData.data, i, `chapter-${i}.xhtml`));

                if (chapterData.extraElements.length > 0) {

                    chapterData.extraElements.forEach(({ newSrc, imgStream }, j, array) => {
                        // const extraEntiresArray = Array.from(chapterData.extraElements);
                        // extraEntiresArray.forEach(([key, value], j, array) => {

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
}

const Streampub = require('streampub')

module.exports = class ToEpubConverter {

    convert(epubData, writeableStream) {
        epubData.fileExt = ".epub";

        return new Promise(resole => {

            const epub = new Streampub({ title: epubData.title });
            epub.setAuthor(epubData.author);
            epubData.forEach((chapterData, i, chapterArray) => {

                epub.pipe(writeableStream);
                epub.write(Streampub.newChapter(chapterData.title, chapterData.data, i, `chapter-${i}.xhtml`));

                // const extraEntiresArray = Array.from(chapterData.extraElements);
                // extraEntiresArray.forEach(([key, value], j, array) => {
                    
                //     epub.write(Streampub.newFile(key, value))

                    const allElementsProcessed = i + 1 === chapterArray.length ; //&& j + 1 === array.length;
                    if (allElementsProcessed) {
                        this.finishProcessing(epub, resole, writeableStream);
                    }
                // });
                // if (chapterData.extraElements.size === 0) {
                    // this.finishProcessing(epub, resole, writeableStream);
                // }
            });
        });
    }

    finishProcessing(epub, resole, writeableStream) {
        epub.end();
        resole(writeableStream);
    }
}

const Streampub = require('streampub')

class ToEpubConverter {

    convert(epubData, writeableStream) {
        const fileExt = ".epub";
        epubData.fileExt = fileExt;

        return new Promise((resole, reject) => {

            const epub = new Streampub({ title: epubData.title });
            epub.setAuthor(epubData.author);
            epubData.content.forEach((chapterData, i, chapterArray) => {

                epub.pipe(writeableStream);

                epub.write(Streampub.newChapter(chapterData.title, chapterData.data, i, `chapter-${i}.xhtml`));

                chapterData.extraElements.forEach((value, key, map) => {
                    epub.write(Streampub.newFile(key, value))
                    if (i + 1 === chapterArray.length && map.get(map.size - 1) === value) {
                        epub.end()
                        resole(writeableStream);
                    }
                });
            });
        });

    }
}


module.exports = ToEpubConverter;
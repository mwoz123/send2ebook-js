const Streampub = require('streampub')

class ToEpubConverter {

    convert(data, writeableStream) {
        const epub = new Streampub({ title: data.title });
        epub.setAuthor(data.author);
        epub.pipe(writeableStream);

        return new Promise((resole, reject) => {

            data.content.forEach((item, index, array) => {
                const chapter = Streampub.newChapter(`Chapter ${index + 1}`, item.data, index, `chapter-${index}.xhtml`);
                epub.write(chapter);
                if (index + 1 === array.length) {
                    epub.end()
                }
                resole(writeableStream);
            });
        })

    }
}


module.exports = ToEpubConverter;
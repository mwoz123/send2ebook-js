const Streampub = require('streampub')

export class EpubConverter {

    convert(data, writeableStream) {
        const epub = new Streampub({ title: data.title });
        epub.setAuthor(data.author);
        epub.pipe(writeableStream);

        data.content.forEach((item, index, array) => {
            const chapter = Streampub.newChapter(`Chapter ${index + 1}`, item.data, index, `chapter-${index}.xhtml`);
            epub.write(chapter);
            if (index + 1 === array.length) {
                epub.end()
            }
        });

    }
}
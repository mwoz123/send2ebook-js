

module.exports = class EpubData {

    title ="";
    url;
    chapters = new Map();
    chap
    errors = new Map();

    addError(error, url) {
        this.errors.set(error, url);
    }

    addChapter(title, htmlStream) { 
        this.chapters.set(title, {htmlStream});
    }

    addDataToChapter(title, chapterStreamArray) {
        const chapterData = this.chapters.get(title);
        chapterData.chapterStreamArray = chapterStreamArray;
    }



}



module.exports = class NameSanitarizer {
    sanitarizeName(str) {
        return str.replace(/[^\w\s]/gm, "_");
    }
}

const Send2Ebook = require("./send2ebook");

const connectionSettings = {
    host: "test.ftp.com",
    port: 21, // defaults to 21
    user: "mwoz123",
    pass: "abcd", // defaults to "@anonymous"
    folder: "/"
}


const s2e = new Send2Ebook(connectionSettings);
s2e.process(['https://codeburst.io/nodejs-streams-demystified-e0b583f0005'] , "test");






const jsftp = require("jsftp");
const fs = require("fs");
const { JSDOM } = require("jsdom");
const axios = require('axios');
const sanitizeHtml = require('sanitize-html');
const Epub = require("epub-gen")
const absolutify = require('absolutify')
const URL = require('url');


const fileExt = ".epub";

class Send2Ebook {

  constructor({ host, user, pass, port = 21, folder = "/" }) {
    this.host = host;
    this.user = user;
    this.pass = pass;
    this.port = port;
    this.folder = folder;
  }


  async process([...urls], outputname = new Date().toISOString().substr(0, 18)) {

    const option = {
      title: outputname,
      author: "Send2Ebook",
      content: []
    }

    const errors = new Map();

    for (let i = 0; i < urls.length; i++) {
      // url.forEach(value => {
      let url = urls[i];
      console.log(`Processing: ${url}`);
      let response;
      try {
        response = await axios.get(url);
      } catch (err) {
        errors.set(url, err);
        continue;
      }

      const dom = new JSDOM(response.data);
      const docTitle = dom.window.document.head.querySelector("title").text;

      let cleanedHtml;
      try {
        cleanedHtml = await this.sanitarizeData(url, response);
      } catch (err) {
        errors.set(url, err);
        continue;
      }

      option.content.push({
        title: docTitle,
        data: cleanedHtml,
        author: url
      })
    };

    if (option.content.length > 0) {
      let localFileName = outputname + fileExt;
      try {
        await new Epub(option, localFileName).promise;
      } catch (err) {
        throw err;
      }


      try {
        await this.saveToFtpAndRemoveFromDisk(localFileName);
      } catch (err) {
        throw err;
      }
    }

    errors.forEach((err, url) => console.error(`${err} for url: ${url}`));

  }




  async sanitarizeData(url, response) {
    const location = URL.parse(url);
    const site = `${location.protocol}//${location.host}`;
    let parsed = absolutify(response.data, site);

    parsed = parsed.replace(/src=\'\/\//gm, `src='http://`);

    parsed = parsed.replace(/src=\"\/\//gm, `src='http://`);

    // const cleanedHtml = await sanitizeHtml(parsed, {
    //   allowedTags: sanitizeHtml.defaults.allowedTags.concat(['img', 'html', 'body', 'head', 'title']),
    //   preserveDoctypes: true
    // });
    // return cleanedHtml;
    return parsed;
  }

  sanitarizeName(str) {
    return str.replace(/[^\w\s]/gm, "_");
  }





  saveToFtpAndRemoveFromDisk(localFileName) {
    console.log("saving to ftp " + this.host);
    const remotePath = this.folder + localFileName;
    // let localFileName = this.localFileName;
    const ftp = new jsftp({ host: this.host, port: this.port, user: this.user, pass: this.pass });
    ftp.put(localFileName, remotePath, function (err) {
      if (err)
        throw err;
      console.log('succesfully send to ftp ');
      ftp.destroy();

      fs.unlink(localFileName, (err) => {
        if (err)
          throw err;
        console.log(localFileName + ' was removed from local filesystem');
      });
    });
  }
}

module.exports = Send2Ebook;
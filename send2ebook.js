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


  async process([...urls]) {

    const saveName = "ABC2-test"
    const option = {
      title: saveName,
      author: "Send2Ebook",
      content: []
    }

    for (let i = 0; i < urls.length; i++) {
      // url.forEach(value => {
      let url = urls[i];
      console.log(url);
      let response;
      try {
        response = await axios.get(url);
      } catch (err) {
        console.log(err);
        throw err;
      }

      const dom = new JSDOM(response.data);
      const docTitle = dom.window.document.head.querySelector("title").text;

      let cleanedHtml;
      try {
        cleanedHtml = await this.sanitarizeData(url, response);
      }catch (err) {
        console.log(err);
        throw err;
      }
      
  

      // const saveName = this.sanitarizeName(docTitle);

      option.content.push({
        title: docTitle,
        data: cleanedHtml
      })


    };
    let localFileName = saveName + fileExt;
    // let localFileName = "ABC-etes" + fileExt;
    try {
      await new Epub(option, localFileName).promise;
    }catch (err) {
      console.log(err);
      throw err;
    }
    






    try {
      await this.saveToFtp(localFileName);
    } catch (err) {
      console.log(err);
      throw err;
    }
  }





  async sanitarizeData(url, response) {
    const location = URL.parse(url);
    const site = `${location.protocol}//${location.host}`;
    let parsed =  absolutify(response.data, site);

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





  saveToFtp(localFileName) {
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
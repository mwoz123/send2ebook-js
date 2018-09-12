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

  constructor({ host, user, pass, port, folder }) {
    this.host = host;
    this.user = user;
    this.pass = pass;
    this.port = port ? port : 21;
    this.folder = folder ? folder : "/";
  }
  

  async process(url) {

    let response ;
    try {
      response = await axios.get(url);
    }catch (err ) {
      console.log(err);
      throw err;
    }
    
    const cleanedHtml = this.sanitarizeData(url, response);

    try {
      await this.convertToEpub(cleanedHtml, this);
    }catch (err){
      console.log(err);
      throw err;
    }
    try {
      await this.saveToFtp(this);
    }catch (err){
      console.log(err);
      throw err;
    }
  }





  sanitarizeData(url, response) {
    const location = URL.parse(url);
    const site = `${location.protocol}//${location.host}`;
    let parsed = absolutify(response.data, site);

    parsed = parsed.replace(/src=\'\/\//gm, `src='http://`);

    parsed = parsed.replace(/src=\"\/\//gm, `src='http://`);

    const cleanedHTML = sanitizeHtml(parsed, {
      allowedTags: sanitizeHtml.defaults.allowedTags.concat(['img', 'html', 'body', 'head', 'title']),
      preserveDoctypes: true
    });
    return cleanedHTML;
  }

  sanitarizeName(str) {
    return str.replace(/[^\w\s]/gm, "_");
  }

  convertToEpub(cleanedHTML, _this) {

    const dom = new JSDOM(cleanedHTML);
    const docTitle = dom.window.document.head.querySelector("title").text;

    const saveName = this.sanitarizeName(docTitle);

    const option = {
      title: saveName,
      author: "Send2Ebook",
      content: [
        {
          data: cleanedHTML
        },
      ]
    };
    _this.localFileName = saveName + fileExt;
    return new Epub(option, _this.localFileName).promise ;

  }

  saveToFtp() {
    console.log("saving to ftp " + this.host) ;
    const remotePath = this.folder + this.localFileName;
    let localFileName = this.localFileName;
    const ftp = new jsftp({ host: this.host, port: this.port, user: this.user, pass: this.pass });
    ftp.put(this.localFileName, remotePath, function (err) {
      if (err)
        throw err;
      console.log('succesfully send to ftp ');
      ftp.destroy();
      fs.unlink(localFileName, (err) => {
        if (err)
          throw err;
        console.log(localFileName +' was removed from local filesystem');
      });
    });
  }
}
module.exports = Send2Ebook;
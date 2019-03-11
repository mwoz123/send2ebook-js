const { of, from, bindCallback } = require("rxjs");
const { tap, map, take, flatMap, retry, zip, switchMap } = require("rxjs/operators");
const axios = require('axios');
const { JSDOM } = require("jsdom");

const sanitizeHtml = require('sanitize-html');
const absolutify = require('absolutify')
const URL = require('url');
const { tidy } = require('htmltidy2');



const Send2Ebook = require("./send2ebook");

const connectionSettings = {
    host: "test.ftp.com",
    port: 21, // defaults to 21
    user: "mwoz123",
    pass: "abcd", // defaults to "@anonymous"
    folder: "/"
}


const urls = ["https://www.rmf24.pl/fakty/swiat/news-wenezuela-pograzona-w-ciemnosciach-kraj-bez-pradu,nId,2873306",
    'https://gazetawroclawska.pl', "https://rxmarbles.com"];

const s2e = new Send2Ebook(connectionSettings);
s2e.process(['https://www.rmf24.pl/fakty/swiat/news-wenezuela-pograzona-w-ciemnosciach-kraj-bez-pradu,nId,2873306'] );


const url$ = from(urls).pipe(

)

// urls.forEach( e => 
//     {
//         const url$ = of (e);
//         cosnt respData$ = url$.pipe(flatMap(url =>  axios.get(url)), )
//         const 

//     }

//     )
// url$.p
const responseData$ = url$.pipe(
    // switchMap(url => { return of({ url , data : from(axios.get(url))}) }),
    switchMap(async url => {
        // url.pipe(
        //     map(url => {
        //         const resp = axios.get(url);
        //         resp.then(d)
        //     })
        // )
        // return of({
        //     url,
        //     data: from(axios.get(url)).pipe(
        //         retry(3),
        //         flatMap(resp => resp.data),
        //     )//.subscribe( u => this.data = u)
        // };
        const x = { url }
        const y = await axios.get(url);
        x.data = y.data;
        return x;
    },


    )

    // tap(console.log),
    // retry(3),
    // map(resp => resp.data),
    // map( reps => {

    // })
);

const dom$ = responseData$.pipe(
    map(data => new JSDOM(data))
)
const title$ = dom$.pipe(
    map(dom => dom.window.document.title),
    // tap(console.log)
)

const zipped$ = title$.pipe(
    zip(url$, responseData$),
)

function getSite(url) {
    const location = URL.parse(url);
    return `${location.protocol}//${location.host}`;
}

const url2$ = of("https://www.rmf24.pl/fakty/swiat/news-wenezuela-pograzona-w-ciemnosciach-kraj-bez-pradu,nId,2873306");


// sanitarizeData(url$, response$) {
const response$ = url2$.pipe(flatMap(a => axios.get(a),
    retry(3),
    map(resp => resp.data)),
    tap(console.log)
);

const site$ = url2$.pipe(
    map(url => getSite(url)));
const absolute$ = response$.pipe(
    zip(site$),
    tap(console.log),

    map(zip => absolutify(zip[0], zip[1])),
    flatMap(),
);
const d$ = absolute$.pipe(

    tap(console.log),
    map(a =>
        a.replace(/src=\'\/\//gm, `src='http://`)),
    map(a =>
        a.replace(/src=\"\/\//gm, `src='http://`)),
    map(a => { const tidier$ = bindCallback(tidy); return tidier$(parsed, { doctype: 'html5', hideComments: true }) })
);
// const cleanedHtml = await sanitizeHtml(parsed, {
//     allowedTags: sanitizeHtml.defaults.allowedTags.concat(['img', 'html', 'body', 'head', 'title', 'article', 'style', 'link' , 'section' , 'doctype']),
//     // preserveDoctypes: true,
//     // allowProtocolRelative: false,
//     exclusiveFilter: function (frame) {
//         return frame.tag === 'img' && !frame.attribs.src; //fix exception when empty <img /> 
//     }
// });




d$.subscribe(
    e => {
        // debugger;
        console.log(e)
    },
    console.error);



    // }
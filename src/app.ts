import { Send2Ebook } from './send2ebook';
// const { JSDOM } = require("jsdom");

// const axios = require('axios');
import axios from "axios";
const sanitizeHtml = require('sanitize-html');
const Epub = require("epub-gen")
const absolutify = require('absolutify')
const urlParser = require('url');
const tidy = require('htmltidy2').tidy;

// import { Observable } from 'rxjs/Observable';
import 'rxjs/add/observable/from';
import jsftp from "jsftp";
import fs from "fs";

import { range, Observable, from, of, defer } from 'rxjs';
// import { Observable } from 'rxjs/Observable';
import 'rxjs/add/observable/from';
import { map, filter, concat, tap, repeat, switchMap, count, merge, take, mergeMap, switchAll, flatMap } from 'rxjs/operators';
import { JSDOM } from "jsdom";
// import { Observable } from 'rxjs';
// import {JSDOM} from "jsdom";


export class App {


    constructor() {

        const map2 = new Map<string, string>();
        // const url = "https://blog.rangle.io/rxjs-where-is-the-if-else-operator/"
        const url2 = "https://css-tricks.com/the-trick-to-viewport-units-on-mobile/"
        const urls = [
            // url, 
            url2];


        // switchMap( resp => resp),
        // switchMap( ()=> 0 , x => x ),
        // map(resp => resp),
        // switchAll(),
        // map(x => x.data)
        // count(),
        // take(2)
        // switchMap(resp => resp.data)

        // const responses$ = from(urls).pipe(
        //     flatMap(url => axios.get(url)),
        //     map(resp => resp.data));

        // const dom$ = responses$.pipe(map(data => new JSDOM(data)));
        // const title$ = dom$.pipe(map(dom => dom.window.document.title));

        // title$.subscribe(console.log);
        const conn = {host: "abc", "user": "def", "pass": "addd", port : 21, folder : "/"}
        const s2e = new Send2Ebook(conn);
        s2e.process(url2, "x");




        // from([1,4,6]).pipe(
        //     map(i => i -1),
        //     tap ( _ => console.log("after odejmowanie")),
        //     // Observable.
        //     concat([100, 30 ,54]),
        //     tap(console.log),
        //     filter( e => e %2 == 0)
        // ).subscribe( i => console.log(i));



    }
}

new App();


// https://stackoverflow.com/questions/43712312/make-ionic-app-appear-in-share-list-and-receive-data
console.log("hello");
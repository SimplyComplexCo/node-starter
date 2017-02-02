/**
 * Module dependencies.
 */
'use strict';

const Counter = require('passthrough-counter');
const humanize = require('humanize-number');
const bytes = require('bytes');
const chalk = require('chalk');

/**
 * TTY check for dev format.
 */

const isatty = process.stdout.isTTY;

const colorCodes = {
  5: 'red',
  4: 'yellow',
  3: 'cyan',
  2: 'green',
  1: 'green'
};

export default class Logger {
  constructor(out, level){
    if(out && level){
      out = out[level];
    }
    if(!out){
      out = console.log;
    }
    this.logger = out;
  }

  time(start) {
    const delta = new Date - start;
    return humanize(delta < 10000
      ? delta + 'ms'
      : Math.round(delta / 1000) + 's');
  }

  log(ctx, start, len, err, event) {
    // get the status code of the response
    const status = err
      ? (err.status || 500)
      : (ctx.status || 404);

    // set the color of the status code;
    const s = status / 100 | 0;
    const color = colorCodes[s];

    // get the human readable response length
    let length;
    if (~[204, 205, 304].indexOf(status)) {
      length = '';
    } else if (null == len) {
      length = '-';
    } else {
      length = bytes(len);
    }

    const upstream = err ? chalk.red('xxx')
      : event === 'close' ? chalk.yellow('-x-')
      : chalk.gray('-->')

    this.logger('  ' + upstream
      + ' ' + chalk.bold('%s')
      + ' ' + chalk.gray('%s')
      + ' ' + chalk[color]('%s')
      + ' ' + chalk.gray('%s')
      + ' ' + chalk.gray('%s'),
        ctx.method,
        ctx.originalUrl,
        status,
        this.time(start),
        length);
  }

  dev(opts) {
    const self = this;
    return function logger(ctx, next) {
      // request
      const start = new Date;
      self.logger('  ' + chalk.gray('<--')
        + ' ' + chalk.bold('%s')
        + ' ' + chalk.gray('%s'),
          ctx.method,
          ctx.originalUrl);

      return next().then(() => {

        // calculate the length of a streaming response
        // by intercepting the stream with a counter.
        // only necessary if a content-length header is currently not set.
        const length = ctx.response.length;
        const body = ctx.body;
        let counter;
        if (null == length && body && body.readable) {
          ctx.body = body
            .pipe(counter = Counter())
            .on('error', ctx.onerror);
        }

        // log when the response is finished or closed,
        // whichever happens first.
        const res = ctx.res;

        const onfinish = done.bind(null, 'finish');
        const onclose = done.bind(null, 'close');

        res.once('finish', onfinish);
        res.once('close', onclose);

        function done(event){
          res.removeListener('finish', onfinish);
          res.removeListener('close', onclose);
          self.log(ctx, start, counter ? counter.length : length, null, event);
        }

      }, err => {
        // log uncaught downstream errors
        self.log(ctx, start, null, err);
        throw err;
      });

    }
  }
}

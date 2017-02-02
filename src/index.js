import fs from 'fs';
import path from 'path';
import stream from 'stream';
import EventEmitter from 'events';
import { ReplaySubject } from 'rxjs/Rx';

import Koa from 'koa';

import Router from 'koa-router';
import KoaLogger from './common/utils/koa-logger';
import koaConvert from 'koa-convert';
import koaBody from 'koa-body';
import cors from 'kcors';
import Boom from 'boom';

import marked from 'marked';

import winston from 'winston';
import config from '../config';

import assert from 'assert';
import http from 'spdy';
import chalk from 'chalk';
import mongodb from 'mongodb';

import session from 'koa-session2';

chalk.enabled = true;

const MongoClient = mongodb.MongoClient;

const app = new Koa();
const port = config.get('server.port');
const env = process.env.NODE_ENV || 'development';

global.serverStarted = new ReplaySubject(1);

const httpOptions = {
  key: fs.readFileSync(config.get('server.key')),
  cert: fs.readFileSync(config.get('server.crt'))
};

const logger = new (winston.Logger)({
  transports: [
    new (winston.transports.Console)({
      level: 'silly',
      colorize: true
    }),
    new (winston.transports.File)({
      level: 'info',
      colorize: false,
      filename: 'live-iot-stream.log'
    })
  ]
});
config.logger = logger;

const kLog = new KoaLogger(logger, 'debug');

MongoClient.connect(config.get('mongo.url') + config.get('mongo.database'), async function(err, db) {
  assert.equal(null, err);
  logger.info(`Connected to ${chalk.magenta(config.get('mongo.url') + config.get('mongo.database'))}`);
  config.db = db;
  try {
    await initializeServer(db);
  } catch (error) {
    logger.error(error);
  }
});

const router = new Router();

router.get(['/', '/doc/'], async (ctx, next) => {
  ctx.originalUrl = '/doc/index.md';
  ctx.skipNext = true;
  ctx.body = fs.createReadStream(path.normalize(path.join(__dirname, '..', 'dist', 'doc', 'index.md')));
});

marked.setOptions({
  gfm: true,
  tables: true,
  breaks: true
});

function parseStream(stream) {
  return new Promise((resolve, reject) => {
    let body = '';
    stream.setEncoding('utf8');
    stream.on('data', chunk => {
      body += chunk;
    });
    stream.on('error', reject);
    stream.on('end', () => {
      resolve(marked(body));
    });
  });
}

async function parseMarkdown(ctx, next) {
  if(!ctx.skipNext) {
    await next();
  }

  if(ctx.body instanceof stream.Readable) {
    if(path.extname(ctx.originalUrl) === '.md') {
      ctx.type = 'html';
      ctx.body = `
      <html>
        <head>
          <link rel="stylesheet" href="/doc/assets/github.css">
          <link rel="stylesheet" href="/doc/assets/style.css">
        </head>
        <body>
          ${await parseStream(ctx.body)}
        </body>
      </html>`;
    }
  }
}

const modulesBase = __dirname;
const modules = fs.readdirSync(modulesBase);

const apiV1 = '/api/v1/';

async function initializeServer(db) {
  logger.info(chalk.bold.blue('loading modules:'));
  try {
    for(const module of modules){
      const fullModule = path.join(modulesBase, module);
      if(fs.existsSync(path.join(fullModule, 'routes.js')) && module !== 'common') {
        logger.info(chalk.bold.blue(`  ↳ ${apiV1}${module}: `) + fullModule);

        const moduleRouter = require(path.join(fullModule, 'routes.js')).default;
        router.use(apiV1 + module, moduleRouter.routes(), moduleRouter.allowedMethods());
        for(let route of moduleRouter.routes().router.stack) {
          logger.debug(chalk.bold.blue('  ⇀  ') + chalk.magenta(route.methods[route.methods.length - 1]) + ':\t' + route.path);
        }
      }
    }

    app.keys = ['secret']

    app.use(kLog.dev());
    app.use(koaBody({multipart: true}));
    app.use(session({
        key: config.get('server.sessionId')
    }));

    app.use(cors({
      credentials: true
    }));

    app.use(parseMarkdown);
    app.use(require('koa-static')(path.normalize(path.join(__dirname, '..', 'dist')), {}));
    app.use(router.routes());
    app.use(router.allowedMethods({
      throw: true,
      notImplemented: () => new Boom.notImplemented(),
      methodNotAllowed: () => new Boom.methodNotAllowed()
    }));

    const httpServer = http.createServer(httpOptions, app.callback())

    httpServer.listen(port, error => {
      if(error) {
        return logger.error(chalk.red('Error: '), error);
      }
      logger.info('Server started on port ' + chalk.bold.magenta(config.get('server.port')));
    });

    serverStarted.next(true);
  } catch (error) {
    config.logger.error(error);
  }
}

export { app };

export default app;

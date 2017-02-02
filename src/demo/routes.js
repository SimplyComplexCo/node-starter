import Router from 'koa-router';
import { Demo } from './model';
import assert from 'assert';
import config from '../../config';

import chalk from 'chalk';

const logger = config.logger;
const router = new Router();
let model;

async function initModel(ctx, next){
  if(!model){
    model = new Demo();
  }
  await next();
}


/**
 * @api {GET} /api/v1/demo List demos
 * @apiName ListDemos
 * @apiVersion 1.0.0
 * @apiGroup Demo
 * @apiUse AuthenticatedRead
 *
 * @apiSuccessExample {json} Success-Response:
 *   HTTP/2.0 200 OK
 *   [
 *     {
 *        "_id": "123456789012345678901234"
 *     },
 *     ...
 *   ]
 */
 router.get('/', initModel, async (ctx, next) => {
  let limit, offset;
  if(ctx.query.limit){
    limit = parseInt(ctx.query.limit);
  }
  if(ctx.query.offset){
    offset = parseInt(ctx.query.offset);
  }
  ctx.body = await model.list({limit: limit, offset: offset});
});

/**
 * @api {POST} /api/v1/demo New demo
 * @apiName NewDemo
 * @apiVersion 1.0.0
 * @apiGroup Demo
 * @apiUse AuthenticatedReadWrite
 *
 *
 * @apiParamExample {json} Request-Example:
 *   {
 *   }
 *
 * @apiSuccessExample {json} Success-Response:
 *   HTTP/2.0 200 OK
 *   {
 *      "_id": "123456789012345678901234"
 *   }
 */
 router.post('/', initModel, async (ctx, next) => {
  await model.create(ctx.request.body);
  ctx.body = model.raw;
});


/**
 * @api {GET} /api/v1/demo/:id Get demo
 * @apiName GetDemo
 * @apiVersion 1.0.0
 * @apiGroup Demo
 * @apiUse AuthenticatedRead
 *
 * @apiSuccessExample {json} Success-Response:
 *   HTTP/2.0 200 OK
 *   {
 *      "_id": "123456789012345678901234"
 *   }
 */
 router.get('/:id', initModel, async (ctx, next) => {
  await model.getById(ctx.params.id);
  ctx.body = model.raw;
});


/**
 * @api {PUT} /api/v1/demo/:id Update demo
 * @apiName UpdateDemo
 * @apiVersion 1.0.0
 * @apiGroup Demo
 * @apiUse AuthenticatedReadWrite
 *
 * @apiParamExample {json} Request-Example:
 *   {
 *   }
 *
 * @apiSuccessExample {json} Success-Response:
 *   HTTP/2.0 200 OK
 *   {
 *      "_id": "123456789012345678901234"
 *   }
 */
 router.put('/:id', initModel, async (ctx, next) => {
  await model.updateById(ctx.params.id, ctx.request.body);
  ctx.body = model.raw;
});

/**
 * @api {DELETE} /api/v1/demo/:id Delete demo
 * @apiName DeleteDemo
 * @apiVersion 1.0.0
 * @apiGroup Demo
 * @apiUse AuthenticatedRead
 *
 * @apiSuccessExample {json} Success-Response:
 *   HTTP/2.0 200 OK
 *   {
 *   }
 */router.delete('/:id', initModel, async (ctx, next) => {
  ctx.body = await model.deleteById(ctx.params.id);
});


export default router;

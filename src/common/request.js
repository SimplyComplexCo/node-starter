import { NotFoundError, InvalidDataError } from '.';
import config from '../../config';

export async function handleErrors(error, ctx) {
  if(!ctx.setError){
    if(error instanceof NotFoundError) {
      ctx.status = 404;
    } else if(error instanceof InvalidDataError) {
      ctx.status = 400;
    } else {
      ctx.status = 500;
      config.logger.error(error);
    }
  }
  ctx.body = {
    success: false,
    message: error.message,
    code: ctx.errorCode
  };
}

export function errorWraped(fn, handlerOverride){
  return async (ctx, next) => {
    try {
      await fn(ctx, next);
    } catch (e) {
      if(handlerOverride && typeof handlerOverride === 'function') {
        handlerOverride(e, ctx);
      } else {
        handleErrors(e, ctx);
      }
    }
  }
}

import {MongoClient} from 'mongodb';
import assert from 'assert';
import config from '../../config';
import { Model } from '../common/model';
import chalk from 'chalk';
import * as path from 'path';

const scriptName = path.basename(__dirname);
const logger = config.logger;

export default class Demo extends Model {
  static get collectionName() {
    return scriptName;
  };

  constructor() {
    super(scriptName);
  }
}

export { Demo }

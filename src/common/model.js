import { MongoClient, ObjectID } from 'mongodb';
import { NotFoundError, InvalidDataError } from './errors'
import assert from 'assert';
import moment from 'moment';
import config from '../../config';

import chalk from 'chalk';
import Ajv from 'ajv';

const ajv = new Ajv();
const logger = config.logger;

export default class Model {
  constructor(collection) {
    this.collectionName = collection;
    this.dataKeys = [];
  }

  static get objectIdTest() {
    return {
      anyOf : [
        {
          type: 'string',
          pattern: '^[a-fA-F0-9]{24}$'
        },
        {type: 'null'}
      ]
    };
  }

  static get schemaProperties() {
    return {
      _id: Model.objectIdTest,
      updatedAt: {
        type: 'string',
        format: 'date-time'
      },
      createdAt: {
        type: 'string',
        format: 'date-time'
      }
    };
  };

  clone(obj) {
    if(null == obj || "object" != typeof obj) return obj;
    var copy = new obj.constructor();
    for(var attr in obj) {
      if(obj.hasOwnProperty(attr)) copy[attr] = obj[attr];
    }
    return copy;
  }

  async getCollection() {
    if(!this.collection) {
      await config.initialized;
      this.collection = await config.db.collection(this.collectionName);
    }
    return this.collection;
  }

  static async count(options) {
    return await this.newModel().count(options);
  }

  async count(options) {
    const collection = await this.getCollection();

    let query = {};
    if(options && options.query) {
      query = options.query;
    }

    return await collection.find(query).count();
  }

  static async list(options) {
    return await this.newModel().list(options);
  }


  async list(options = {}) {
    const collection = await this.getCollection();

    let query = {};
    if(options && options.query) {
      query = options.query;
    }

    const cursor = await collection.find(query);
    if(options) {
      if(options.limit) {
        cursor.limit(options.limit);
      }
      if(options.offset) {
        cursor.skip(options.offset);
      }
      if(options.orderBy) {
        cursor.sort(options.orderBy);
      }
    }
    const data = await cursor.toArray();

    options.exclude = [] || options.exclude;

    if(options.exclude.length > 0){
      for(let item of data){
        for(let exlude of options.exclude){
          delete item[exlcude];
        }
      }
    }

    return {
      list: data,
      offset: options.offset || 0,
      count: data.length,
      total: await cursor.count()
    }
  }

  static async create(data) {
    return await this.newModel().create(data);
  }

  async create(data) {
    this.setupSchema(data);
    const collection = await this.getCollection();

    const now = moment().toDate();
    data.updatedAt = now;
    data.createdAt = now;

    const value = await collection.insert(data, { w: 'majority' });
    this.updateData(value.ops[0]);
    await this.save();
    return this;
  }

  static newModel(){
    let newModel = new this;
    newModel.clearData();
    return newModel;
  }

  static async getById(id) {
    return await this.newModel().getById(id);
  }

  async getById(id, updateThis = false) {
    return await this.getByQuery({ _id: new ObjectID(id) }, updateThis);
  }

  static async getByQuery(query) {
    return await this.newModel().getByQuery(query);
  }

  async getByQuery(query, updateThis = false) {
    const collection = await this.getCollection();
    const data = await collection.findOne(query);
    if(!data) {
      throw new NotFoundError('Not Found');
    } else if (updateThis) {
      this.updateData(data);
      return this;
    } else {
      let newModel = new this.constructor(this.collectionName);
      newModel.clearData();
      newModel.collection = this.collection;
      newModel.updateData(data);
      return newModel;
    }
  }

  static async countByQuery(query) {
    return await this.newModel().countByQuery(query);
  }

  async countByQuery(query) {
    const collection = await this.getCollection();
    return await collection.find(query).count();
  }



  async updateById(id, data) {
    return await this.updateByQuery({ _id: new ObjectID(id) }, data, false);
  }

  async updateByQuery(query, data, upsert = true) {
    this.setupSchema(data);
    delete data._id;
    const collection = await this.getCollection();

    let value;
    const now = moment();
    if(data.$set || data.$addToSet || data.$unset) {
      if(data.$set){
        data.$set.updatedAt = now.toDate();
      } else {
        data.$set = {
          updatedAt: now.toDate()
        }
      }
      value = await collection.updateOne(query, data, { w: 'majority' });
    } else {
      data.updatedAt = now.toDate();
      value = await collection.updateOne(query, { $set: data }, { upsert: upsert, w: 'majority' });
    }

    if(value.result.ok) {
      return await this.getByQuery(query, true);
    }
  }

  setupSchema(data){
    if(this.validate && typeof this.validate === 'function' ) {
      let validate = this.validate;
      const valid = validate(JSON.parse(JSON.stringify(data)));
      if(!valid) {
        const message = validate.errors.map(error => {
          return error.dataPath + ': ' + error.message;
        }).join('\n');
        throw new InvalidDataError(message);
      }
    }
  }

  get validate() {
    if(this._validate) {
      return this._validate;
    }

    if(this.schema) {
      this.schema.properties = Object.assign(Model.schemaProperties, this.schema.properties);
      this._validate = ajv.compile(this.schema);
      return this._validate;
    }
    return;
  }

  async save(){
    return await this.updateById(this._id, this.raw);
  }

  async refresh() {
    return await this.getById(this._id, true);
  }

  async deleteById(id) {
    return await this.deleteByQuery({ _id: new ObjectID(id) });
  }

  async deleteByQuery(query) {
    const collection = await this.getCollection();
    return await collection.remove(query, true, { writeConcernt: { w: 'majority' } });
  }

  addDataKey(key) {
    this.dataKeys.push(key);
  }

  clearData(){
    for(let key of this.dataKeys){
      delete this[key];
    }
    this.dataKeys = [];
  }

  updateData(data) {
    Object.assign(this, data);
    this.dataKeys = this.dataKeys.concat(Object.keys(data));
  }

  get raw() {
    const rawObj = {};
    for(const key of this.dataKeys) {
      rawObj[key] = this[key];
    }
    return rawObj;
  }

  static toObjectId(idString) {
    return new ObjectID(idString);
  }

  static isObjectId(idString) {
    try {
      Model.toObjectId(idString);
      return true;
    } catch (e) {
      return false;
    }
  }
}


export async function initModel(ctx, next) {
  if(!model) {
    model = new Model();
  }
  await next();
}

export { Model };

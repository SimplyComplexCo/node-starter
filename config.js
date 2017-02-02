import convict from 'convict';
import fs from 'fs';
import path from 'path';

const config = convict ({
  env: {
    doc: 'The applicaton environment',
    format: ['production', 'development', 'test'],
    default: 'development',
    env: 'NODE_ENV',
    arg: "node-env",
  },
  server: {
    host: {
      doc: 'This server\'s host name',
      format: function dnsName(value) {
        if(!/^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(value) &&
           !/^(?:[A-F0-9]{1,4}:){7}[A-F0-9]{1,4}$/.test(value) &&
           !/^([a-z0-9]+(-[a-z0-9]+)*\.)+[a-z]{2,}$/.test(value) &&
           value !== 'localhost') {
          throw new Error('Must be a valid IPv4, IPv6 or hostname')
        }
      },
      default: 'localhost',
      env: 'SERVER_HOST'
    },
    port: {
      doc: "port to bind",
      format: 'port',
      default: 4000,
      env: 'SERVER_PORT'
    },
    key: {
      doc: "SSL key file",
      format: function filename(value) {
        if(!fs.readFileSync(value)){
          throw new Error('Must be a file path to an SSL key file');
        }
      },
      default: './localhost.key',
      env: 'SERVER_KEY'
    },
    crt: {
      doc: "SSL cert file",
      format: function filename(value) {
        if(!fs.readFileSync(value)){
          throw new Error('Must be a file path to an SSL cert file');
        }
      },
      default: './localhost.crt',
      env: 'SERVER_CERT'
    },
    sessionId: {
      doc: "Server session id key",
      format: String,
      default: 'location-server',
      env: 'SERVER_SESSION_ID'
    }
  },
  mongo: {
    url: {
      doc: 'MongoDB connection string',
      format: String,
      default: 'mongodb://localhost:27017/',
      env: 'MONGO_URL'
    },
    database: {
      doc: 'MongoDB database name',
      format: String,
      default: 'live-iot',
      env: 'MONGO_DB'
    }
  }
});

const env = config.get('env');
config.loadFile('./config/' + env + '.json');

config.validate({strict: true});

export default config;

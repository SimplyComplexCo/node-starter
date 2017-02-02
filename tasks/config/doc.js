import fs from 'fs';

import gulp from 'gulp';
import watch from 'gulp-watch';
import gutil from 'gulp-util';

import config from '../../config';
import pak from '../../package.json';

function parseConfigSchema(output, example, schema, depth) {
  const sections = [];
  const rootVals = [];

  for(const key in schema){
    const value = schema[key];
    if(!value.doc) {
      sections.push({key: key, value: value});
    } else {
      rootVals.push({key: key, value: value});
    }
  }

  if(rootVals.length > 0){
    output += '| config | env | arg | format | doc | default |\n';
    output += '|:------:|-----|-----|--------|-----|---------|\n';
  }

  for(const {key, value} of rootVals) {
    const arg = value.arg ? '--' + value.arg : '';
    const env = value.env ? value.env : '';
    let format;
    switch(typeof value.format) {
      case 'string':
        format = value.format;
        break;
      case 'function':
        format = value.format.name;
        break;
    }
    example[key] = value.default ? value.default : '⬆ see-format';
    output += `| ${escapeUnderscore(key)} | ${escapeUnderscore(env)} | ${escapeUnderscore(arg)} | ${format} | ${value.doc} | \`${value.default}\` |\n`;
  }

  for(const {key, value} of sections) {
    output += '\n' + '#'.repeat(depth) + ' Config Section for ' + key + '\n\n';
    const out = parseConfigSchema(output, {}, value, depth + 1);
    output = out.output;
    example[key] = out.example;
  }

  return {output: output, example: example};
}

function escapeUnderscore(str) {
  return str.replace(/_/g, "\\_")
}

function toMarkdown(name, document){
  let example = {};
  let output = `
# Config file documentation for **${name}**

Utilizes [node-convict](https://github.com/mozilla/node-convict) and is expecting overrides per env in config/\`env\`.json
  \n`;
  const out = parseConfigSchema(output, example, config._def, 2);
  out.output += `
# Example \`env\`.json

\`\`\`json
${JSON.stringify(out.example, null, '  ')}
\`\`\`
  `
  return out.output;
}

export default async function configDoc() {
  const configfile = 'dist/doc/config.md';

  await fs.writeFile(configfile, toMarkdown(pak.name, config._def));
  gutil.log(pak.name, 'Config document created at ' + gutil.colors.magenta(configfile));
  return;
}

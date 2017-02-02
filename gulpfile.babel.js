import fs from 'fs';
import path from 'path';
import mkdirp from 'mkdirp';

import gulp from 'gulp';
import nodemon from 'gulp-nodemon';
import gwatch from 'gulp-watch';
import gutil from 'gulp-util';

import config from './config';
import pak from './package.json';

import apiDoc from './tasks/api/doc';
import buildAssets from './tasks/build/assets';
import buildDocs from './tasks/build/docs';
import configDoc from './tasks/config/doc';


function getTaskName(root, file){
  const nonRooted = file.substring(root.length + 1);
  let taskName = '';
  if(nonRooted.indexOf('/') > -1) {
    taskName += path.dirname(nonRooted).split('/').join(':') + ':';
  }
  taskName += path.basename(file, '.js');
  return taskName;
}

function walk(root, dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  for(const item of list) {
    const file = path.resolve(dir, item);
    const stat = fs.statSync(file);
    if(stat && stat.isDirectory()) {
      results = results.concat(walk(root, file));
    } else {
      results.push({taskname: getTaskName(root, file), file: file});
    }
  }
  return results;
}

const taskSet = walk(path.join(__dirname, 'tasks'), path.join(__dirname, 'tasks'));
for(const task of taskSet) {
  gutil.log('Adding task ' + gutil.colors.blue(task.taskname));
  gulp.task(task.taskname, require(task.file).default);
}

export function runNodemon() {
  nodemon({
    script: 'index',
    ignore: ['dist']
  }).on('restart');
}

export function watch(done) {
  gulp.watch('src/**/*.js', gulp.series(apiDoc));
  gulp.watch(['config.js', 'config/**/*.json'], gulp.series(configDoc));
  gulp.watch(['assets/**/*'], gulp.series(buildAssets));
  gulp.watch(['docs/**/*'], gulp.series(buildDocs));
  done();
}

export function setup(done){
  mkdirp(path.join(__dirname, 'dist', 'doc'), error => {
    if(error) {
      throw error;
    }
    done();
  });
}

const serve = gulp.series(runNodemon);
const build = gulp.parallel(apiDoc, configDoc, buildDocs, buildAssets);
const dev = gulp.series(setup, build, watch, serve);

const dist = gulp.series(setup, build);

export { serve, apiDoc, configDoc, buildDocs, buildAssets, dist};
export default dev;

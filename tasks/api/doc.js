import gulp from 'gulp';
import apidoc from 'apidoc';
import gutil from 'gulp-util';

import pak from '../../package.json';

export default function apiDoc(done){
  var chunk = apidoc.createDoc({
    src: 'src/',
    dest: 'dist/doc/api',
    config: './',
    includeFilters: [ '.*\\.js$', '' ]
  });

  if(chunk !== false && chunk.project) {
    gutil.log(pak.name, gutil.colors.green('Apidoc created...   [  '+ gutil.colors.cyan(JSON.parse(chunk.project).name) +'  ] '));
  }
  done();
}

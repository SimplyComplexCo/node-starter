import gulp from 'gulp';
import mocha from 'gulp-mocha';

export default function(){
  return gulp.src('test/**/*.spec.js', {read: false})
    .pipe(mocha({reporter: 'spec'}))
}

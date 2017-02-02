import gulp from 'gulp';
import mocha from 'gulp-mocha';
import istanbul from 'gulp-babel-istanbul';

export default function(done){
  gulp.src('src/**/*.js')
    .pipe(istanbul({
      includeUntested: true
    }))
    .pipe(istanbul.hookRequire())
    .on('finish', () => {
      gulp.src('test/**/*.spec.js', {read: false})
        .pipe(mocha({reporter: 'spec'}))
        .pipe(istanbul.writeReports({
          reporters: ['html', 'json', 'text', 'text-summary']
        }))
        // .pipe(istanbul.enforceThresholds({thresholds: {global: 85}}))
        .on('end', done)
    });
}

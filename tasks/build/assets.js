import gulp from 'gulp';

export default function buildAssets(){
  return gulp.src('assets/**/*')
    .pipe(gulp.dest('dist/doc/assets/'));
}

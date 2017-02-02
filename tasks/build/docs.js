import gulp from 'gulp';

export default function buildDocs(){
  return gulp.src('docs/**/*')
    .pipe(gulp.dest('dist/doc/'));
}

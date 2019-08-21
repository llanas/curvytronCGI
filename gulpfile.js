var fs        = require('fs'),
    gulp      = require('gulp'),
    concat    = require('gulp-concat'),
    uglify    = require('gulp-uglify'),
    header    = require('gulp-header'),
    jshint    = require('gulp-jshint'),
    sass      = require('gulp-sass'),
    rename    = require('gulp-rename'),
    plumber   = require('gulp-plumber'),
    gutil     = require('gulp-util'),
    cleanCss  = require('gulp-clean-css'),
    htmlmin   = require('gulp-htmlmin'),
    replace   = require('gulp-replace'),
    wrap      = require('gulp-wrap'),
    meta      = require('./package.json'),
    config;

    try {
        config = require('./config.json');
    } catch (error) {
        config = { googleAnalyticsId: null }
    }

    var jsDir   = './web/js/',
        cssDir  = './web/css/',
        sassDir = './src/sass/',
        expose  = [],
        dependencies = [
            './bower_components/angular/angular.js',
            './bower_components/angular-route/angular-route.js',
            './bower_components/angular-cookies/angular-cookies.js',
            './bower_components/angular-bootstrap-colorpicker/js/bootstrap-colorpicker-module.js',
            './bower_components/createjs-soundjs/lib/soundjs-0.6.1.min.js',
            './bower_components/tom32i-event-emitter.js/dist/event-emitter.min.js',
            './bower_components/tom32i-option-resolver.js/dist/option-resolver.min.js',
            './bower_components/tom32i-gamepad.js/dist/gamepad.src.js',
            './bower_components/tom32i-key-mapper.js/dist/key-mapper.src.js',
            './bower_components/tom32i-asset-loader.js/dist/asset-loader.min.js'
        ],
        recipes = {
            server: require('./recipes/server.json'),
            client: require('./recipes/client.json')
        },
        banner = [
          '/*!',
          ' * <%= name %> <%= version %>',
          ' * <%= homepage %>',
          ' * <%= license %>',
          ' */\n\n'
        ].join('\n');

var onError = function (err) {
    gutil.beep();
    console.log(err.toString());
    this.emit('end');
}

function jshintFull() {
    return gulp.src('src/**/*.js')
        .pipe(jshint())
        .pipe(jshint.reporter('default'));
}

function frontExpose() {
    for (var i = expose.length - 1; i >= 0; i--) {
        gulp.src(expose[i]).pipe(gulp.dest(recipes.client.path));
    }

    return gulp.src(dependencies)
        .pipe(concat('dependencies.js'))
        .pipe(uglify())
        .pipe(gulp.dest(recipes.client.path));
}

function frontFull() {
    return gulp.src(recipes.client.files)
        .pipe(concat(recipes.client.name))
        .pipe(wrap('(function(){\n"use strict";\n<%= contents %>\n})();'))
        .pipe(header(banner, meta))
        .pipe(gulp.dest(recipes.client.path));
}

function frontMin() {
    return gulp.src(recipes.client.files)
        .pipe(concat(recipes.client.name))
        .pipe(uglify())
        .pipe(wrap('(function(){\n"use strict";\n<%= contents %>\n})();'))
        .pipe(header(banner, meta))
        .pipe(gulp.dest(recipes.client.path));
}

function ga() {
    var source = gulp.src('./src/client/views/index.html');

    if (typeof(config.googleAnalyticsId) !== 'undefined' && config.googleAnalyticsId) {
        var tag = fs.readFileSync('./src/client/views/google.analytics.html').toString()
            .replace('GoogleAnalyticsToken', config.googleAnalyticsId);

        source.pipe(replace('<!-- Google Analytics -->', tag));
    }

    return source
        .pipe(htmlmin({collapseWhitespace: true}))
        .pipe(gulp.dest('./web'));
}

function views() {
    return gulp.src('src/client/views/*/**/*.html')
        .pipe(htmlmin({collapseWhitespace: true}))
        .pipe(gulp.dest(jsDir + 'views'));
}

function server() {
    return gulp.src(recipes.server.files)
        .pipe(concat(recipes.server.name))
        .pipe(gulp.dest(recipes.server.path));
}

function sassFull() {
    return gulp.src(sassDir + 'style.scss')
        .pipe(plumber({ errorHandler: onError }))
        .pipe(sass())
        .pipe(rename('style.css'))
        .pipe(gulp.dest(cssDir));
}

async function sassMin() {
    return gulp.src(sassDir + 'style.scss')
        .pipe(sass().on('error', sass.logError))
        .pipe(rename('style.css'))
        .pipe(gulp.dest(cssDir));
}

function copyStressTest() {
    return gulp.src('src/client/stressTest.js')
        .pipe(gulp.dest(recipes.client.path));
}

function watchFiles() {
    gulp.watch('src/shared/**/*.js', gulp.parallel(jshintFull, server, frontFull));
    gulp.watch('src/client/**/*.js', gulp.parallel(jshintFull, frontFull));
    gulp.watch('src/server/**/*.js', gulp.parallel(jshintFull, server));
    gulp.watch('src/client/views/*/*.html', views);
    gulp.watch('src/client/views/*.html', ga);
    gulp.watch('src/client/stressTest.js', copyStressTest);
    gulp.watch('src/sass/**/*.scss', sassFull);
    done();
}

const bundle = gulp.parallel(jshintFull, server, frontExpose, ga, views, frontMin, sassMin);
const dev = gulp.parallel(jshintFull, server, frontExpose, copyStressTest, ga, views, frontFull, sassFull);

const watch = gulp.series(dev, watchFiles);

exports.bundle = bundle;
exports.dev = dev;
exports.watch = watch;

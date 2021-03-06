"use strict";

var es        = require('event-stream'),
    through   = require('through'),
    gutil     = require('gulp-util'),
    crypto    = require('crypto'),
    path      = require('path'),
    lineBreak = '\n';

function manifest(options) {
  options = options || {};
  var contents = [];
  contents.push('CACHE MANIFEST');

  var filename = options.filename || 'app.manifest';
  var exclude = [].concat(options.exclude || []);
  var hasher = crypto.createHash('sha256');

  if (options.timestamp) {
    contents.push('# Time: ' + new Date());
  }

  if (options.revision) {
    contents.push('# Revision: ' + options.revision);
  }

  contents.push(lineBreak);
  contents.push('CACHE:');

  if (options.cache) {
    options.cache.forEach(function (file) {
      contents.push(encodeURI(file));
    });
  }

  function writeToManifest(file) {
    if (file.isNull())   return;
    if (file.isStream()) return this.emit('error', new gutil.PluginError('gulp-manifest',  'Streaming not supported'));

    if (exclude.indexOf(file.relative) >= 0) {
      return;
    }

    if (options.reemit) {
      this.emit('data', file);
    }

    contents.push(encodeURI(file.relative));

    if (options.hash) {
      hasher.update(file.contents, 'binary');
    }
  }

  function endStream() {
    // Network section
    options.network = options.network || ['*'];
    contents.push(lineBreak);
    contents.push('NETWORK:');
    options.network.forEach(function (file) {
      contents.push(encodeURI(file));
    });

    // Fallback section
    if (options.fallback) {
      contents.push(lineBreak);
      contents.push('FALLBACK:');
      options.fallback.forEach(function (file) {
        contents.push(encodeURI(file));
      });
    }

    // Settings section
    if (options.preferOnline) {
      contents.push(lineBreak);
      contents.push('SETTINGS:');
      contents.push('prefer-online');
    }

    // output hash to cache manifest
    if (options.hash) {
      contents.push('\n# hash: ' + hasher.digest("hex"));
    }

    var cwd = process.cwd();
    var manifestFile = new gutil.File({
      cwd: cwd,
      base: cwd,
      path: path.join(cwd, filename),
      contents: new Buffer(contents.join(lineBreak)),
    });

    this.emit('data', manifestFile);
    this.emit('end');
  }

  return through(writeToManifest, endStream);
}

module.exports = manifest;

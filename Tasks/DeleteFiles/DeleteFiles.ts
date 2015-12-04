/// <reference path="../../definitions/node.d.ts"/>
/// <reference path="../../definitions/Q.d.ts" />
/// <reference path="../../definitions/vso-task-lib.d.ts" />

import path = require('path');
import fs = require('fs');
import os = require('os');
import Q = require('q');
var tl = require('vso-task-lib');

// contents is a multiline input containing glob patterns
var contents: string[] = tl.getDelimitedInput('Contents', '\n');
var sourceFolder = tl.getPathInput('SourceFolder');

// include filter
var includeContents = [];

// exclude filter
var excludeContents = [];

for (var i = 0; i < contents.length; i++) {
    var pattern = contents[i].trim();
    tl.debug('include content pattern: ' + pattern);
    var realPattern = path.join(sourceFolder, pattern);
    includeContents.push(realPattern);        
}

// enumerate all files
var files = [];
var allPaths = tl.find(sourceFolder);
tl.debug('allPaths: ' + allPaths);
if (allPaths.length === 0) {
    tl.debug('source folder not found. nothing to delete.');
}

var allFiles: string[] = [];
var allFolders: string[] = [];

// folders should be deleted last
for (var i = 0; i < allPaths.length; i++) {
    tl.debug("checking for directory: " + allPaths[i]);
    if (!tl.stats(allPaths[i]).isDirectory()) {
        allFiles.push(allPaths[i]);
    }
    else {
        allFolders.push(allPaths[i]);
    }
}
allFiles = allFiles.concat(allFolders);

if (includeContents && allFiles && includeContents.length > 0 && allFiles.length > 0) {
    tl.debug("allFiles contains " + allFiles.length + " files");
    // a map to eliminate duplicates
    var map = {};
    // minimatch options
    var matchOptions = { matchBase: true };
    if (os.type().match(/^Win/)) {
        matchOptions["nocase"] = true;
    }
    // apply include filter
    for (var i = 0; i < includeContents.length; i++) {
        var pattern: string = includeContents[i];
        tl.debug('Include matching: ' + pattern);
        // let minimatch do the actual filtering
        var matches = tl.match(allFiles, pattern, matchOptions);
        tl.debug('Include matched ' + matches.length + ' files');
        for (var j = 0; j < matches.length; j++) {
            var matchPath = matches[j];
            if (!map.hasOwnProperty(matchPath)) {
                map[matchPath] = true;
                files.push(matchPath);
            }
        }
    }
}
else {
    tl.debug("Either includeContents or allFiles is empty");
}

// try to delete all files/folders, even if one errs
var errorHappened: boolean = false;
for (var i: number = 0; i < files.length; i++){
    try {
        tl.debug("trying to delete: " + files[i]);
        tl.rmRF(files[i]);
    }
    catch (err) {
        tl.error(err);
        errorHappened = true;
    }
}

if (errorHappened) {
    tl.setResult(1, "Couldn't delete one or more files", true);
}
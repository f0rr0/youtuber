'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; }; //import readjson from 'readjson';


var _googleapis = require('googleapis');

var _googleapis2 = _interopRequireDefault(_googleapis);

var _fastLevenshtein = require('fast-levenshtein');

var _fastLevenshtein2 = _interopRequireDefault(_fastLevenshtein);

var _unidecode = require('unidecode');

var _unidecode2 = _interopRequireDefault(_unidecode);

var _ramda = require('ramda');

var _ramda2 = _interopRequireDefault(_ramda);

var _memoize = require('async/memoize');

var _memoize2 = _interopRequireDefault(_memoize);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var youtube = _googleapis2.default.youtube('v3');

//const { api_key } = readjson.sync('./secrets/youtube-config.json');

var youtuber = _ramda2.default.curry(function (api_key, fn, track) {

  var getParams = function getParams(api_key, track) {
    var title = track.title;
    var artist = track.artist;

    return {

      key: api_key,
      part: 'snippet',
      maxResults: 5,
      q: title + ' ' + artist,
      type: 'video'

    };
  };

  var callback = _ramda2.default.curry(function (fn, err, result) {

    if (err) {
      fn(err, null);
    } else if (result) {
      fn(null, result);
    }
  });

  var sanitize = function sanitize(str) {

    if (str) {

      var restricted = /[^\&\$\*\.'a-zA-Z 0-9]+/g;
      var removeFt = /featuring|feat\.?|ft\.?/g;
      return (0, _unidecode2.default)(str.toLowerCase()).replace(restricted, ' ').replace(removeFt, ' ').split(/\s+/).join(' ');
    } else return str;
  };

  var leven = _ramda2.default.curry(function (fn, track, err, result) {

    if (err) {

      fn(err, track);
    } else if (result) {
      (function () {

        var getItems = _ramda2.default.pathOr([], ['items']);
        var getVideoTitles = _ramda2.default.map(_ramda2.default.pathOr([], ['snippet', 'title']));

        var getVideoId = _ramda2.default.pathOr(undefined, ['id', 'videoId']);
        var getThumbs = _ramda2.default.pathOr(undefined, ['snippet', 'thumbnails']);

        var getDistance = _ramda2.default.curry(function (track, videoTitle) {
          var q_title = track.title;
          var q_artist = track.artist;


          q_title = sanitize(q_title);
          q_artist = sanitize(q_artist);
          videoTitle = sanitize(videoTitle);
          var d1 = _fastLevenshtein2.default.get(q_title + ' ' + q_artist, videoTitle);
          var d2 = _fastLevenshtein2.default.get(q_artist + ' ' + q_title, videoTitle);
          return d1 > d2 ? d2 : d1;
        });

        var distances = _ramda2.default.map(getDistance(track), getVideoTitles(getItems(result)));

        var addDistanceToItem = function addDistanceToItem(distance, item) {
          return _extends({}, item, {
            levenshtein_distance: distance
          });
        };

        var zippedItems = _ramda2.default.zipWith(addDistanceToItem, distances, getItems(result));

        var sortedItems = _ramda2.default.sortBy(_ramda2.default.prop("levenshtein_distance"), zippedItems);

        var youtubeLink = function youtubeLink(sortedItems) {

          if (getVideoId(_ramda2.default.head(sortedItems))) {
            return 'https://www.youtube.com/watch?v=' + getVideoId(_ramda2.default.head(sortedItems));
          } else return undefined;
        };

        var youtubeMetaData = {
          youtube_images: getThumbs(_ramda2.default.head(sortedItems)),
          youtube_link: youtubeLink(sortedItems)
        };

        // cache.setTrack(track, youtubeMetaData);

        var youtubedTrack = _extends({}, track, youtubeMetaData);

        fn(null, youtubedTrack);

        // //Before
        // console.log("Before\n");
        // console.log(getTitles(getItems(result)));
        // console.log(R.map(getDistance, getTitles(getItems(result))));
        //
        // //After
        // console.log("\nAfter\n");
        // console.log(getTitles(sortedItems));
        // console.log(R.map(getDistance, getTitles(sortedItems)));
      })();
    }
  });

  youtube.search.list(getParams(api_key, track), callback(leven(fn, track)));
});

// const callback = (err, track) => {
//   console.log(track);
// };
// const random_track = {
//  title: "R U Mine?",
//  artist: "Arctic Monkeys"
// };
// youtuber(api_key, callback, random_track);

exports.default = youtuber;

// Before
//
// [ 'Chillwave: The Lighthouse and The Whaler - Venice (Adam Snow bootleg) [Free Download]',
//   'The Lighthouse and The Whaler - Venice (Adam Snow bootleg)',
//   'The Lighthouse and The Whaler - Venice (Adam Snow bootleg)',
//   'The Lighthouse & The Whaler - Venice (Adam Snow Remix)',
//   'The Lighthouse and The Whaler - Venice (Adam Snow Bootleg)' ]
// [ 24, 0, 0, 10, 0 ]
//
// After
//
// [ 'The Lighthouse and The Whaler - Venice (Adam Snow bootleg)',
//   'The Lighthouse and The Whaler - Venice (Adam Snow bootleg)',
//   'The Lighthouse and The Whaler - Venice (Adam Snow Bootleg)',
//   'The Lighthouse & The Whaler - Venice (Adam Snow Remix)',
//   'Chillwave: The Lighthouse and The Whaler - Venice (Adam Snow bootleg) [Free Download]' ]
// [ 0, 0, 0, 10, 24 ]

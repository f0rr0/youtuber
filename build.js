'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _readjson = require('readjson');

var _readjson2 = _interopRequireDefault(_readjson);

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

var _readjson$sync = _readjson2.default.sync('./secrets/youtube-config.json');

var api_key = _readjson$sync.api_key;


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

// const track = {
//   artist: "The Lighthouse And The Whaler",
//   title: "Venice(Adam Snow Bootleg)"
// }

var callback = function callback(err, track) {
  console.log(track);
};
var random_track = {
  title: "R U Mine?",
  artist: "Arctic Monkeys"
};
youtuber(api_key, callback, random_track);

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

// sample raw result from youtube api.
// {
//   "kind": "youtube#searchListResponse",
//   "etag": "\"zekp1FB4kTkkM-rWc1qIAAt-BWc/-TNFC5R_8ceecS8vSMUDJRykR4Q\"",
//   "nextPageToken": "CAEQAA",
//   "regionCode": "US",
//   "pageInfo": {
//     "totalResults": 274662,
//     "resultsPerPage": 1
//   },
//   "items": [
//     {
//       "kind": "youtube#searchResult",
//       "etag": "\"zekp1FB4kTkkM-rWc1qIAAt-BWc/0Sx_jv4V8njnvMcMTSH1iq-SVxA\"",
//       "id": {
//         "kind": "youtube#video",
//         "videoId": "09R8_2nJtjg"
//       },
//       "snippet": {
//         "publishedAt": "2015-01-14T15:00:11.000Z",
//         "channelId": "UCN1hnUccO4FD5WfM7ithXaw",
//         "title": "Maroon 5 - Sugar",
//         "description": "Buy Sugar on iTunes: http://smarturl.it/M5V Catch Maroon 5 on tour all year long at www.maroon5.com Music video by Maroon 5 performing Sugar. (C) 2015 ...",
//         "thumbnails": {
//           "default": {
//             "url": "https://i.ytimg.com/vi/09R8_2nJtjg/default.jpg",
//             "width": 120,
//             "height": 90
//           },
//           "medium": {
//             "url": "https://i.ytimg.com/vi/09R8_2nJtjg/mqdefault.jpg",
//             "width": 320,
//             "height": 180
//           },
//           "high": {
//             "url": "https://i.ytimg.com/vi/09R8_2nJtjg/hqdefault.jpg",
//             "width": 480,
//             "height": 360
//           }
//         },
//         "channelTitle": "Maroon5VEVO",
//         "liveBroadcastContent": "none"
//       }
//     }
//   ]
// }

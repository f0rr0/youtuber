// import readjson from 'readjson';
import google from 'googleapis';
import levenshtein from 'fast-levenshtein';
import unidecode from 'unidecode';
import R from 'ramda';

const youtube = google.youtube('v3');

// const { api_key } = readjson.sync('./secrets/youtube-config.json');

const youtuber = R.curry((api_key, fn, track) => {

  const { title, artist } = track;

  const params = {

    key: api_key,
    part: 'snippet',
    maxResults: 5,
    q: `${title} ${artist}`,
    type: 'video'

  };

  const callback = R.curry((fn, err, result) => {

    if (err) {
      fn(err, null);
    } else if (result) {
      fn(null, result);
    }

  });

  const sanitize = (str) => {

    if (str) {

      const restricted = /[^\&\$\*\.'a-zA-Z 0-9]+/g;
      const removeFt = /featuring|feat\.?|ft\.?/g;
      return unidecode(str.toLowerCase()).replace(restricted, ' ').replace(removeFt, ' ').split(/\s+/).join(' ');

    }

    else return str;

  };

  const leven = R.curry((fn, track, err, result) => {

    if (err) {

      fn(err, track);

    }

    else if (result) {

      const getItems = R.pathOr([], ['items']);
      const getVideoTitles = R.map(R.pathOr([], ['snippet', 'title']));

      const getVideoId = R.pathOr(undefined, ['id', 'videoId']);
      const getThumbs = R.pathOr(undefined, ['snippet', 'thumbnails']);

      const getDistance = R.curry((track, videoTitle) => {

        let { title: q_title, artist: q_artist } = track;

        q_title = sanitize(q_title);
        q_artist = sanitize(q_artist);
        videoTitle = sanitize(videoTitle);
        const d1 = levenshtein.get(`${q_title} ${q_artist}`, videoTitle);
        const d2 = levenshtein.get(`${q_artist} ${q_title}`, videoTitle);
        return d1 > d2 ? d2 : d1;

      });

      const distances = R.map(getDistance(track), getVideoTitles(getItems(result)));

      const addDistanceToItem = (distance, item) => {
        return {
          ...item,
          levenshtein_distance: distance
        };
      };

      const zippedItems = R.zipWith(addDistanceToItem, distances, getItems(result));

      const sortedItems = R.sortBy(R.prop("levenshtein_distance"), zippedItems);

      const youtubeLink = (sortedItems) => {

        if (getVideoId(R.head(sortedItems))) {
          return `https://www.youtube.com/watch?v=${getVideoId(R.head(sortedItems))}`;
        }
        else return undefined;

      }

      const youtubedTrack = {

        ...track,
        youtube_images: getThumbs(R.head(sortedItems)),
        youtube_link: youtubeLink(sortedItems)

      };

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

    }
  });

  youtube.search.list(params, callback(leven(fn, track)));

});


// const track = {
//   artist: "The Lighthouse And The Whaler",
//   title: "Venice(Adam Snow Bootleg)"
// }

// youtuber(api_key, (track) => { console.log(track) }, track);

export default youtuber;

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

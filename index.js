//import readjson from 'readjson';
import google from 'googleapis';
import levenshtein from 'fast-levenshtein';
import unidecode from 'unidecode';
import R from 'ramda';
import memoize from 'async/memoize'

const youtube = google.youtube('v3');

//const { api_key } = readjson.sync('./secrets/youtube-config.json');

const youtuber = R.curry((api_key, fn, track) => {

  const getParams = (api_key, track) => {
    const { title, artist } = track;
    return {

      key: api_key,
      part: 'snippet',
      maxResults: 5,
      q: `${title} ${artist}`,
      type: 'video'

    };
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

      const youtubeMetaData = {
        youtube_images: getThumbs(R.head(sortedItems)),
        youtube_link: youtubeLink(sortedItems)
      }

      // cache.setTrack(track, youtubeMetaData);

      const youtubedTrack = {
        ...track,
        ...youtubeMetaData
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

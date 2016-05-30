## YouTuber
Search Youtube for songs based on title and artist. Get the best match based on Levenshtein distances.

### Usage
```
npm i -S youtuber
```

The module exports a default curried function that takes 3 arguments namely: `api_key` string, the `callback` function and a `track` object with at least two keys (`title` and `artist`). The callback function is passed two arguments namely: `err` (if any or null) and the `youtubed track` (if successful or the track as is). The youtubed track has two new keys namely the `youtube_link` and the `youtube_images` object.

```javascript
import youtuber from 'youtuber';

const client = youtuber('YOUR_API_KEY');

const random_track = {
 title: "R U Mine?",
 artist: "Arctic Monkeys"
};

const log = (err, track) => {
 if (err) {
  console.error(err);
 }
 else console.log(track);
};

client(log, random_track);

// { title: 'R U Mine?',
//   artist: 'Arctic Monkeys',
//   youtube_images:
//    { default:
//       { url: 'https://i.ytimg.com/vi/ngzC_8zqInk/default.jpg',
//         width: 120,
//         height: 90 },
//      medium:
//       { url: 'https://i.ytimg.com/vi/ngzC_8zqInk/mqdefault.jpg',
//         width: 320,
//         height: 180 },
//      high:
//       { url: 'https://i.ytimg.com/vi/ngzC_8zqInk/hqdefault.jpg',
//         width: 480,
//         height: 360 } },
//   youtube_link: 'https://www.youtube.com/watch?v=ngzC_8zqInk'
// }

```

### Do listen to the [](https://www.youtube.com/watch?v=ngzC_8zqInk)

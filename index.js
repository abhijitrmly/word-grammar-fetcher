/* eslint-disable no-undef */
/* eslint-disable no-cond-assign */
require('dotenv').config();

const needle = require('needle');

const fileUrl = 'http://norvig.com/big.txt';
const APIkey = process.env.YANDEX_API_KEY;

/**
 * @method getWordDataFromApi fetches grammar data from Yandex
 * @param {string} word is passed to API
 */
const getWordDataFromApi = (word) => new Promise((resolve) => needle.get(`https://dictionary.yandex.net/api/v1/dicservice.json/lookup?key=${APIkey}&lang=en-en&text=${word}`, (error, response) => {
  if (error) throw error;
  const { body = {} } = response;
  const { def = [] } = body;

  let posWords = '';
  let synonyms = '';

  // the structure for response contains pos at object level with synonyms nested inside
  def.forEach(
    (apiResponseElement) => {
      const { pos, tr = [] } = apiResponseElement;
      posWords = posWords.concat(posWords.length > 0 ? (`/${pos}`) : pos);

      tr.forEach(
        (trObject) => {
          const { text: trObjectText = '' } = trObject;
          synonyms = synonyms.concat(synonyms.length > 0 ? (`/${trObjectText}`) : trObjectText);
        },
      );
    },
  );
  return resolve({ word, posWords, synonyms });
}));

/**
 * @method main reads book given in link and calculates word occurences
 */
const main = async () => {
  // map is used as it is better suited for large data
  // (faster get/set methods as compared to objects)
  const wordCount = new Map();
  // create stream for the file
  const stream = needle.get(fileUrl);

  // data is read as part of a stream and word counts are updated
  stream.on('readable', function processStreamData() {
    while (data = this.read()) {
      // add word to counter
      data.toString().replace(/[^\w\s]/g, '').split(/\s+/).forEach((word) => {
        const currValue = wordCount.get(word);
        if (currValue) {
          wordCount.set(word, currValue + 1);
        } else {
          wordCount.set(word, 1);
        }
      });
    }
  });

  // after data is processed completely,
  stream.on('done', async (err) => {
    if (!err) {
      const sortedMap = new Map([...wordCount.entries()].sort((a, b) => b[1] - a[1]));

      const promises = [];

      const sortedMapEntries = [...sortedMap.entries()].map((entry) => entry[0]);
      // eslint-disable-next-line no-plusplus
      for (let i = 0; i < 10; i++) {
        (() => {
          promises.push(getWordDataFromApi(sortedMapEntries[i]));
        })();
      }

      // get word grammar from Yandex api
      const response = await Promise.all([...promises]);

      const responseInJsonFormat = {};
      response.forEach(
        (res) => {
          const { word, posWords, synonyms } = res;
          responseInJsonFormat[word] = {
            posWords,
            synonyms,
            occurence: wordCount.get(word),
          };
        },
      );

      console.log('responseInJsonFormat', responseInJsonFormat);
    }
  });
};

main();

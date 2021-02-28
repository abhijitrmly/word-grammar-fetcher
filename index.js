/* eslint-disable no-undef */
/* eslint-disable no-cond-assign */
require('dotenv').config();

const needle = require('needle');

const fileUrl = 'http://norvig.com/big.txt';
const APIkey = process.env.YANDEX_API_KEY;

const getWordDataFromApi = (word) => new Promise((resolve) => needle.get(`https://dictionary.yandex.net/api/v1/dicservice.json/lookup?key=${APIkey}&lang=en-en&text=${word}`, (error, response) => {
  if (error) throw error;
  const { body = {} } = response;
  const { def = [] } = body;

  let posWords = '';
  let synonyms = '';

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

const main = async () => {
  const wordCount = new Map();
  const stream = needle.get(fileUrl);

  stream.on('readable', function processStreamData() {
    while (data = this.read()) {
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

  stream.on('done', async (err) => {
    if (!err) {
      const m2 = new Map([...wordCount.entries()].sort((a, b) => b[1] - a[1]));

      const promises = [];

      const sortedMapEntries = [...m2.entries()].map((entry) => entry[0]);
      // eslint-disable-next-line no-plusplus
      for (let i = 0; i < 10; i++) {
        (() => {
          promises.push(getWordDataFromApi(sortedMapEntries[i]));
        })();
      }

      const response = await Promise.all([...promises]);
      const mergedResponse = response.map(
        (res) => {
          const { word, posWords, synonyms } = res;
          return ({
            [word]: {
              posWords,
              synonyms,
              occurence: wordCount.get(word),
            },
          });
        },
      );

      console.log('response', mergedResponse);
    }
  });
};

main();

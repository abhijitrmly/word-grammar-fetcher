const needle = require('needle');

const fileUrl = 'http://norvig.com/big.txt';
const APIkey = 'dict.1.1.20210216T114936Z.e4989dccd61b9626.373cddfbfb8a3b2ff30a03392b4e0b076f14cff9';

const getWordDataFromApi = (word) => new Promise((resolve) => needle.get(`https://dictionary.yandex.net/api/v1/dicservice.json/lookup?key=${APIkey}&lang=en-en&text=${word}`, function(error, response) {
  if (error) throw error;
  const { body = {} } = response;
  const { def = [] } = body;

  let posWords = '';
  let synonyms = '';

  def.forEach(
    apiResponseElement => {
      const { pos, tr = [] } = apiResponseElement;
      posWords = posWords.concat(posWords.length > 0 ? ("/" + pos) : pos);

      tr.forEach(
        trObject => {
          const { text: trObjectText = '' } = trObject;
          synonyms = synonyms.concat(synonyms.length > 0 ? ("/" + trObjectText) : trObjectText)
        },
      )
    },
  )
  return resolve({word,  posWords, synonyms });
}))


const main = async () => {
  let wordCount = new Map();
  const stream = needle.get(fileUrl);

  stream.on('readable', function() {
    while (data = this.read()) {
      data.toString().replace(/[^\w\s]/g, "").split(/\s+/).map((word) => {
        const currValue = wordCount.get(word);
        if (currValue) {
          wordCount.set(word, currValue + 1);
        } else {
          wordCount.set(word, 1);
        }
      });
    }
  })

  stream.on('done', async (err) => {
  // if our request had an error, our 'done' event will tell us.
    if (!err) {
      let m2= new Map([...wordCount.entries()].sort((a,b) => b[1] - a[1]));

      let promises = [];

      let sortedMapEntries = [...m2.entries()].map(entry => entry[0]);
      for (let i = 0; i < 10; i++) {
        (() => {
          promises.push(getWordDataFromApi(sortedMapEntries[i]));
        })()
      }

      const response = await Promise.all([...promises]);
      const mergedResponse = response.map(
        res => {
          const { word, posWords, synonyms } = res;
          return ({
            [word]: {
              posWords,
              synonyms,
              occurence: wordCount.get(word),
            },
          })
        },
      )

      console.log('response', mergedResponse);
    }
  })

}

main();

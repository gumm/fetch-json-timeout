import assert from 'assert';
import fetchJson from '../main.js';
import {promises as fs} from "fs";

// README:
// -----------------------------------------------------------------------------
// Replace JWTObj.json with an equivalent object with your
// JWT credentials and info.
// For ease of testing, you can add two fields to this object that defines the
// test URLs to use for JWT token testing, and the expected response from that
// endpoint.
//  "testUrl": "https://some.test.endpoint/api/get_data/",
//  "expectedResponse": { "here": [ "is", "your", "response" ] }
// -----------------------------------------------------------------------------


const jwtPrefFilePath = new URL('./JWTObj.json', import.meta.url);
const getJWTPrefObj = async () => {
  return fs.readFile(jwtPrefFilePath, 'binary')
      .then(JSON.parse)
      .catch(e => {
        console.error('ERROR reading JWT pref obj: ', e);
        return {}
      });
};


describe('Init a fetcher with token payload', () => {

  it('promise resolves with payload', async () => {
    const jwtOpts = await getJWTPrefObj();
    const url = jwtOpts.uri;
    const expected = jwtOpts.expectedResponse;

    const fetcher = await fetchJson(undefined, undefined, jwtOpts);
    const data = await fetcher('GET', url);
    assert.deepEqual(data, expected);
  });

  it('callback resolves with payload', async () => {
    const jwtOpts = await getJWTPrefObj();
    const url = jwtOpts.testUrl;
    const expected = jwtOpts.expectedResponse;

    const fetcher = await fetchJson(undefined, undefined, jwtOpts);
    fetcher('GET', url, undefined, data => {
      console.log("Here us your data -> ", data);
      assert.deepEqual(data, expected);
    });
  });
});

describe('Init a fetcher without credentials', () => {
  const url = 'https://jsonplaceholder.typicode.com/todos/1';

  it('promise resolves with payload', async () => {
    const fetcher = await fetchJson();
    const data = await fetcher('GET', url);
    console.log(data);
  });

  it('callback resolves with payload', async () => {
    const fetcher = await fetchJson();
    fetcher('GET', url, undefined, console.log);
  });

  it('failure is an option', async () => {
    const fetcher = await fetchJson();
    fetcher('GET', 'https://this.wont.resolve', 5000).then(console.log);
  });

});


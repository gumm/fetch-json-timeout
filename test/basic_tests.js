import assert from 'assert';
import fetchJson, {TimeoutError, HttpError, NetworkError} from '../main.js';
import {promises as fs} from "fs";

// README:
// -----------------------------------------------------------------------------
// Replace JWTObj.json with an equivalent object with your
// JWT credentials and info.
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

  it('immediate authenticated fetch returns data', async () => {
    const jwtOpts = await getJWTPrefObj();
    const fetcher = await fetchJson(undefined, undefined, jwtOpts);
    const data = await fetcher('GET', 'http://127.0.0.1:8000/api/v3/members/memberships/');
    assert.ok(data, 'Expected a response');
    assert.ok(Array.isArray(data.results), 'Expected results array');
  });

  it('fetch still works after token nears expiry', async () => {
    const jwtOpts = await getJWTPrefObj();
    const fetcher = await fetchJson(undefined, undefined, jwtOpts);

    // First call succeeds immediately
    const first = await fetcher('GET', 'http://127.0.0.1:8000/api/v3/members/memberships/');
    assert.ok(first, 'First fetch should return data');

    // Wait long enough that the token should need refreshing
    await new Promise(resolve => setTimeout(resolve, 9000));

    // Second call should still succeed (token refresh kicks in if needed)
    const second = await fetcher('GET', 'http://127.0.0.1:8000/api/v3/members/memberships/');
    assert.ok(second, 'Fetch after delay should still return data');
    assert.ok(Array.isArray(second.results), 'Expected results array after refresh');
  }).timeout(15000);

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
  }).timeout(10000);

  it('callback resolves with payload', async () => {
    const fetcher = await fetchJson();
    fetcher('GET', url, undefined, console.log);
  });

  it('non-2xx rejects with HttpError', async () => {
    const fetcher = await fetchJson();
    try {
      await fetcher('GET', 'https://httpbin.org/status/404');
      assert.fail('Should have thrown');
    } catch (e) {
      assert.ok(e instanceof HttpError, `Expected HttpError, got ${e.constructor.name}`);
      assert.strictEqual(e.status, 404);
    }
  });

  it('network error rejects with NetworkError', async () => {
    const fetcher = await fetchJson();
    try {
      await fetcher('GET', 'https://this.wont.resolve', 5000);
      assert.fail('Should have thrown');
    } catch (e) {
      assert.ok(e instanceof NetworkError, `Expected NetworkError, got ${e.constructor.name}`);
      assert.ok(e.cause, 'Expected a cause');
    }
  });

  it('timeout rejects with TimeoutError', async () => {
    const fetcher = await fetchJson();
    try {
      await fetcher('GET', 'https://httpbin.org/delay/5', 500);
      assert.fail('Should have thrown');
    } catch (e) {
      assert.ok(e instanceof TimeoutError, `Expected TimeoutError, got ${e.constructor.name}`);
      assert.strictEqual(e.timeout, 500);
    }
  });

});

describe('Init a fetcher with a static service token', () => {

  it('attaches the bearer token to requests', async () => {
    const fetcher = await fetchJson(undefined, undefined, {token: 'my-service-token'});
    const data = await fetcher('GET', 'https://httpbin.org/headers');
    assert.strictEqual(data.headers.Authorization, 'Bearer my-service-token');
  });

});


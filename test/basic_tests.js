import assert from 'assert';
import fetchJson from '../main.js';

const url = 'https://jsonplaceholder.typicode.com/todos/1';
describe('Init a fetcher without credentials', () => {
  const fetcher = fetchJson();

  it('promise resolves with payload', () => {
    fetcher('GET', url).then(r => console.log(r));
  });

  it('callback resolves with payload', () => {
    fetcher('GET', url, undefined, r => console.log(r));
  });

  it('failure is an option', () => {
    fetcher('GET', 'https://this.wont.resolve', 5).then(e => console.log(e));
  });


});
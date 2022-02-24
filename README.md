# fetch-json-timeout

## Version 4 
v4 is a major update that will break existing implementations.
In particular, it returns a promise instead of an object when invoked:

```javascript
import fetchJson from 'fetch-json-timeout';

const fetcher = await fetchJson();
const data = await fetcher('GET', url);
```

v4 also supports opinionated JWT token authentication, and refresh.
Internally it keeps track of token expiery and refreshes it if it had expired.
```javascript
import fetchJson from 'fetch-json-timeout';
const jwtOpts = {
  "uri":"https://some.api.endpoint/api/v3/tokens/login/",
  "refreshUri": "https://some.api.endpoint/api/v3/tokens/refresh/",
  "verb": "POST",
  "payload": {
    "email": "some.email@address.org",
    "password": "some_fancy_obscure_password"
  }
}

const fetcher = await fetchJson(undefined, undefined, jwtOpts);
const data = await fetcher('GET', url);
```
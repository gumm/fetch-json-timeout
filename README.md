# fetch-json-timeout

A wrapper around the native fetch API for getting JSON data with configurable timeouts, automatic JWT token management, and typed errors.

## Installation

```bash
npm install fetch-json-timeout
```

## Usage

### Basic (no authentication)

```javascript
import fetchJson from 'fetch-json-timeout';

const fetcher = await fetchJson();
const data = await fetcher('GET', 'https://api.example.com/items');
```

### With Basic Auth

```javascript
const fetcher = await fetchJson('username', 'password');
const data = await fetcher('GET', 'https://api.example.com/items');
```

### With JWT Authentication

Pass a JWT options object to enable automatic token management. The fetcher will acquire a token on init and transparently refresh it when it nears expiry.

```javascript
import fetchJson from 'fetch-json-timeout';

const jwtOpts = {
  uri: 'https://api.example.com/auth/login/',
  refreshUri: 'https://api.example.com/auth/refresh/',
  verb: 'POST',
  payload: {
    email: 'user@example.com',
    password: 'your_password'
  }
};

const fetcher = await fetchJson(undefined, undefined, jwtOpts);
const data = await fetcher('GET', 'https://api.example.com/protected/resource');
```

### With a Static Service Token

For long-lived service account tokens that don't expire and don't need refreshing, pass an object with just a `token` key (no `uri`):

```javascript
const fetcher = await fetchJson(undefined, undefined, {
  token: 'my-long-lived-service-token'
});

const data = await fetcher('GET', 'https://api.example.com/internal/resource');
```

### Custom Timeout

The third argument to the fetcher is a timeout in milliseconds (default: 60000). If the request does not complete within this time, a `TimeoutError` is thrown.

```javascript
const fetcher = await fetchJson();

// Timeout after 5 seconds
const data = await fetcher('GET', 'https://api.example.com/items', 5000);
```

### POST with Payload

```javascript
const fetcher = await fetchJson();

const newItem = { name: 'Widget', price: 9.99 };
const data = await fetcher('POST', 'https://api.example.com/items', 60000, undefined, newItem);
```

### Callback Style

An optional callback is invoked with the response data before the promise resolves.

```javascript
const fetcher = await fetchJson();

fetcher('GET', 'https://api.example.com/items', 60000, data => {
  console.log('Got data:', data);
});
```

## Error Handling

All failures reject with a typed error. Import the error classes to distinguish between failure modes:

```javascript
import fetchJson, { TimeoutError, HttpError, NetworkError } from 'fetch-json-timeout';

const fetcher = await fetchJson();

try {
  const data = await fetcher('GET', 'https://api.example.com/items', 5000);
} catch (e) {
  if (e instanceof TimeoutError) {
    // Request exceeded the timeout
    console.log(e.timeout); // 5000
  }

  if (e instanceof HttpError) {
    // Server responded with a non-2xx status
    console.log(e.status); // 404, 500, etc.
  }

  if (e instanceof NetworkError) {
    // DNS failure, connection refused, etc.
    console.log(e.cause); // The underlying error
  }
}
```

### Error Properties

| Error Class    | Properties           | When                                      |
|----------------|----------------------|-------------------------------------------|
| `TimeoutError` | `timeout` (ms)       | Request did not complete within the limit  |
| `HttpError`    | `status` (number)    | Server returned a non-2xx response code    |
| `NetworkError` | `cause` (Error)      | Network-level failure (DNS, refused, etc.) |

All three extend `Error` and have a descriptive `message` string.

## API

### `fetchJson(username?, password?, jwtOpts?)`

Returns a `Promise<fetcher>`.

| Parameter  | Type     | Description                          |
|------------|----------|--------------------------------------|
| `username` | `string` | Username for Basic auth (optional)   |
| `password` | `string` | Password for Basic auth (optional)   |
| `jwtOpts`  | `object` | JWT configuration object (optional)  |

**`jwtOpts` shape (JWT with refresh):**

| Key          | Type     | Description                        |
|--------------|----------|------------------------------------|
| `uri`        | `string` | Login endpoint URL                 |
| `refreshUri` | `string` | Token refresh endpoint URL         |
| `verb`       | `string` | HTTP method for auth (`"POST"`)    |
| `payload`    | `object` | Credentials to send to login       |

**`jwtOpts` shape (static service token):**

| Key     | Type     | Description                                      |
|---------|----------|--------------------------------------------------|
| `token` | `string` | A long-lived bearer token (no expiry or refresh) |

### `fetcher(verb, uri, timeout?, callback?, payload?)`

Returns a `Promise<data>` that resolves with the parsed JSON response.

| Parameter  | Type       | Default | Description                            |
|------------|------------|---------|----------------------------------------|
| `verb`     | `string`   |         | HTTP method (`GET`, `POST`, `PUT`, etc.) |
| `uri`      | `string`   |         | Request URL                            |
| `timeout`  | `number`   | `60000` | Timeout in milliseconds                |
| `callback` | `function` | no-op   | Called with response data              |
| `payload`  | `object`   |         | Body for POST/PUT (JSON-serialized)    |

## License

Apache-2.0

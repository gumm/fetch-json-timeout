/**
 * Wrapper around fetch API for getting JSON data.
 */
import base64 from 'base-64';
import fetch from 'node-fetch';
import timeoutSignal from 'timeout-signal';


const parseJwt = token => {
  const base64Url = token.split('.')[1];
  const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
  const jsonPayload = decodeURIComponent(Buffer.from(base64, 'base64').toString().split('').map(function(c) {
    return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
  }).join(''));
  return JSON.parse(jsonPayload).exp;
};


const refreshJWTToken = async (jwtObj, currentToken) => {

  const url = jwtObj.refreshUri.toString();
  const rep = {
    cache: 'no-cache',
    headers: {
      'Content-type': 'application/json',
    },
    method: jwtObj.verb,
    body: JSON.stringify({
      "token":currentToken
    })
  };

  return await fetch(url, rep)
      .then(checkStatus)
      .then(getJson)
      .catch(async e => {
        console.log('Token Refresh Error. Asking for wholly new token...', e);
        return await getJWTToken(jwtObj)
      });
}

const getJWTToken = async jwtObj => {

  const url = jwtObj.uri.toString();
  const rep = {
    cache: 'no-cache',
    headers: {
      'Content-type': 'application/json'
    },
    method: jwtObj.verb,
    body: JSON.stringify(jwtObj.payload)
  };

  return await fetch(url, rep)
      .then(checkStatus)
      .then(getJson)
      .catch(e => console.log('Token Fetch Error', e));
}

/**
 * @param uName
 * @param pWord
 * @param jwtObj
 * @returns {Promise<function(*=, *=, *=): Promise<{method: string, signal: AbortSignal} & {cache: string}>>}
 */
const jsonInit = async ([uName, pWord], jwtObj) => {
  const h = {
    'Content-type': 'application/json'
  };
  const rep = {
    cache: 'no-cache'
  };
  let tokenExpr = 0;
  let JWTToken = "";

  if (uName && pWord) {
    h.Authorization = 'Basic ' + base64.encode(`${uName}:${pWord}`);
    rep.credentials = 'include'
  }

  const updateTokenInfo = tpl => {
    if (tpl) {
      JWTToken = tpl.token;
      h.Authorization = 'Bearer ' + JWTToken;
      rep.credentials = 'include';
      tokenExpr = parseJwt(JWTToken);
    }
  }

  /**
   * This is potentially problematic. We have no control over how regularly this
   * gets called, and if it does not get called regularly enough, the token may expire
   * beyond its capability to be refreshed.
   * @returns {Promise<void>}
   */
  const checkToken = async () => {
    if (jwtObj && tokenExpr > 0) {
      const now =  Math.floor(Date.now() / 1000);
      if (tokenExpr - now <= 10) {
        const tokenPayload = await refreshJWTToken(jwtObj, JWTToken);
        updateTokenInfo(tokenPayload);
      }
    }
  }

  if (jwtObj) {
    const tokenPayload = await getJWTToken(jwtObj);
    updateTokenInfo(tokenPayload);
  }

  return async (to = 60000, verb = 'GET', obj = undefined) => {

    await checkToken();

    rep.headers = h;
    const r = Object.assign({
      method: verb,
      signal: timeoutSignal(to)
    }, rep);
    if (obj) {
      r.body = JSON.stringify(obj)
    }
    return r;
  };
};


/**
 * @param {!Response} response
 * @return {!Promise}
 */
const checkStatus = response => {
  if (response.ok) {
    return Promise.resolve(response);
  } else {
    return Promise.reject(new Error(
        `${response.url} ${response.status} (${response.statusText})`));
  }
};

/**
 * @param {!Response} response
 * @return {!Promise}
 */
const getJson = response => {
    return response.json().then(
        data => Promise.resolve(data),
    ).catch(
        err => {
          const contentLength = response.headers.get('content-length');
          const code = response.status;
          if ([201, 202, 204].includes(code) &&
              contentLength.toString() === '0') {
            Promise.resolve({})
          } else {
            Promise.reject(response)
          }
        }
    )
};


/**
 * @param {function(*=):*} cb
 * @returns {function(*=): *}
 */
const callbackAndData = cb => data => {
  cb(data);
  return data;
};


/**
 * @param {!string=} uName
 * @param {!string=} pWord
 * @param {Object=} jwtObj
 * @returns {Promise<function(string, string, number=, function(*=): *=, Object=): Promise<unknown | void>>}
 */
export default async (uName = undefined, pWord = undefined, jwtObj = undefined) => {
  let init = await jsonInit([uName, pWord], jwtObj);

  /**
   * @param {string} verb GET, POST, PUT etc.
   * @param {string} uri
   * @param {number=} to Timeout in ms. Defaults to 60 seconds
   * @param {function(*=):*} cb
   * @param {Object=} opt_pl Post payload. JSON converted to body property
   * @returns {Promise<T>}
   */
  const func = async (verb, uri, to = 60000, cb = () => null, opt_pl = undefined) => {
    const req = uri.toString();
    const options = await init(to, verb, opt_pl);

    return fetch(req, options)
        .then(checkStatus)
        .then(getJson)
        .then(callbackAndData(cb))
        .catch(e => console.log(`Data Error: ${verb} ${uri} TIMEOUT:${to}`, e));

  };

  return func;
};

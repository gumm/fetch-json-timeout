'use strict';

var base64 = require('base-64');
var fetch = require('node-fetch');
var timeoutSignal = require('timeout-signal');

function _interopDefaultLegacy (e) { return e && typeof e === 'object' && 'default' in e ? e : { 'default': e }; }

var base64__default = /*#__PURE__*/_interopDefaultLegacy(base64);
var fetch__default = /*#__PURE__*/_interopDefaultLegacy(fetch);
var timeoutSignal__default = /*#__PURE__*/_interopDefaultLegacy(timeoutSignal);

/**
 * Wrapper around fetch API for getting JSON data.
 */


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

  return await fetch__default["default"](url, rep)
      .then(checkStatus)
      .then(getJson)
      .catch(e => console.log('Token Refresh Error', e));
};

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

  return await fetch__default["default"](url, rep)
      .then(checkStatus)
      .then(getJson)
      .catch(e => console.log('Token Fetch Error', e));
};

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
    h.Authorization = 'Basic ' + base64__default["default"].encode(`${uName}:${pWord}`);
    rep.credentials = 'include';
  }

  const updateTokenInfo = tpl => {
    if (tpl) {
      JWTToken = tpl.token;
      h.Authorization = 'Bearer ' + JWTToken;
      rep.credentials = 'include';
      tokenExpr = parseJwt(JWTToken);
    }
  };

  const checkToken = async () => {
    if (jwtObj && tokenExpr > 0) {
      const now =  Math.floor(Date.now() / 1000);
      if (tokenExpr - now <= 10) {
        const tokenPayload = await refreshJWTToken(jwtObj, JWTToken);
        updateTokenInfo(tokenPayload);
      }
    }
  };

  if (jwtObj) {
    const tokenPayload = await getJWTToken(jwtObj);
    updateTokenInfo(tokenPayload);
  }

  return async (to = 60000, verb = 'GET', obj = undefined) => {

    await checkToken();

    rep.headers = h;
    const r = Object.assign({
      method: verb,
      signal: timeoutSignal__default["default"](to)
    }, rep);
    if (obj) {
      r.body = JSON.stringify(obj);
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
            Promise.resolve({});
          } else {
            Promise.reject(response);
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
var main = async (uName = undefined, pWord = undefined, jwtObj = undefined) => {
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

    return fetch__default["default"](req, options)
        .then(checkStatus)
        .then(getJson)
        .then(callbackAndData(cb))
        .catch(e => console.log('Data Error', e));

  };

  return func;
};

module.exports = main;

module.exports = Object.assign({}, module.exports, exports);

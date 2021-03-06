'use strict';

var base64 = require('base-64');
var fetch = require('node-fetch');

function _interopDefaultLegacy (e) { return e && typeof e === 'object' && 'default' in e ? e : { 'default': e }; }

var base64__default = /*#__PURE__*/_interopDefaultLegacy(base64);
var fetch__default = /*#__PURE__*/_interopDefaultLegacy(fetch);

/**
 * Wrapper around fetch API for getting JSON data.
 */

/**
 * @param {!Object} cred
 * @return {!Function}
 */
const jsonInit = ([uName, pWord]) => {
  const h = new fetch__default['default'].Headers();
  h.append('Content-type', 'application/json');
  h.append('X-Requested-With', 'XMLHttpRequest');
  if (uName && pWord) {
    h.append('Authorization', 'Basic ' + base64__default['default'].encode(`${uName}:${pWord}`));
  }
  const rep = {
    cache: 'no-cache',
    headers: h,
  };
  if (uName && pWord) {
    rep['credentials'] = 'include';
  }

  return (verb = 'GET', obj = undefined) => {
    const r = Object.assign({method: verb}, rep);
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
              contentLength.toString() === '0') ; else {
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
 * @param {!string} uName
 * @param {!string} pWord
 * @returns {function(string, string, number= Function=, Object=): Promise<T>}
 */
var main = (uName = undefined, pWord = undefined) => {
  const init = jsonInit([uName, pWord]);

  /**
   * @param {string} verb GET, POST, PUT etc.
   * @param {string} uri
   * @param {number=} to Timeout in ms. Defaults to 60 seconds
   * @param {function(*=):*} cb
   * @param {Object=} opt_pl
   * @returns {Promise<T>}
   */
  const func = (verb, uri, to = 60000, cb = () => null, opt_pl = undefined) => {
    const req = new fetch__default['default'].Request(uri.toString());

    let cTmOut = a => a;
    const timeout = () => new Promise((resolve, reject) => {
      const tid = setTimeout(reject, to, 'Fetch Timeout');
      cTmOut = () => clearTimeout(tid);
    });

    const f = fetch__default['default'](req, init(verb, opt_pl))
        .then(d => {
          cTmOut();
          return d;
        })
        .then(checkStatus)
        .then(getJson)
        .then(callbackAndData(cb))
        .catch(e => console.log('Data Error', e));

    return Promise.race([f, timeout()]).catch(err => {
      console.log('JSON Fetch Errors:', err);
    });
  };

  return func;
};

module.exports = main;

module.exports = Object.assign({}, module.exports, exports);

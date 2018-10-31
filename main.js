/**
 * Wrapper around fetch API for getting JSON data.
 */
const base64 = require('base-64');
const fetch = require('node-fetch');

/**
 * @param {!Object} cred
 * @return {!Function}
 */
const jsonInit = ([uName, pWord]) => {
  const h = new fetch.Headers();
  h.append('Content-type', 'application/json');
  h.append('X-Requested-With', 'XMLHttpRequest');
  if (uName && pWord) {
    h.append('Authorization', 'Basic ' + base64.encode(`${uName}:${pWord}`));
  }
  const rep = {
    cache: 'no-cache',
    headers: h,
  };
  if (uName && pWord) {
    rep['credentials'] = 'include'
  }

  return (verb = 'GET', obj = undefined) => {
    const r = Object.assign({method: verb}, rep);
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
      err => Promise.reject(`Could not get JSON from response: ${err}`));
};


/**
 * @param {string} s
 * @throws
 */
const throwErr = s => {
  throw s
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
module.exports = (uName = undefined, pWord = undefined) => {
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
    const req = new fetch.Request(uri.toString());

    let cTmOut = a => a;
    const timeout = () => new Promise(() => {
      const tid = setTimeout(throwErr, to, 'Fetch Timeout');
      cTmOut = () => clearTimeout(tid);
    });

    const f = fetch(req, init(verb, opt_pl))
        .then(d => {
          cTmOut();
          return d;
        })
        .then(checkStatus)
        .then(getJson)
        .then(callbackAndData(cb));

    return Promise.race([f, timeout()]).catch(err => {
      console.error('JSON Fetch Errors:', err)
    });
  };

  return func;
};
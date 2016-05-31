var Promise = require('bluebird');
var debug = require('debug')('simple-oauth2:main');
var utils = require('./utils');

module.exports = function (config) {
  var errors = require('./error')();
  var Url = require('url');

  function requestFunction(options, callback) {
    var uri = options.uri;
    var formBody = undefined;
    var headers = options.headers;

    if (options.form) {
      headers['Content-Type'] = 'application/x-www-form-urlencoded';

      formBody = [];
      for (var property in options.form) {
        var encodedKey = encodeURIComponent(property);
        var encodedValue = encodeURIComponent(options.form[property]);
        formBody.push(encodedKey + "=" + encodedValue);
      }
      formBody = formBody.join("&");
    }

    if (options.qs) {
      var querystring = Object.keys(options.qs)
        .map(key => key + '=' + encodeURIComponent(options.qs[key]))
        .join('&');
      uri += '?' + querystring;
    }

    fetch(uri, {
      method: options.method,
      headers: headers,
      body: formBody
    }).then(function(response) {
      response.text().then(function(responseText) {
        callback(undefined, response, responseText);
      }).catch(function(error){
        console.error(error);
        callback(error);
      });
    }).catch(function(error){
      console.error(error);
      callback(error);
    });
  }

  var request = Promise.promisify(requestFunction);

  // High level method to call API
  function api(method, path, params, callback) {
    var url;
    var isAbsoluteUrl;

    if (typeof params === 'function') {
      callback = params;
      params = {};
    }

    debug('OAuth2 Node Request');

    isAbsoluteUrl = String(Url.parse(path).protocol)
      .match(/https?/);
    url = isAbsoluteUrl ? path : config.site + path;

    return call(method, url, params).spread(data).nodeify(callback);
  }

  // Make the HTTP request
  function call(method, url, params, callback) {
    var header = null;
    var options = { uri: url, method: method };

    if (!config.clientID || !config.clientSecret || !config.site) {
      return Promise.reject(new Error('Configuration missing. You need to specify the client id, the client secret and the oauth2 server'));
    }

    // Token sent by querystring
    if (url && url.indexOf('access_token=') !== -1) {
      options.headers = {};

    // Api authenticated call sent using headers
    } else if (params.access_token && !params.client_id) {
      options.headers = { Authorization: 'Bearer ' + params.access_token };
      delete params.access_token;

    // OAuth2 server call used to retrieve a valid token
    } else if (config.useBasicAuthorizationHeader && config.clientID && !params.client_id) {
      options.headers = { Authorization: 'Basic ' + utils.getAuthorizationHeaderToken(config.clientID, config.clientSecret) };
    } else {
      options.headers = {};
    }

    // Copy provided headers
    if (config.headers instanceof Object) {
      for (header in config.headers) {
        if (config.headers.hasOwnProperty(header)) {
          options.headers[header] = config.headers[header];
        }
      }
    }

    // Set options if provided
    if (config.ca) options.ca = config.ca;
    if (config.agent) options.agent = config.agent;
    if (config.rejectUnauthorized) options.rejectUnauthorized = config.rejectUnauthorized;

    if (utils.isEmpty(params)) params = null;
    if (method !== 'GET') options.form = params;
    if (method === 'GET') options.qs = params;

    // Enable the system to send authorization params in the body
    // For example github does not require to be in the header
    if (config.useBodyAuth && options.form) {
      options.form.client_id = config.clientID;
      options.form[config.clientSecretParameterName] = config.clientSecret;
    }

    debug('Making the HTTP request', options);

    return request(options).nodeify(callback, { spread: true });
  }


  // Extract the data from the request response
  function data(response, body, callback) {
    debug('Checking response body', body);

    try {
      body = JSON.parse(body);
    } catch (e) {
      /* The OAuth2 server does not return a valid JSON */
    }

    if (response.statusCode >= 400) {
      return Promise.reject(new errors.HTTPError(response.statusCode, body)).nodeify(callback);
    }

    return Promise.resolve(body).nodeify(callback);
  }

  return {
    call: call,
    data: data,
    api: api,
  };
};

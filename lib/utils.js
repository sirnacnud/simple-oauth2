'use strict';

const url = require('url');

module.exports = {

  /**
   * Indicates wether or not the provided url is absolute
   * @param  {String}  urlPath
   * @return {Boolean}
   */
  isAbsoluteUrl: function isAbsoluteUrl(urlPath) {
    const urlOptions = url.parse(urlPath);

    return String(urlOptions.protocol).match(/https?/);
  },

  /**
   * Verify if a given object actually have valid properties
   * @param  {Object}  object Object to evaluate
   * @return {Boolean}    Indicates if the object has valid properties
   */
  isEmpty: function isEmpty(object) {
    return Object.keys(object).length === 0;
  },

  /**
   * Merge a set of default options with the provided options object
   * @param  {Object} o1 Default options
   * @param  {Object} o2 Provided options
   * @return {Object}    Merged options
   */
  mergeDefaults: function mergeDefaults(o1, o2) {
    Object.keys(o2)
    .forEach((p) => {
      try {
        if (typeof o2[p] === 'object') {
          o1[p] = mergeDefaults(o1[p], o2[p]);
        } else if (typeof o1[p] === 'undefined') {
          o1[p] = o2[p];
        }
      } catch (e) {
        o1[p] = o2[p];
      }
    });

    return o1;
  },

  /**
   * Create a safe set of default options
   * @param  {Object} config   Provided options
   * @param  {Object} defaults Default options
   * @return {Object}          Safe options
   */
  configure: function configure(config, defaults) {
    const localConfig = config || {};
    this.mergeDefaults(localConfig, defaults);

    return localConfig;
  },

  /**
   * Get the authorization header used to request a valid token
   * @param  {String} clientID
   * @param  {String} clientSecret
   * @return {String}              Authorization header string token
   */
  getAuthorizationHeaderToken: function getAuthorizationHeaderToken(clientID, clientSecret) {
    return new Buffer(`${clientID}:${clientSecret}`).toString('base64');
  }
};

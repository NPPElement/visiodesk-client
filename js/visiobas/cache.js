/**
* every value from visiobas server will store in cache
* all visiobas script logic will work with value from cache
* cache value should be invalidate by timeout
*
* there two main function set and get
*/
function VisiobasCache() {
  this.data = {};

  /** @type{number} when cache value should be invalidated, default value in ms */
  this.invalidateTimeout = 10000;
}

/**
* @param {string} id unique cache value id (can be batnet address)
* @param {object} value cache value
* @param {string} batnet address, to known what kind of value it is?
*/
VisiobasCache.prototype.set = function(id, value, batnet) {
  this.data[id] = {
    batnet: _.isEmpty(batnet) ? "" : batnet,
    value: value,
    timestamp: (new Date()).time()
  }
};

/**
* read cache value, and return object correspondig with cache id
* @param {string} id unique cache key
*/
VisiobasCache.prototype.get = function(id) {
  if (!this.data[id]) {
    return null;
  }

  if (_.isEmpty(this.data[id])) {
    this.data[id] = null;
    return null;
  }

  if ((new Date()).time() - this.data[id].timestamp > this.invalidateTimeout) {
    this.data[id] = null;
    return null;
  }

  return this.data[id];
};

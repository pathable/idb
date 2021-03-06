(function() {

// ES6 Promises
var Promise = typeof exports !== 'undefined'
  ? require('es6-promise').Promise
  : window.Promise
;

var keys = function(obj) {
  var result = [];
  for (var key in obj) {
    if (Object.hasOwnProperty.call(obj, key)) result.push(key);
  }
  return result;
};

var isArray = function(obj) {
  return Object.prototype.toString.call(obj) === '[object Array]';
};

// Various vendor prefixes.
var indexedDB =
  window.indexedDB ||
  window.mozIndexedDB ||
  window.webkitIndexedDB ||
  window.msIndexedDB;

// http://www.w3.org/TR/IndexedDB
var DB = function(name, version, schema) {
  this.name = name;
  this.version = version;
  this.schema = schema;
};

DB.drop = function(name) {
  return new Promise(function(resolve, reject) {
    var req = indexedDB.deleteDatabase(name);
    req.onsuccess = function() { resolve(); };
    req.onerror = function() { reject(); };
  });
};

DB.prototype = {

  open: function() {
    var self = this;
    if (this.openPromise) return this.openPromise;
    return this.openPromise = new Promise(function(resolve, reject) {
      var req = indexedDB.open(self.name, self.version);

      req.onsuccess = function(e) { resolve(e.target.result); };
      req.onerror = function(e) { reject(e.target.errorCode); };

      req.onupgradeneeded = function(e) {
        var db = e.target.result;
        var stores = db.objectStoreNames;
        var tx = e.currentTarget.transaction;

        for (var name in self.schema) {
          var options = self.schema[name];
          var keyPath = options.keyPath;
          var indices = options.indices;

          // Create new or retrieve existing store.
          var store = stores.contains(name)
            ? tx.objectStore(name)
            : db.createObjectStore(name, {keyPath: keyPath || 'id'})
          ;

          // Create indices
          for (var index in indices) {
            var indexOptions = indices[index];
            if (!store.indexNames.contains(index)) {
              store.createIndex(index, index, indexOptions);
            }
          }
        }

      };
    });
  },

  close: function() {
    return this.open().then(function(db){ db.close(); });
  },

  clear: function(names) {
    if (!names) names = keys(this.schema);
    if (!isArray(names)) names = [names];

    return this.open().then(function(db) {
      return new Promise(function(resolve, reject) {
        for (var i = 0; i < names.length; i++) {
          if (!db.objectStoreNames.contains(names[i])) names.splice(i--, 1);
        }

        var tx = db.transaction(names, 'readwrite');

        tx.oncomplete = function(){ resolve(); };
        tx.onerror = function(e){ reject(e.target.error); };

        for (var i = 0; i < names.length; i++) {
          tx.objectStore(names[i]).clear();
        }
      });
    });
  },

  put: function(name, data) {
    if (!isArray(data)) data = [data];
    return this.open().then(function(db) {
      return new Promise(function(resolve, reject) {
        var tx = db.transaction(name, 'readwrite');

        tx.oncomplete = function() { resolve(); };
        tx.onerror = function(e) { reject(e.target.error); };

        var store = tx.objectStore(name);
        for (var i = 0; i < data.length; i++) {
          store.put(data[i]);
        }
      });
    });
  },

  remove: function(name, keys) {
    if (!isArray(keys)) keys = [keys];
    return this.open().then(function(db) {
      return new Promise(function(resolve, reject) {
        var tx = db.transaction(name, 'readwrite');
        var store = tx.objectStore(name);

        for (var i = 0; i < keys.length; i++) store['delete'](keys[i]);

        // Data is often not removed until the next turn of the event loop.
        tx.oncomplete = function(){ setTimeout(resolve, 0); };
        tx.onerror = function(e){ reject(e.target.error); };
      });
    });
  },

  get: function(name, key) {
    return this.open().then(function(db) {
      return new Promise(function(resolve, reject) {
        var req = db.transaction(name).objectStore(name).get(key);
        req.onsuccess = function(e) { resolve(e.target.result); };
        req.onerror = function(e) { reject(e.target.error); };
      });
    });
  },

  query: function(name, options) {
    var page = options && options.page;
    var order = options && options.order;
    var per_page = options && options.per_page;
    var sort_mode = options && options.sort_mode;

    if (page != null && per_page == null) per_page = 10;

    var res = {
      results: [],
      total_entries: 0
    };

    return this.open().then(function(db) {
      return new Promise(function(resolve, reject) {
        if (!db.objectStoreNames.contains(name)) return resolve(res);

        var tx = db.transaction(name);
        tx.oncomplete = function() { resolve(res); };
        tx.onerror = function(e){ reject(e.target.error); };

        var store = tx.objectStore(name);
        if (store.indexNames.contains(order)) store = store.index(order);

        store.count().onsuccess = function(e) {
          res.total_entries = e.target.result;
        };

        var direction = 'next';
        switch (sort_mode) {
          case 'asc': direction = 'next'; break;
          case 'desc': direction = 'prev'; break;
        }

        var paged = false;
        store.openCursor(null, direction).onsuccess = function(e) {
          var cursor = e.target.result;
          if (!cursor) return;

          // limit
          else if (per_page != null && res.results.length === per_page) {
            return;
          }

          // offset
          else if (!paged && page != null && page > 1) {
            paged = true;
            cursor.advance(per_page * (page - 1));
          }

          else {
            res.results.push(cursor.value);
            cursor['continue']();
          }
        };

      });
    });
  }

};

if (typeof exports !== 'undefined') {
  module.exports = indexedDB ? DB : null;
} else {
  window.IDB = indexedDB ? DB : null;
}

}).call(this);

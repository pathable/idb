(function() {

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

// http://dev.w3.org/html5/webdatabase
var DB = function(name, version, schema) {
  this.name = name;
  this.version = version;
  this.schema = schema;
};

DB.drop = function(name) {
  return new Promise(function(resolve, reject) {
    var db = openDatabase(name, '', name, 5 * 1024 * 1024);
    db.transaction(function(tx) {
      var sql = "select tbl_name from sqlite_master where type = 'table'";
      tx.executeSql(sql, [], function(tx, res) {
        for (var i = 0; i < res.rows.length; i++) {
          var name = res.rows.item(i).tbl_name;
          tx.executeSql('drop table ' + name, [],
            function() {},
            function() { return false; }
          );
        }
      });
    },
    function(e){ reject(e); },
    function(){ resolve(); });
  });
};

DB.prototype = {

  open: function() {
    var self = this;
    if (this.openPromise) return this.openPromise;
    return this.openPromise = new Promise(function(resolve, reject) {
      var db = openDatabase(self.name, '', self.name, 5 * 1024 * 1024);
      db.transaction(function(tx) {
        for (var name in self.schema) {
          var options = self.schema[name];
          var keyPath = options.keyPath;
          var indices = options.indices;

          tx.executeSql(
            'create table if not exists ' + name + ' (id primary key asc, data)'
          );

          for (var index in indices) {
            var indexOptions = indices[index];

            // If the column exists, return false to avoid failing the
            // transaction.
            var sql = 'alter table ' + name + ' add column ' + index;
            tx.executeSql(sql, [], function(){}, function(){ return false });

            tx.executeSql(
              'create index if not exists ' + index +
              ' on ' + name + ' (' + index + ')'
            );
          }
        }
      },
      function(e) { reject(e); },
      function(){ resolve(db); });
    });
  },

  close: function() {
    return Promise.resolve();
  },

  clear: function(names) {
    if (names == null) names = keys(this.schema);
    if (!isArray(names)) names = [names];
    for (var i = 0; i < names.length; i++) {
      if (!this.schema[names[i]]) names.splice(i--, 1);
    }

    return this.open().then(function(db) {
      return new Promise(function(resolve, reject) {
        db.transaction(function(tx) {
          for (var i = 0; i < names.length; i++) {
            tx.executeSql('delete from ' + names[i], []);
          }
        },
        function(e){ reject(e); },
        function(){ resolve(); });
      });
    });
  },

  put: function(name, data) {
    if (!isArray(data)) data = [data];
    var store = this.schema[name] || {};
    var keyPath = store.keyPath || 'id';
    var indices = store.indices || {};

    return this.open().then(function(db) {
      return new Promise(function(resolve, reject) {
        db.transaction(function(tx) {
          for (var i = 0; i < data.length; i++) {
            var item = data[i];

            var sql = 'insert or replace into ' + name + ' (id, data';
            for (var index in indices) sql += ', ' + index;
            sql += ') values (?, ?';
            for (var index in indices) sql += ', ?';
            sql += ')';

            var args = [item[keyPath], JSON.stringify(item)];
            for (var index in indices) args.push(item[index]);

            tx.executeSql(sql, args);
          }
        },
        function(e) { reject(e); },
        function() { resolve(); });
      });
    });

  },

  get: function(name, key) {
    var result;
    return this.open().then(function(db) {
      return new Promise(function(resolve, reject) {
        db.transaction(function(tx) {
          var sql = 'select data from ' + name + ' where id = ? limit 1';
          tx.executeSql(sql, [key], function(tx, res) {
            if (res.rows.length === 1) {
              try { result = JSON.parse(res.rows.item(0).data); } catch(e){}
            }
          });
        },
        function(e){ reject(e); },
        function(){ resolve(result); });
      });
    });
  },

  query: function(name, options) {
    var page = options && options.page;
    var order = options && options.order;
    var per_page = options && options.per_page;
    var sort_mode = options && options.sort_mode;

    if (page != null && per_page == null) per_page = 10;

    var store = this.schema[name];
    var indices = keys(store && store.indices || {});
    var res = {
      results: [],
      total_entries: 0
    };

    if (!this.schema[name]) return Promise.resolve(res);

    return this.open().then(function(db) {
      return new Promise(function(resolve, reject) {
        db.transaction(function(tx) {
          var sql = 'select count(id) as count from ' + name;

          tx.executeSql(sql, [], function(tx, results) {
            res.total_entries = results.rows.item(0).count;
          });

          sql = 'select data from ' + name + ' order by ';

          // order
          sql += ~indices.indexOf(order)
            ? order + ' ' + (sort_mode || 'asc')
            : 'id'
          ;

          // paging
          if (page != null && per_page != null) {
            sql += ' limit ' + per_page;
            if (page > 1) sql += ', ' + (per_page * (page - 1));
          }

          tx.executeSql(sql, [], function(tx, results) {
            for (var i = 0; i < results.rows.length; i++) {
              try {
                res.results.push(JSON.parse(results.rows.item(i).data));
              } catch(e){}
            }
          });
        },
        function(e){ reject(e); },
        function(){ resolve(res); });
      });
    });

  }

};

if (typeof exports !== 'undefined') {
  module.exports = DB;
} else {
  if (!window.IDB) window.IDB = DB;
}

}).call(this);

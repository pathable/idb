var tape = require('tape');
var DB = require('../');

var test = function(name, options, callback) {
  if (!callback) {
    callback = options;
    options = null;
  }
  tape(name, options, function(t) {
    DB.drop('test').then(function() {
      return callback(t);
    })['catch'](function(e) {
      t.fail(e.message + ' ' + e.stack);
      t.end();
    });
  });
};

test('Put and get.', function(t) {
  var db = new DB('test', 1, {test: {}});
  return db.put('test', {id: 1, x: 1}).then(function() {
    return db.get('test', 1).then(function(obj) {
      t.same(obj, {id: 1, x: 1});
      db.close().then(function(){ t.end(); });
    });
  });
});

test('Put and query', function(t) {
  var db = new DB('test', 1, {test: {}});
  return db.put('test', {id: 1, x: 1}).then(function() {
    return db.query('test').then(function(res) {
      t.same(res.results, [{id: 1, x: 1}]);
      db.close().then(function(){ t.end(); });
    });
  });
});

test('Put and query', function(t) {
  var db = new DB('test', 1, {test: {}});
  return db.put('test', [{id: 1, x: 1}, {id: 2, x: 2}]).then(function() {
    return db.query('test').then(function(res) {
      t.same(res.results, [{id: 1, x: 1}, {id: 2, x: 2}]);
      db.close().then(function(){ t.end(); });
    });
  });
});

test('Query order.', function(t) {
  var db = new DB('test', 1, {test: {indices: {x: {}}}});
  var models = [
    {id: 1, x: 1},
    {id: 3, x: 3},
    {id: 2, x: 2}
  ];
  return db.put('test', models).then(function() {
    return db.query('test', {order: 'x'})
    .then(function(res) {
      t.same(res.results, [
        {id: 1, x: 1},
        {id: 2, x: 2},
        {id: 3, x: 3}
      ]);
      db.close().then(function(){ t.end(); });
    });
  });
});

test('Query order asc.', function(t) {
  var db = new DB('test', 1, {test: {indices: {x: {}}}});
  var models = [
    {id: 1, x: 1},
    {id: 3, x: 3},
    {id: 2, x: 2}
  ];
  return db.put('test', models).then(function() {
    return db.query('test', {order: 'x', sort_mode: 'asc'})
    .then(function(res) {
      t.same(res.results, [
        {id: 1, x: 1},
        {id: 2, x: 2},
        {id: 3, x: 3}
      ]);
      db.close().then(function(){ t.end(); });
    });
  });
});

test('Query order asc.', function(t) {
  var db = new DB('test', 1, {test: {indices: {x: {}}}});
  var models = [
    {id: 1, x: 1},
    {id: 3, x: 3},
    {id: 2, x: 2}
  ];
  return db.put('test', models).then(function() {
    return db.query('test', {order: 'x', sort_mode: 'desc'})
    .then(function(res) {
      t.same(res.results, [
        {id: 3, x: 3},
        {id: 2, x: 2},
        {id: 1, x: 1}
      ]);
      db.close().then(function(){ t.end(); });
    });
  });
});

test('Paging.', function(t) {
  var db = new DB('test', 1, {test: {indices: {x: {}}}});
  var models = [
    {id: 1},
    {id: 2},
    {id: 3},
    {id: 4}
  ];
  return db.put('test', models).then(function(){
    return db.query('test', {page: 1, per_page: 3}).then(function(res) {
      t.same(res.results, models.slice(0, 3));
      db.close().then(function(){ t.end(); });
    });
  });
});

test('Paging.', function(t) {
  var db = new DB('test', 1, {test: {indices: {x: {}}}});
  var models = [
    {id: 1},
    {id: 2},
    {id: 3},
    {id: 4}
  ];
  return db.put('test', models).then(function() {
    return db.query('test', {page: 2, per_page: 3}).then(function(res) {
      t.same(res.results, models.slice(3));
      db.close().then(function(){ t.end(); });
    });
  });
});

test('Missing store.', function(t) {
  var db = new DB('test', 1, {test: {indices: {x: {}}}});
  return db.query('missing').then(function(res) {
    t.same(res.results, []);
    t.is(res.total_entries, 0);
    db.close().then(function(){ t.end(); });
  });
});

test('Overwrite values.', function(t) {
  var db = new DB('test', 1, {test: {indices: {x: {}}}});
  return db.put('test', {id: 1, x: 1}).then(function() {
    return db.put('test', {id: 1, x: 2}).then(function() {
      return db.query('test').then(function(res) {
        t.same(res.results, [{id: 1, x: 2}]);
        db.close().then(function(){ t.end(); });
      });
    });
  });
});

test('Clear store.', function(t) {
  var db = new DB('test', 1, {test: {indices: {x: {}}}});
  return db.put('test', [{id: 1, x: 1}, {id: 2, x: 2}]).then(function() {
    return db.clear('test').then(function() {
      return db.query('test').then(function(res) {
        t.same(res.results, []);
        db.close().then(function(){ t.end(); });
      });
    });
  });
});

test('Clear db.', function(t) {
  var db = new DB('test', 1, {test: {indices: {x: {}}}});
  return db.put('test', [{id: 1, x: 1}]).then(function() {
    return db.clear().then(function() {
      return db.query('test').then(function(res) {
        t.same(res.results, []);
        db.close().then(function(){ t.end(); });
      });
    });
  });
});

test('Clear missing store.', function(t) {
  var db = new DB('test', 1, {test: {indices: {x: {}}}});
  return db.put('test', [{id: 1, x: 1}, {id: 2, x: 2}]).then(function() {
    return db.clear(['test', 'missing']).then(function() {
      return db.query('test').then(function(res) {
        t.same(res.results, []);
        db.close().then(function(){ t.end(); });
      });
    });
  });
});

test('Total Entries.', function(t) {
  var db = new DB('test', 1, {test: {indices: {x: {}}}});
  var models = [
    {id: 1},
    {id: 2},
    {id: 3},
    {id: 4}
  ];
  return db.put('test', models).then(function() {
    return db.query('test').then(function(res) {
      t.is(res.total_entries, 4);
      db.close().then(function(){ t.end(); });
    });
  });
});

test('Total Entries, Paged.', function(t) {
  var db = new DB('test', 1, {test: {indices: {x: {}}}});
  var models = [
    {id: 1},
    {id: 2},
    {id: 3},
    {id: 4}
  ];
  return db.put('test', models).then(function() {
    return db.query('test', {page: 1, per_page: 3}).then(function(res) {
      t.same(res.results, models.slice(0, 3));
      t.is(res.total_entries, 4);
      db.close().then(function(){ t.end(); });
    });
  });
});

test('Total Entries, Paged.', function(t) {
  var db = new DB('test', 1, {test: {indices: {x: {}}}});
  var models = [
    {id: 1},
    {id: 2},
    {id: 3},
    {id: 4}
  ];
  return db.put('test', models).then(function() {
    return db.query('test', {page: 2, per_page: 3}).then(function(res) {
      t.same(res.results, models.slice(3));
      t.is(res.total_entries, 4);
      db.close().then(function(){ t.end(); });
    });
  });
});

test('Per page default is 10', function(t) {
  var db = new DB('test', 1, {test: {indices: {x: {}}}});
  models = [
    {id: 1},
    {id: 2},
    {id: 3},
    {id: 4},
    {id: 5},
    {id: 6},
    {id: 7},
    {id: 8},
    {id: 9},
    {id: 10},
    {id: 11},
    {id: 12}
  ];
  return db.put('test', models).then(function() {
    return db.query('test', {page: 1}).then(function(res) {
      t.same(res.results, models.slice(0, 10));
      t.is(res.total_entries, 12);
      db.close().then(function(){ t.end(); });
    });
  });
});

test('get', function(t) {
  var db = new DB('test', 1, {test: {indices: {x: {}}}});
  return db.put('test', {id: 1, x: 1}).then(function() {
    return db.get('test', 1).then(function(data) {
      t.same(data, {id: 1, x: 1});
      db.close().then(function(){ t.end(); });
    });
  });
});

test('get missing', function(t) {
  var db = new DB('test', 1, {test: {indices: {x: {}}}});
  return db.get('test', 1).then(function(data) {
    t.is(data, undefined);
    db.close().then(function(){ t.end(); });
  });
});

test('keyPath', function(t) {
  var db = new DB('test', 1, {test: {keyPath: 'x', indices: {x: {}}}});
  return db.put('test', {x: 3}).then(function() {
    return db.get('test', 3).then(function(data) {
      t.same(data, {x: 3});
      db.close().then(function(){ t.end(); });
    });
  });
});

test('remove', function(t) {
  var db = new DB('test', 1, {test: {keyPath: 'x', indices: {x: {}}}});
  return db.put('test', {x: 3}).then(function() {
    return db.remove('test', 3).then(function() {
      return db.get('test', 3).then(function(obj) {
        t.is(obj, undefined);
        return db.close().then(function(){ t.end(); });
      });
    });
  });
});

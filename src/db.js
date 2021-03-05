//var sqlite3 = require('sqlite3').verbose();
var async = require('async');

//var settings = require('./settings');
//var db = new sqlite3.Database(settings.db);

var pgp = require('pg-promise')(/* options */);
var db = pgp('postgres://postgres:password@noteexpress.cx46922mffrf.ap-southeast-1.rds.amazonaws.com:5432/postgres');
// user/password and rds endpoint can be set via container environment variables or kubernetes secret
// temporary hard code here for demostration CICD

var functions = {
  createTables: function(next) {
    async.series({
      createUsers: function(callback) {
        db.any("CREATE TABLE IF NOT EXISTS users (" +
            "id SERIAL PRIMARY KEY NOT NULL," +
            "email VARCHAR(75) NOT NULL," +
            "password VARCHAR(128) NOT NULL);" + 
            "CREATE TABLE IF NOT EXISTS pads (" +
            "id SERIAL PRIMARY KEY NOT NULL," +
            "name VARCHAR(100) NOT NULL," +
            "user_id INTEGER NOT NULL REFERENCES users(id));" + 
            "CREATE TABLE IF NOT EXISTS notes (" +
            "id SERIAL PRIMARY KEY NOT NULL," +
            "pad_id INTEGER REFERENCES pads(id)," +
            "user_id INTEGER NOT NULL REFERENCES users(id)," +
            "name VARCHAR(100) NOT NULL," +
            "text text NOT NULL," +
            "created_at timestamp default current_timestamp," +
            "updated_at timestamp default current_timestamp);", [],
            function() { callback(null); });
      }//,
      // createPads: function(callback) {
      //   db.any("CREATE TABLE IF NOT EXISTS pads (" +
      //       "id SERIAL PRIMARY KEY NOT NULL," +
      //       "name VARCHAR(100) NOT NULL," +
      //       "user_id INTEGER NOT NULL REFERENCES users(id));", [],
      //       function() { callback(null); })
      // },
      // createNotes: function(callback) {
      //   db.any("CREATE TABLE IF NOT EXISTS notes (" +
      //       "id SERIAL PRIMARY KEY NOT NULL," +
      //       "pad_id INTEGER REFERENCES pads(id)," +
      //       "user_id INTEGER NOT NULL REFERENCES users(id)," +
      //       "name VARCHAR(100) NOT NULL," +
      //       "text text NOT NULL," +
      //       "created_at timestamp default current_timestamp," +
      //       "updated_at timestamp default current_timestamp);", [],
      //       function() { callback(null); });
      // }
    },
    function(err, results) {
      next();
    });
  },

  applyFixtures: function(next) {
    this.truncateTables(function() {
      async.series([
        function(callback) {
          db.run("INSERT INTO users VALUES (1, 'user1@example.com', " +
                 "'$2a$10$mhkqpUvPPs.zoRSTiGAEKODOJMljkOY96zludIIw.Pop1UvQCTx8u')", [],
                function() { callback(null) });
        },
        function(callback) {
          db.run("INSERT INTO users VALUES (2, 'user2@example.com', " +
                 "'$2a$10$mhkqpUvPPs.zoRSTiGAEKODOJMljkOY96zludIIw.Pop1UvQCTx8u')", [],
                function() { callback(null) });

        },
        function(callback) {
          db.run("INSERT INTO pads VALUES (1, 'Pad 1', 1)", [],
                function() { callback(null) });
        },
        function(callback) {
          db.run("INSERT INTO pads VALUES (2, 'Pad 2', 1)", [],
                function() { callback(null) });
        },
        function(callback) {
          db.run("INSERT INTO notes VALUES (1, 1, 1, 'Note 1', 'Text', 1, 1)", [],
                function() { callback(null) });
        },
        function(callback) {
          db.run("INSERT INTO notes VALUES (2, 1, 1, 'Note 2', 'Text', 1, 1)", [],
                function() { callback(null) });
        }
      ], function(err, results) {
        next();
      })
    });
  },

  truncateTables: function(next) {
    async.series([
      function(callback) {
        db.run("DELETE FROM users;", [],
              function() { callback(null) });
      },
      function(callback) {
        db.run("DELETE FROM notes;", [],
              function() { callback(null) });

      },
      function(callback) {
        db.run("DELETE FROM pads;", [],
              function(result) { callback(null); });
      }
    ], function(err, results) {
      next();
    })
  }
}


if (require.main === module) {
  functions.createTables(function() {
    console.log("DB successfully initialized");
  });
}
module.exports = functions;

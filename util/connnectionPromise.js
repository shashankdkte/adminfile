// file name and path \Desktop\neo banking B2B admin\util\connnectionPromise.js

const { createPool } = require("mysql2/promise");
require("dotenv").config();

var pool = null;
function getDBPool() {
  if (pool && !pool._closed) return pool;

  pool = createPool({
    connectTimeout: 1500,
    host: "127.0.0.1",
    user: "root",
    database: `sys`,
    password: "2712",
    port: 3306,
    waitForConnections: true,
    connectionLimit: 100000,
    queueLimit: 0,
  });

  return pool;
}

module.exports = getDBPool;

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.db = void 0;
var serverless_1 = require("@neondatabase/serverless");
var neon_http_1 = require("drizzle-orm/neon-http");
var schema = require("@/lib/db/schema");
var databaseUrl = process.env.DATABASE_URL;
console.log(databaseUrl);
if (!databaseUrl) {
    throw new Error("DATABASE_URL is not set");
}
var sql = (0, serverless_1.neon)(databaseUrl);
exports.db = (0, neon_http_1.drizzle)(sql, { schema: schema });

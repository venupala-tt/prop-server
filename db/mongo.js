import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB;

let client;
let db;

export async function connectMongo() {
  if (db) return db;

  client = new MongoClient(uri);
  await client.connect();

  db = client.db(dbName);
  console.log("✅ MongoDB connected");

  return db;
}

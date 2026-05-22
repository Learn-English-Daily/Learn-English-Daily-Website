import { MongoClient, type Db } from "mongodb";

const dbName = process.env.MONGODB_DB || "lead";

type MongoCache = {
  client?: MongoClient;
  promise?: Promise<MongoClient>;
};

const globalForMongo = globalThis as typeof globalThis & {
  _leadMongo?: MongoCache;
};

const cache = globalForMongo._leadMongo ?? {};
globalForMongo._leadMongo = cache;

export async function getMongoDb(): Promise<Db> {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("Missing MONGODB_URI environment variable");
  }

  if (!cache.promise) {
    cache.client = new MongoClient(uri);
    cache.promise = cache.client.connect();
  }

  const client = await cache.promise;
  return client.db(dbName);
}

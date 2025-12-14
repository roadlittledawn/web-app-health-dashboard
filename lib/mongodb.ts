import { MongoClient, Db } from 'mongodb';

if (!process.env.MONGODB_CONNECTION_STRING) {
  throw new Error('Please define the MONGODB_CONNECTION_STRING environment variable');
}

const uri = process.env.MONGODB_CONNECTION_STRING;
const options = {};

let client: MongoClient;
let clientPromise: Promise<MongoClient>;

if (process.env.NODE_ENV === 'development') {
  // In development mode, use a global variable to preserve the value across hot reloads
  let globalWithMongo = global as typeof globalThis & {
    _mongoClientPromise?: Promise<MongoClient>;
  };

  if (!globalWithMongo._mongoClientPromise) {
    client = new MongoClient(uri, options);
    globalWithMongo._mongoClientPromise = client.connect();
  }
  clientPromise = globalWithMongo._mongoClientPromise;
} else {
  // In production mode, create a new client for each serverless function
  client = new MongoClient(uri, options);
  clientPromise = client.connect();
}

/**
 * Get MongoDB database instance
 */
export async function getDatabase(): Promise<Db> {
  const client = await clientPromise;
  return client.db('health-fitness');
}

/**
 * Get MongoDB client promise for connection pooling
 */
export default clientPromise;

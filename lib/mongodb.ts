import { MongoClient } from 'mongodb'

if (!process.env.MONGODB_URI) {
  throw new Error('Please add your Mongodb URI to .env.local')
}

const uri = process.env.MONGODB_URI
const options = {
  maxPoolSize: 10,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
}

let client: MongoClient | null = null
let clientPromise: Promise<MongoClient>

if (process.env.NODE_ENV === 'development') {
  let globalWithMongo = global as typeof globalThis & {
    _mongoClientPromise?: Promise<MongoClient>
  }

  if (!globalWithMongo._mongoClientPromise) {
    try {
      console.log('Creating new MongoDB client connection...');
      client = new MongoClient(uri, options)
      globalWithMongo._mongoClientPromise = client.connect()
      console.log('MongoDB client connection established');
    } catch (error) {
      console.error('Error creating MongoDB client:', error);
      throw error;
    }
  }
  clientPromise = globalWithMongo._mongoClientPromise
} else {
  client = new MongoClient(uri, options)
  clientPromise = client.connect()
}

export async function connectToDatabase() {
  try {
    console.log('Attempting to connect to MongoDB...');
    const client = await clientPromise
    const db = client.db('treense')
    
    // Verify connection
    await db.command({ ping: 1 })
    console.log('Successfully connected to MongoDB database:', db.databaseName)
    
    // List collections
    const collections = await db.listCollections().toArray()
    console.log('Available collections:', collections.map(c => c.name))
    
    return { client, db }
  } catch (error) {
    console.error('Failed to connect to MongoDB:', error)
    throw new Error(`Database connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

export async function closeConnection() {
  if (client) {
    try {
      await client.close()
      console.log('MongoDB connection closed successfully');
      client = null
    } catch (error) {
      console.error('Error closing MongoDB connection:', error);
      throw error;
    }
  }
} 
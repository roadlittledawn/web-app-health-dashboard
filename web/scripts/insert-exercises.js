#!/usr/bin/env node

/**
 * Script to bulk insert exercises into MongoDB
 * Usage: node scripts/insert-exercises.js
 */

require('dotenv').config();
const { MongoClient } = require('mongodb');
const exercises = require('./exercises-data');

async function insertExercises() {
  const uri = process.env.MONGODB_CONNECTION_STRING;
  
  if (!uri) {
    console.error('Error: MONGODB_CONNECTION_STRING not found in .env file');
    process.exit(1);
  }

  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('Connected to MongoDB');

    const db = client.db('health-fitness');
    const collection = db.collection('exercises');

    // Add timestamps to each exercise
    const now = new Date();
    const exercisesWithTimestamps = exercises.map(exercise => ({
      ...exercise,
      created_at: now,
      updated_at: now
    }));

    // Insert exercises
    const result = await collection.insertMany(exercisesWithTimestamps);
    
    console.log(`✅ Successfully inserted ${result.insertedCount} exercises`);
    console.log(`Inserted IDs:`, Object.values(result.insertedIds).map(id => id.toString()));

  } catch (error) {
    console.error('Error inserting exercises:', error);
    process.exit(1);
  } finally {
    await client.close();
    console.log('MongoDB connection closed');
  }
}

insertExercises();

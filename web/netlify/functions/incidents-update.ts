import { Handler } from '@netlify/functions';
import { MongoClient, ObjectId } from 'mongodb';
import { authenticate } from '../../lib/authenticate';

const handler: Handler = async (event) => {
  if (event.httpMethod !== 'PATCH') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    const auth = await authenticate(event);
    if (!auth.ok) return auth.response;

    const body = JSON.parse(event.body || '{}');
    const _id = body._id || body.id;
    const { _id: _, id: __, updates, ...rest } = body;
    const updateData = updates || rest;

    if (!_id) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Incident ID is required' }),
      };
    }

    const client = new MongoClient(process.env.MONGODB_CONNECTION_STRING!);
    await client.connect();

    const db = client.db('health-fitness');
    const collection = db.collection('health-incidents');

    // If incidentId is being updated, check for uniqueness
    if (updateData.incidentId) {
      const existingIncident = await collection.findOne({
        incidentId: updateData.incidentId,
        _id: { $ne: new ObjectId(_id) } // Exclude current incident
      });

      if (existingIncident) {
        await client.close();
        return {
          statusCode: 409,
          body: JSON.stringify({ error: 'An incident with this ID already exists' }),
        };
      }
    }

    // Convert painIntensityOverTime dates to proper Date objects if present
    if (updateData.painIntensityOverTime) {
      updateData.painIntensityOverTime = updateData.painIntensityOverTime.map((entry: Record<string, unknown>) => ({
        ...entry,
        date: new Date(entry.date)
      }));
    }

    const result = await collection.updateOne(
      { _id: new ObjectId(_id) },
      { 
        $set: {
          ...updateData,
          updated_at: new Date()
        }
      }
    );

    await client.close();

    if (result.matchedCount === 0) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'Incident not found' }),
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ 
        success: true,
        modifiedCount: result.modifiedCount 
      }),
    };

  } catch (error) {
    console.error('Error updating incident:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
};

export { handler };

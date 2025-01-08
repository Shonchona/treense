import { NextResponse, NextRequest } from 'next/server'
import { connectToDatabase } from '@/lib/mongodb'

// Add this export to make the route dynamic
export const dynamic = 'force-dynamic'

interface Prediction {
  className: string;
  probability: number;
}

export async function GET() {
  try {
    const { db } = await connectToDatabase()
    
    // First, let's check if we have any documents
    const count = await db.collection('treeRecords').countDocuments()
    console.log('Total records in database:', count)
    
    const treeRecords = await db
      .collection('treeRecords')
      .find({})
      .sort({ timestamp: -1 })
      .limit(100)
      .toArray()

    console.log('Records retrieved:', treeRecords.length)
    console.log('Sample record:', JSON.stringify(treeRecords[0], null, 2))

    return NextResponse.json({
      success: true,
      count,
      data: treeRecords
    })
  } catch (error) {
    console.error('MongoDB connection error:', error)
    return NextResponse.json(
      { success: false, error: 'Database connection failed' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const { db } = await connectToDatabase();
    
    // Add more detailed error logging
    let data;
    try {
      data = await request.json();
    } catch (e) {
      console.error('JSON parsing error:', e);
      return NextResponse.json(
        { success: false, error: 'Invalid JSON data' },
        { status: 400 }
      );
    }

    // Log the full request for debugging
    console.log('Processing request with data:', {
      headers: Object.fromEntries(request.headers),
      method: request.method,
      dataKeys: Object.keys(data || {})
    });

    // Validate data structure
    if (!data || typeof data !== 'object') {
      return NextResponse.json(
        { success: false, error: 'Invalid request format' },
        { status: 400 }
      );
    }

    // Log the received data for debugging
    console.log('Received data:', {
      treeId: data.treeId,
      healthStatus: data.healthStatus,
      predictionsLength: data.predictions?.length,
      imageUrlLength: data.imageUrl?.length
    });

    // Validate required fields
    const requiredFields = ['imageUrl', 'healthStatus', 'predictions'];
    const missingFields = requiredFields.filter(field => !data[field]);
    
    if (missingFields.length > 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Missing required fields: ${missingFields.join(', ')}`,
          received: Object.keys(data)
        },
        { status: 400 }
      );
    }

    // Create record with validated data
    const record = {
      treeId: data.treeId || `tree-${Date.now()}`,
      imageUrl: data.imageUrl,
      healthStatus: data.healthStatus.toLowerCase(),
      timestamp: data.timestamp || new Date().toISOString(),
      predictions: data.predictions.map((p: Prediction) => ({
        className: String(p.className),
        probability: Number(p.probability)
      })),
      createdAt: new Date()
    };

    const result = await db.collection('treeRecords').insertOne(record);
    console.log('Record saved with ID:', result.insertedId);

    return NextResponse.json({
      success: true,
      message: 'Record saved successfully',
      id: result.insertedId
    });

  } catch (error) {
    console.error('Server error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Server error occurred',
        stack: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}

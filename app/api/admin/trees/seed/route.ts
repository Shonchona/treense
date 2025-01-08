import { NextResponse } from 'next/server'
import { connectToDatabase } from '@/lib/mongodb'

export async function POST() {
  try {
    const { db } = await connectToDatabase()
    
    // Sample record with minimal test data
    const testRecord = {
      treeId: `tree-${Date.now()}`,
      imageUrl: "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD", // Minimal base64 image data
      healthStatus: "healthy",
      timestamp: new Date().toISOString(),
      location: {
        latitude: 0,
        longitude: 0
      },
      predictions: [
        {
          className: "healthy",
          probability: 0.95
        }
      ]
    }

    const result = await db.collection('treeRecords').insertOne(testRecord)

    return NextResponse.json({
      success: true,
      message: 'Test record inserted successfully',
      id: result.insertedId
    })
  } catch (error) {
    console.error('Failed to insert test record:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to insert test record' },
      { status: 500 }
    )
  }
} 
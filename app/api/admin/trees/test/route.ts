import { NextResponse } from 'next/server'
import { connectToDatabase } from '@/lib/mongodb'

export async function GET() {
  try {
    const { db } = await connectToDatabase()
    
    // Check if collection exists and count documents
    const count = await db.collection('treeRecords').countDocuments()
    
    // Get latest record for verification
    const latestRecord = await db.collection('treeRecords')
      .find({})
      .sort({ timestamp: -1 })
      .limit(1)
      .toArray()

    return NextResponse.json({
      success: true,
      message: 'Database connection successful',
      recordCount: count,
      latestRecord: latestRecord[0] ? {
        treeId: latestRecord[0].treeId,
        healthStatus: latestRecord[0].healthStatus,
        timestamp: latestRecord[0].timestamp
      } : null
    })
  } catch (error) {
    console.error('Database test failed:', error)
    return NextResponse.json({
      success: false,
      error: 'Database test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 
import { NextResponse } from 'next/server'
import { connectToDatabase } from '@/lib/mongodb'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const { db } = await connectToDatabase()
    const collections = await db.listCollections().toArray()
    
    return NextResponse.json({
      success: true,
      collections: collections.map(c => c.name),
      database: db.databaseName
    })
  } catch (error) {
    console.error('Database test failed:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
} 
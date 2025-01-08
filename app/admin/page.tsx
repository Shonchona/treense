'use client'

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { 
  BarChart3, 
  Calendar, 
  CheckCircle2, 
  XCircle,
  Loader2 
} from "lucide-react";

interface TreeRecord {
  _id: string;
  treeId: string;
  imageUrl: string;
  healthStatus: 'healthy' | 'unhealthy';
  timestamp: string;
  predictions: Array<{ className: string; probability: number }>;
}

interface Analytics {
  totalRecords: number;
  healthyCount: number;
  unhealthyCount: number;
  dailyAnalysis: Array<{
    date: string;
    count: number;
    healthyCount: number;
    unhealthyCount: number;
  }>;
}

export default function AdminDashboard() {
  const [records, setRecords] = useState<TreeRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [analytics, setAnalytics] = useState<Analytics>({
    totalRecords: 0,
    healthyCount: 0,
    unhealthyCount: 0,
    dailyAnalysis: []
  });

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      const response = await fetch('/api/admin/trees');
      const result = await response.json();
      
      if (result.success && Array.isArray(result.data)) {
        setRecords(result.data);
        processAnalytics(result.data);
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const processAnalytics = (data: TreeRecord[]) => {
    const healthyCount = data.filter(r => r.healthStatus === 'healthy').length;
    const unhealthyCount = data.filter(r => r.healthStatus === 'unhealthy').length;

    // Process daily analysis
    const dailyMap = new Map();
    data.forEach(record => {
      const date = new Date(record.timestamp).toLocaleDateString();
      const current = dailyMap.get(date) || { 
        count: 0, 
        healthyCount: 0, 
        unhealthyCount: 0 
      };
      
      current.count++;
      if (record.healthStatus === 'healthy') {
        current.healthyCount++;
      } else {
        current.unhealthyCount++;
      }
      
      dailyMap.set(date, current);
    });

    const dailyAnalysis = Array.from(dailyMap.entries()).map(([date, stats]) => ({
      date,
      ...stats
    }));

    setAnalytics({
      totalRecords: data.length,
      healthyCount,
      unhealthyCount,
      dailyAnalysis
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold mb-8">Tree Health Analytics Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Total Analyses</p>
              <h3 className="text-2xl font-bold">{analytics.totalRecords}</h3>
            </div>
            <BarChart3 className="h-8 w-8 text-gray-400" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Healthy Trees</p>
              <h3 className="text-2xl font-bold text-green-600">
                {analytics.healthyCount}
              </h3>
            </div>
            <CheckCircle2 className="h-8 w-8 text-green-500" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Unhealthy Trees</p>
              <h3 className="text-2xl font-bold text-red-600">
                {analytics.unhealthyCount}
              </h3>
            </div>
            <XCircle className="h-8 w-8 text-red-500" />
          </div>
        </Card>
      </div>

      <Tabs defaultValue="charts" className="space-y-6">
        <TabsList>
          <TabsTrigger value="charts">Charts</TabsTrigger>
          <TabsTrigger value="records">Recent Records</TabsTrigger>
        </TabsList>

        <TabsContent value="charts" className="space-y-6">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Daily Analysis Trend</h3>
            <div className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={analytics.dailyAnalysis}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Line 
                    type="monotone" 
                    dataKey="healthyCount" 
                    stroke="#22c55e" 
                    name="Healthy"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="unhealthyCount" 
                    stroke="#ef4444" 
                    name="Unhealthy"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="records">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Recent Analysis Records</h3>
            <div className="space-y-4">
              {records.map((record) => (
                <div 
                  key={record._id} 
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                >
                  <div className="flex items-center space-x-4">
                    <img 
                      src={`data:image/jpeg;base64,${record.imageUrl}`}
                      alt={`Tree ${record.treeId}`}
                      className="w-16 h-16 object-cover rounded"
                    />
                    <div>
                      <p className="text-sm text-gray-500">
                        <Calendar className="h-4 w-4 inline mr-1" />
                        {new Date(record.timestamp).toLocaleString()}
                      </p>
                      <Badge
                        variant={record.healthStatus === 'healthy' ? 'default' : 'destructive'}
                        className="mt-1"
                      >
                        {record.healthStatus}
                      </Badge>
                    </div>
                  </div>
                  <div className="text-sm text-gray-600">
                    {record.predictions.map((pred, idx) => (
                      <div key={idx} className="text-right">
                        <span className="font-medium">{pred.className}:</span>{' '}
                        <span className="font-mono">
                          {(pred.probability * 100).toFixed(1)}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@kit/ui/card';
import { Badge } from '@kit/ui/badge';

export function LMSAnalytics() {
  return (
    <div className="space-y-6">
      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded">
              <span className="text-xl">👤</span>
              <div className="flex-1">
                <p className="text-sm font-medium">Sarah Johnson completed "Advanced TypeScript"</p>
                <p className="text-xs text-muted-foreground">2 minutes ago</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded">
              <span className="text-xl">📚</span>
              <div className="flex-1">
                <p className="text-sm font-medium">New course "React Performance" published</p>
                <p className="text-xs text-muted-foreground">1 hour ago</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded">
              <span className="text-xl">💳</span>
              <div className="flex-1">
                <p className="text-sm font-medium">Acme Corp purchased 50 licenses</p>
                <p className="text-xs text-muted-foreground">3 hours ago</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded">
              <span className="text-xl">📊</span>
              <div className="flex-1">
                <p className="text-sm font-medium">Course completion rate improved by 12%</p>
                <p className="text-xs text-muted-foreground">6 hours ago</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Platform Health */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Platform Health</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Video Streaming</span>
              <Badge className="bg-green-100 text-green-800">Operational</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Quiz Engine</span>
              <Badge className="bg-green-100 text-green-800">Operational</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Progress Sync</span>
              <Badge className="bg-green-100 text-green-800">Operational</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Payment Processing</span>
              <Badge className="bg-yellow-100 text-yellow-800">Degraded</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top Performing Courses</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Introduction to React</p>
                <p className="text-xs text-muted-foreground">245 enrolled</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold">78%</p>
                <p className="text-xs text-muted-foreground">completion</p>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Advanced TypeScript</p>
                <p className="text-xs text-muted-foreground">156 enrolled</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold">85%</p>
                <p className="text-xs text-muted-foreground">completion</p>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Database Design</p>
                <p className="text-xs text-muted-foreground">89 enrolled</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold">92%</p>
                <p className="text-xs text-muted-foreground">completion</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Analytics */}
      <Card>
        <CardHeader>
          <CardTitle>Revenue Analytics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">$12,847</div>
              <p className="text-sm text-muted-foreground">This Month</p>
              <p className="text-xs text-green-600">+22% from last month</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">$156,240</div>
              <p className="text-sm text-muted-foreground">This Year</p>
              <p className="text-xs text-blue-600">+15% from last year</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">$52.40</div>
              <p className="text-sm text-muted-foreground">Avg. Revenue per User</p>
              <p className="text-xs text-purple-600">+8% from last month</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
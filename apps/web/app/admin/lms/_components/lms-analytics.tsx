'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@kit/ui/card';

export function LMSAnalytics() {
  return (
    <div className="space-y-6">
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
'use client';

import { Button } from '@kit/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@kit/ui/card';
import { Input } from '@kit/ui/input';
import { Textarea } from '@kit/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@kit/ui/select';
import { Switch } from '@kit/ui/switch';
import { Badge } from '@kit/ui/badge';

interface Course {
  id: string;
  title: string;
  description: string;
  status: 'draft' | 'published' | 'archived';
  lessons_count: number;
  enrollments_count: number;
  completion_rate: number;
  created_at: string;
  updated_at: string;
  version: string;
}

interface CourseSettingsProps {
  course: Course;
  onChange: (course: Course) => void;
}

export function CourseSettings({ course, onChange }: CourseSettingsProps) {
  const updateCourse = (updates: Partial<Course>) => {
    onChange({ ...course, ...updates });
  };


  return (
    <div className="space-y-6">
      {/* General Settings */}
      <Card>
        <CardHeader>
          <CardTitle>General Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Course Status</label>
              <Select
                value={course.status}
                onValueChange={(value: 'draft' | 'published' | 'archived') => {
                  updateCourse({ status: value });
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                      Draft
                    </div>
                  </SelectItem>
                  <SelectItem value="published">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      Published
                    </div>
                  </SelectItem>
                  <SelectItem value="archived">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-gray-500 rounded-full"></div>
                      Archived
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Course Category</label>
              <Select defaultValue="environment-safety">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="environment-safety">Environment and Safety</SelectItem>
                  <SelectItem value="osha">OSHA</SelectItem>
                  <SelectItem value="healthcare">Healthcare</SelectItem>
                  <SelectItem value="food-alcohol">Food & Alcohol</SelectItem>
                  <SelectItem value="hr-compliance">HR & Compliance</SelectItem>
                  <SelectItem value="industrial">Industrial</SelectItem>
                  <SelectItem value="insurance">Insurance</SelectItem>
                  <SelectItem value="real-estate">Real Estate</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Estimated Duration</label>
              <Input placeholder="e.g., 8 hours, 3 days, 2 weeks" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Certificate Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Certificate Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <label className="text-base font-medium">Certificate on Completion</label>
              <p className="text-sm text-muted-foreground">
                Generate a certificate when students complete the course
              </p>
            </div>
            <Switch defaultChecked />
          </div>
        </CardContent>
      </Card>

      {/* Learning Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Learning Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <label className="text-base font-medium">Sequential Learning</label>
              <p className="text-sm text-muted-foreground">
                Students must complete lessons in order
              </p>
            </div>
            <Switch defaultChecked />
          </div>

          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <label className="text-base font-medium">Progress Tracking</label>
              <p className="text-sm text-muted-foreground">
                Track student progress and completion
              </p>
            </div>
            <Switch defaultChecked />
          </div>


          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Content Completion Required (%)</label>
              <Input type="number" min="0" max="100" defaultValue="100" disabled />
              <p className="text-xs text-muted-foreground">
                100% of course content must be completed (fixed requirement)
              </p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Final Quiz Passing Score (%)</label>
              <Input type="number" min="0" max="100" defaultValue="80" />
              <p className="text-xs text-muted-foreground">
                Minimum score required on final quiz to pass the course
              </p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Time Limit (days)</label>
              <Input type="number" min="0" placeholder="No limit" />
              <p className="text-xs text-muted-foreground">
                Maximum days to complete the course
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* SEO Settings */}
      <Card>
        <CardHeader>
          <CardTitle>SEO Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">SEO Description</label>
            <Textarea
              placeholder="A brief description for search engines and course listings"
              className="min-h-[80px]"
            />
          </div>
        </CardContent>
      </Card>

      {/* Pricing Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Pricing Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Individual Price ($)</label>
              <Input type="number" min="0" step="0.01" placeholder="0.00" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Bulk License Price ($)</label>
              <Input type="number" min="0" step="0.01" placeholder="0.00" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
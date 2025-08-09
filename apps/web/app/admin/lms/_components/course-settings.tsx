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
import { UICourse } from '../_lib/types/data-contracts';

interface CourseSettingsProps {
  course: UICourse;
  onChange: (course: UICourse) => void;
}

export function CourseSettings({ course, onChange }: CourseSettingsProps) {
  const updateCourse = (updates: Partial<UICourse>) => {
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
              <Select 
                value={course.category || 'environment-safety'}
                onValueChange={(value) => updateCourse({ category: value })}
              >
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
              <Input 
                value={course.estimated_duration || ''}
                onChange={(e) => updateCourse({ estimated_duration: e.target.value })}
                placeholder="e.g., 8 hours, 3 days, 2 weeks" 
              />
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
            <Switch 
              checked={course.certificate_enabled ?? true}
              onCheckedChange={(checked) => updateCourse({ certificate_enabled: checked })}
            />
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
            <Switch 
              checked={course.sequential_completion ?? true}
              onCheckedChange={(checked) => updateCourse({ sequential_completion: checked })}
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <label className="text-base font-medium">Progress Tracking</label>
              <p className="text-sm text-muted-foreground">
                Track student progress and completion
              </p>
            </div>
            <Switch 
              checked={course.progress_tracking_enabled ?? true}
              onCheckedChange={(checked) => updateCourse({ progress_tracking_enabled: checked })}
            />
          </div>


          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Content Completion Required (%)</label>
              <Input type="number" min="0" max="100" value="100" disabled />
              <p className="text-xs text-muted-foreground">
                100% of course content must be completed (fixed requirement)
              </p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Final Quiz Passing Score (%)</label>
              <Input 
                type="number" 
                min="0" 
                max="100" 
                value={course.passing_score || 80}
                onChange={(e) => updateCourse({ passing_score: parseInt(e.target.value) || 80 })}
              />
              <p className="text-xs text-muted-foreground">
                Minimum score required on final quiz to pass the course
              </p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Time Limit (days)</label>
              <Input 
                type="number" 
                min="0" 
                value={course.time_limit_days || ''}
                onChange={(e) => updateCourse({ time_limit_days: e.target.value ? parseInt(e.target.value) : undefined })}
                placeholder="No limit" 
              />
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
              value={course.seo_description || ''}
              onChange={(e) => updateCourse({ seo_description: e.target.value })}
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
              <Input 
                type="number" 
                min="0" 
                step="0.01" 
                value={course.price || ''}
                onChange={(e) => updateCourse({ price: e.target.value ? parseFloat(e.target.value) : undefined })}
                placeholder="0.00" 
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Bulk License Price ($)</label>
              <Input 
                type="number" 
                min="0" 
                step="0.01" 
                value={course.bulk_price || ''}
                onChange={(e) => updateCourse({ bulk_price: e.target.value ? parseFloat(e.target.value) : undefined })}
                placeholder="0.00" 
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
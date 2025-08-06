'use client';

import { useState } from 'react';
import { Button } from '@kit/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@kit/ui/card';
import { toast } from 'sonner';
import { Spinner } from '@kit/ui/spinner';
import { CheckCircle, XCircle, AlertCircle } from 'lucide-react';

export function CourseSlugFixer() {
  const [loading, setLoading] = useState(false);
  const [diagnosis, setDiagnosis] = useState<any>(null);
  const [fixed, setFixed] = useState(false);

  const diagnose = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/diagnose-and-fix-courses');
      const data = await res.json();
      setDiagnosis(data);
      
      if (data.diagnosis?.issues?.length > 0) {
        toast.warning(`Found ${data.diagnosis.issues.length} issues`);
      } else {
        toast.success('No issues found!');
      }
    } catch (error) {
      toast.error('Failed to diagnose');
      console.error(error);
    }
    setLoading(false);
  };

  const fix = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/diagnose-and-fix-courses', {
        method: 'POST'
      });
      const data = await res.json();
      
      if (res.ok) {
        toast.success('Fixes applied successfully!');
        setFixed(true);
        // Re-diagnose to show current state
        await diagnose();
      } else {
        toast.error('Failed to apply fixes');
      }
    } catch (error) {
      toast.error('Failed to apply fixes');
      console.error(error);
    }
    setLoading(false);
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle>Course Slug Fixer</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Button onClick={diagnose} disabled={loading}>
            {loading ? <Spinner className="h-4 w-4 mr-2" /> : null}
            Diagnose Issues
          </Button>
          
          {diagnosis?.fixAvailable && !fixed && (
            <Button onClick={fix} variant="destructive" disabled={loading}>
              {loading ? <Spinner className="h-4 w-4 mr-2" /> : null}
              Apply Fixes
            </Button>
          )}
        </div>

        {diagnosis && (
          <div className="space-y-4">
            {/* Issues */}
            {diagnosis.diagnosis?.issues?.length > 0 ? (
              <div className="space-y-2">
                <h3 className="font-semibold text-red-600">Issues Found:</h3>
                {diagnosis.diagnosis.issues.map((issue: string, i: number) => (
                  <div key={i} className="flex items-start gap-2 text-sm">
                    <XCircle className="h-4 w-4 text-red-500 mt-0.5" />
                    <span>{issue}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle className="h-5 w-5" />
                <span>All course slugs are correct!</span>
              </div>
            )}

            {/* Courses to fix */}
            {diagnosis.diagnosis?.coursesToFix?.length > 0 && (
              <div className="space-y-2">
                <h3 className="font-semibold">Fixes to Apply:</h3>
                {diagnosis.diagnosis.coursesToFix.map((fix: any, i: number) => (
                  <div key={i} className="bg-muted p-3 rounded text-sm space-y-1">
                    <div className="font-medium">{fix.title}</div>
                    <div className="text-muted-foreground">
                      {fix.currentSlug} → {fix.targetSlug}
                    </div>
                    <div className="text-xs text-muted-foreground">{fix.reason}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Current courses */}
            {diagnosis.diagnosis?.currentCourses && (
              <details className="space-y-2">
                <summary className="cursor-pointer font-semibold">
                  Current Courses ({diagnosis.diagnosis.currentCourses.length})
                </summary>
                <div className="space-y-1 mt-2">
                  {diagnosis.diagnosis.currentCourses.map((course: any) => (
                    <div key={course.id} className="text-sm flex items-center gap-2">
                      <span className="font-mono text-xs">{course.slug || 'NO-SLUG'}</span>
                      <span className="text-muted-foreground">-</span>
                      <span>{course.title}</span>
                      <span className={`text-xs ${course.status === 'published' ? 'text-green-600' : 'text-gray-500'}`}>
                        ({course.status})
                      </span>
                    </div>
                  ))}
                </div>
              </details>
            )}
          </div>
        )}

        <div className="text-xs text-muted-foreground space-y-1 pt-4 border-t">
          <div className="flex items-start gap-1">
            <AlertCircle className="h-3 w-3 mt-0.5" />
            <span>This tool ensures course slugs match what the frontend expects.</span>
          </div>
          <div>Expected slugs: dot-hazmat-general, dot-hazmat, advanced-hazmat, epa-rcra</div>
        </div>
      </CardContent>
    </Card>
  );
}
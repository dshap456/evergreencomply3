'use client';

import { useState } from 'react';

import { Button } from '@kit/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@kit/ui/card';
import { Badge } from '@kit/ui/badge';
import { Input } from '@kit/ui/input';
import { Textarea } from '@kit/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@kit/ui/dialog';

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
  tags: string[];
}

interface CourseVersion {
  id: string;
  version: string;
  release_notes: string;
  created_at: string;
  created_by: string;
  is_active: boolean;
  lessons_count: number;
  changes_summary: string;
}

interface CourseVersioningProps {
  course: Course;
  onVersionChange: (version: string) => void;
}

const mockVersions: CourseVersion[] = [
  {
    id: '1',
    version: '2.1',
    release_notes: 'Added advanced TypeScript concepts and updated examples',
    created_at: '2024-02-15',
    created_by: 'admin@example.com',
    is_active: true,
    lessons_count: 18,
    changes_summary: '2 new lessons, 3 updated lessons'
  },
  {
    id: '2',
    version: '2.0',
    release_notes: 'Major update with new module on async patterns',
    created_at: '2024-01-20',
    created_by: 'admin@example.com',
    is_active: false,
    lessons_count: 16,
    changes_summary: '1 new module, 4 new lessons'
  },
  {
    id: '3',
    version: '1.2',
    release_notes: 'Fixed video quality issues and added Spanish translations',
    created_at: '2024-01-10',
    created_by: 'admin@example.com',
    is_active: false,
    lessons_count: 12,
    changes_summary: 'Bug fixes, language support'
  },
  {
    id: '4',
    version: '1.1',
    release_notes: 'Added quiz sections and improved content flow',
    created_at: '2024-01-05',
    created_by: 'admin@example.com',
    is_active: false,
    lessons_count: 12,
    changes_summary: '3 new quizzes added'
  },
  {
    id: '5',
    version: '1.0',
    release_notes: 'Initial release of the course',
    created_at: '2024-01-01',
    created_by: 'admin@example.com',
    is_active: false,
    lessons_count: 10,
    changes_summary: 'Initial version'
  }
];

export function CourseVersioning({ course, onVersionChange }: CourseVersioningProps) {
  const [versions, setVersions] = useState<CourseVersion[]>(mockVersions);
  const [showCreateVersion, setShowCreateVersion] = useState(false);
  const [showHotSwap, setShowHotSwap] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState<CourseVersion | null>(null);
  const [newVersionData, setNewVersionData] = useState({
    version: '',
    release_notes: '',
    changes_summary: ''
  });

  const createNewVersion = () => {
    const newVersion: CourseVersion = {
      id: Math.random().toString(36).substr(2, 9),
      version: newVersionData.version,
      release_notes: newVersionData.release_notes,
      changes_summary: newVersionData.changes_summary,
      created_at: new Date().toISOString(),
      created_by: 'admin@example.com',
      is_active: false,
      lessons_count: course.lessons_count
    };

    setVersions(prev => [newVersion, ...prev]);
    onVersionChange(newVersionData.version);
    setNewVersionData({ version: '', release_notes: '', changes_summary: '' });
    setShowCreateVersion(false);
  };

  const activateVersion = (versionId: string) => {
    setVersions(prev => prev.map(v => ({
      ...v,
      is_active: v.id === versionId
    })));
    
    const version = versions.find(v => v.id === versionId);
    if (version) {
      onVersionChange(version.version);
    }
    
    setShowHotSwap(false);
    setSelectedVersion(null);
  };

  const getVersionBadgeColor = (version: CourseVersion) => {
    if (version.is_active) return 'bg-green-100 text-green-800';
    return 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="space-y-6">
      {/* Current Version Info */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Current Version</CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowHotSwap(true)}>
                Hot Swap Version
              </Button>
              <Button onClick={() => setShowCreateVersion(true)}>
                + Create New Version
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="text-3xl font-bold text-blue-600">v{course.version}</div>
            <div>
              <Badge className="bg-green-100 text-green-800">Active</Badge>
              <p className="text-sm text-muted-foreground mt-1">
                {course.enrollments_count} students enrolled
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Version History */}
      <Card>
        <CardHeader>
          <CardTitle>Version History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {versions.map((version) => (
              <div key={version.id} className="border rounded-lg p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="text-lg font-bold">v{version.version}</div>
                    <Badge className={getVersionBadgeColor(version)}>
                      {version.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {new Date(version.created_at).toLocaleDateString()}
                  </div>
                </div>
                
                <div className="space-y-2 mb-4">
                  <p className="text-sm font-medium">{version.changes_summary}</p>
                  <p className="text-sm text-muted-foreground">{version.release_notes}</p>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>{version.lessons_count} lessons</span>
                    <span>By {version.created_by}</span>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedVersion(version);
                        setShowHotSwap(true);
                      }}
                      disabled={version.is_active}
                    >
                      {version.is_active ? 'Current' : 'Activate'}
                    </Button>
                    <Button variant="ghost" size="sm">
                      View Details
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Create New Version Dialog */}
      <Dialog open={showCreateVersion} onOpenChange={setShowCreateVersion}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Version</DialogTitle>
            <DialogDescription>
              Create a new version of this course. This will preserve the current version and allow you to make changes.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Version Number</label>
              <Input
                value={newVersionData.version}
                onChange={(e) => setNewVersionData(prev => ({ ...prev, version: e.target.value }))}
                placeholder="e.g., 2.1, 3.0"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Changes Summary</label>
              <Input
                value={newVersionData.changes_summary}
                onChange={(e) => setNewVersionData(prev => ({ ...prev, changes_summary: e.target.value }))}
                placeholder="e.g., 2 new lessons, 1 updated module"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Release Notes</label>
              <Textarea
                value={newVersionData.release_notes}
                onChange={(e) => setNewVersionData(prev => ({ ...prev, release_notes: e.target.value }))}
                placeholder="Describe what's new in this version..."
                className="min-h-[100px]"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateVersion(false)}>
              Cancel
            </Button>
            <Button 
              onClick={createNewVersion}
              disabled={!newVersionData.version || !newVersionData.release_notes}
            >
              Create Version
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Hot Swap Dialog */}
      <Dialog open={showHotSwap} onOpenChange={setShowHotSwap}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hot Swap Course Version</DialogTitle>
            <DialogDescription>
              Instantly switch the active version for all enrolled students. This is useful for bug fixes or urgent updates.
            </DialogDescription>
          </DialogHeader>

          {selectedVersion && (
            <Card className="bg-muted/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Switching to v{selectedVersion.version}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p className="text-sm">{selectedVersion.changes_summary}</p>
                  <p className="text-sm text-muted-foreground">{selectedVersion.release_notes}</p>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground pt-2 border-t">
                    <span>{selectedVersion.lessons_count} lessons</span>
                    <span>Created {new Date(selectedVersion.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <span className="text-yellow-600">⚠️</span>
              <div className="text-sm">
                <p className="font-medium text-yellow-800">Important Notes:</p>
                <ul className="list-disc list-inside text-yellow-700 mt-1 space-y-1">
                  <li>All {course.enrollments_count} enrolled students will see the new version immediately</li>
                  <li>Student progress will be preserved where possible</li>
                  <li>New or changed content may reset progress for affected lessons</li>
                  <li>This action cannot be undone easily</li>
                </ul>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowHotSwap(false)}>
              Cancel
            </Button>
            <Button 
              onClick={() => selectedVersion && activateVersion(selectedVersion.id)}
              className="bg-yellow-600 hover:bg-yellow-700"
            >
              Confirm Hot Swap
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
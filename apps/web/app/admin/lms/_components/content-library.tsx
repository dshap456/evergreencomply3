'use client';

import { useState } from 'react';

import { Button } from '@kit/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@kit/ui/card';
import { Badge } from '@kit/ui/badge';
import { Input } from '@kit/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@kit/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@kit/ui/tabs';

interface ContentItem {
  id: string;
  title: string;
  type: 'video' | 'text' | 'quiz' | 'asset';
  status: 'draft' | 'published' | 'archived';
  created_at: string;
  updated_at: string;
  file_size?: string;
  duration?: string;
  usage_count: number;
  tags: string[];
}

const mockContent: ContentItem[] = [
  {
    id: '1',
    title: 'Introduction to React Hooks',
    type: 'video',
    status: 'published',
    created_at: '2024-01-15',
    updated_at: '2024-01-20',
    file_size: '125 MB',
    duration: '15:32',
    usage_count: 3,
    tags: ['React', 'Hooks', 'JavaScript']
  },
  {
    id: '2',
    title: 'TypeScript Interfaces Deep Dive',
    type: 'text',
    status: 'published',
    created_at: '2024-01-18',
    updated_at: '2024-01-25',
    usage_count: 2,
    tags: ['TypeScript', 'Interfaces', 'Advanced']
  },
  {
    id: '3',
    title: 'JavaScript Fundamentals Quiz',
    type: 'quiz',
    status: 'published',
    created_at: '2024-01-20',
    updated_at: '2024-01-22',
    usage_count: 5,
    tags: ['JavaScript', 'Assessment', 'Fundamentals']
  },
  {
    id: '4',
    title: 'React Component Lifecycle Diagram',
    type: 'asset',
    status: 'published',
    created_at: '2024-01-25',
    updated_at: '2024-01-25',
    file_size: '2.1 MB',
    usage_count: 4,
    tags: ['React', 'Diagram', 'Reference']
  },
  {
    id: '5',
    title: 'Advanced TypeScript Patterns',
    type: 'video',
    status: 'draft',
    created_at: '2024-02-01',
    updated_at: '2024-02-05',
    file_size: '89 MB',
    duration: '12:45',
    usage_count: 0,
    tags: ['TypeScript', 'Advanced', 'Patterns']
  }
];

export function ContentLibrary() {
  const [content, setContent] = useState<ContentItem[]>(mockContent);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [activeTab, setActiveTab] = useState('browse');

  const filteredContent = content.filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesType = typeFilter === 'all' || item.type === typeFilter;
    const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
    return matchesSearch && matchesType && matchesStatus;
  });

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'video': return '📹';
      case 'text': return '📄';
      case 'quiz': return '📝';
      case 'asset': return '📎';
      default: return '📄';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'video': return 'bg-blue-100 text-blue-800';
      case 'text': return 'bg-green-100 text-green-800';
      case 'quiz': return 'bg-purple-100 text-purple-800';
      case 'asset': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published': return 'bg-green-100 text-green-800';
      case 'draft': return 'bg-yellow-100 text-yellow-800';
      case 'archived': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Content Library</h2>
          <p className="text-muted-foreground">Manage reusable content across all courses</p>
        </div>
        <Button>+ Upload Content</Button>
      </div>

      {/* Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="browse">Browse Content</TabsTrigger>
          <TabsTrigger value="upload">Upload Manager</TabsTrigger>
          <TabsTrigger value="analytics">Usage Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="browse" className="space-y-6">
          {/* Filters */}
          <div className="flex gap-4">
            <Input
              placeholder="Search content..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="video">📹 Videos</SelectItem>
                <SelectItem value="text">📄 Text</SelectItem>
                <SelectItem value="quiz">📝 Quizzes</SelectItem>
                <SelectItem value="asset">📎 Assets</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="published">Published</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Content Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredContent.map((item) => (
              <Card key={item.id} className="cursor-pointer hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{getTypeIcon(item.type)}</span>
                      <div>
                        <Badge variant="secondary" className={getTypeColor(item.type)}>
                          {item.type}
                        </Badge>
                      </div>
                    </div>
                    <Badge variant="secondary" className={getStatusColor(item.status)}>
                      {item.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h3 className="font-medium line-clamp-2">{item.title}</h3>
                  </div>

                  {/* Content Details */}
                  <div className="text-sm text-muted-foreground space-y-1">
                    {item.duration && (
                      <div className="flex justify-between">
                        <span>Duration:</span>
                        <span>{item.duration}</span>
                      </div>
                    )}
                    {item.file_size && (
                      <div className="flex justify-between">
                        <span>Size:</span>
                        <span>{item.file_size}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span>Used in:</span>
                      <span>{item.usage_count} courses</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Updated:</span>
                      <span>{new Date(item.updated_at).toLocaleDateString()}</span>
                    </div>
                  </div>

                  {/* Tags */}
                  <div className="flex flex-wrap gap-1">
                    {item.tags.slice(0, 3).map((tag) => (
                      <Badge key={tag} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                    {item.tags.length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{item.tags.length - 3}
                      </Badge>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-2">
                    <Button variant="outline" size="sm" className="flex-1">
                      Edit
                    </Button>
                    <Button variant="outline" size="sm" className="flex-1">
                      Use
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredContent.length === 0 && (
            <Card className="p-12 text-center">
              <div className="space-y-4">
                <div className="text-4xl">📚</div>
                <div>
                  <h3 className="text-lg font-medium">No content found</h3>
                  <p className="text-muted-foreground">
                    {searchTerm || typeFilter !== 'all' || statusFilter !== 'all'
                      ? 'Try adjusting your filters'
                      : 'Upload your first content to get started'}
                  </p>
                </div>
                {!searchTerm && typeFilter === 'all' && statusFilter === 'all' && (
                  <Button>Upload Content</Button>
                )}
              </div>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="upload" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Upload Manager</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center">
                <div className="space-y-4">
                  <div className="text-4xl">📁</div>
                  <div>
                    <h3 className="text-lg font-medium">Upload Content</h3>
                    <p className="text-muted-foreground">
                      Drag and drop files here, or click to select
                    </p>
                  </div>
                  <Button>Choose Files</Button>
                  <div className="text-xs text-muted-foreground space-y-1">
                    <p>Supported formats: MP4, PDF, DOCX, PNG, JPG, SVG</p>
                    <p>Maximum file size: 500MB</p>
                  </div>
                </div>
              </div>

              {/* Upload Queue (if there were uploads) */}
              <div className="mt-6">
                <h4 className="font-medium mb-3">Recent Uploads</h4>
                <div className="text-center py-8 text-muted-foreground">
                  No recent uploads
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          {/* Content Usage Analytics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total Content</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{content.length}</div>
                <p className="text-xs text-muted-foreground">+2 from last month</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Storage Used</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">2.4 GB</div>
                <p className="text-xs text-muted-foreground">of 10 GB limit</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Most Used</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">📝</div>
                <p className="text-xs text-muted-foreground">Quizzes (65%)</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Avg. Usage</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">2.8</div>
                <p className="text-xs text-muted-foreground">courses per content</p>
              </CardContent>
            </Card>
          </div>

          {/* Most Popular Content */}
          <Card>
            <CardHeader>
              <CardTitle>Most Popular Content</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {content
                  .sort((a, b) => b.usage_count - a.usage_count)
                  .slice(0, 5)
                  .map((item, index) => (
                    <div key={item.id} className="flex items-center gap-4 p-3 border rounded">
                      <div className="flex items-center justify-center w-8 h-8 bg-muted rounded text-sm font-medium">
                        {index + 1}
                      </div>
                      <span className="text-xl">{getTypeIcon(item.type)}</span>
                      <div className="flex-1">
                        <p className="font-medium">{item.title}</p>
                        <p className="text-sm text-muted-foreground">
                          Used in {item.usage_count} courses
                        </p>
                      </div>
                      <Badge variant="secondary" className={getTypeColor(item.type)}>
                        {item.type}
                      </Badge>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
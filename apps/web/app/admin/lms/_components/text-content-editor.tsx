'use client';

import { useState } from 'react';

import { Button } from '@kit/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@kit/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@kit/ui/tabs';
import { Textarea } from '@kit/ui/textarea';

interface TextContentEditorProps {
  lessonId: string;
  onContentChange: () => void;
}

export function TextContentEditor({ lessonId, onContentChange }: TextContentEditorProps) {
  const [content, setContent] = useState('');
  const [activeTab, setActiveTab] = useState('editor');

  const handleContentChange = (newContent: string) => {
    setContent(newContent);
    onContentChange();
  };

  // Simple markdown-like rendering for preview
  const renderPreview = (text: string) => {
    return text
      .split('\n')
      .map((line, index) => {
        // Headers
        if (line.startsWith('# ')) {
          return <h1 key={index} className="text-3xl font-bold mb-4">{line.slice(2)}</h1>;
        }
        if (line.startsWith('## ')) {
          return <h2 key={index} className="text-2xl font-bold mb-3">{line.slice(3)}</h2>;
        }
        if (line.startsWith('### ')) {
          return <h3 key={index} className="text-xl font-bold mb-2">{line.slice(4)}</h3>;
        }
        
        // Bold text
        const boldText = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        
        // Italic text
        const italicText = boldText.replace(/\*(.*?)\*/g, '<em>$1</em>');
        
        // Code inline
        const codeText = italicText.replace(/`(.*?)`/g, '<code class="bg-muted px-1 rounded">$1</code>');
        
        // Empty lines
        if (line.trim() === '') {
          return <br key={index} />;
        }
        
        // Regular paragraphs
        return (
          <p 
            key={index} 
            className="mb-2"
            dangerouslySetInnerHTML={{ __html: codeText }}
          />
        );
      });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Text Content</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="editor">Editor</TabsTrigger>
            <TabsTrigger value="preview">Preview</TabsTrigger>
          </TabsList>

          <TabsContent value="editor" className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Content</label>
                <div className="flex gap-2 text-xs text-muted-foreground">
                  <span>Supports: **bold**, *italic*, `code`, # headers</span>
                </div>
              </div>
              <Textarea
                value={content}
                onChange={(e) => handleContentChange(e.target.value)}
                placeholder="Enter your lesson content here...

You can use basic formatting:
# Main Heading
## Section Heading  
### Subsection

**Bold text** and *italic text*

`inline code` for technical terms

Regular paragraphs work normally."
                className="min-h-[500px] font-mono"
              />
            </div>

            {/* Formatting Help */}
            <Card className="bg-muted/50">
              <CardHeader className="pb-2">
                <h4 className="text-sm font-medium">Formatting Guide</h4>
              </CardHeader>
              <CardContent className="text-xs space-y-1">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p><code># Heading 1</code> → <strong>Large heading</strong></p>
                    <p><code>## Heading 2</code> → <strong>Medium heading</strong></p>
                    <p><code>### Heading 3</code> → <strong>Small heading</strong></p>
                  </div>
                  <div>
                    <p><code>**bold text**</code> → <strong>bold text</strong></p>
                    <p><code>*italic text*</code> → <em>italic text</em></p>
                    <p><code>`code`</code> → <code className="bg-muted px-1 rounded">code</code></p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="preview" className="space-y-4">
            <div className="min-h-[500px] p-6 border rounded-lg bg-background">
              {content ? (
                <div className="prose prose-sm max-w-none">
                  {renderPreview(content)}
                </div>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  <div className="text-center">
                    <div className="text-4xl mb-4"></div>
                    <p>Start writing content to see the preview</p>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>

        {/* Actions */}
        <div className="flex justify-between items-center pt-4 border-t">
          <div className="text-xs text-muted-foreground">
            {content.length} characters
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              Save Draft
            </Button>
            <Button size="sm">
              Save & Publish
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
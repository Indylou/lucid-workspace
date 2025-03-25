import React from 'react';
import { 
  EnhancedRichTextEditor, 
  DocumentEditor 
} from '../components/tiptap/enhanced-rich-text-editor';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';

export default function TiptapEnhancedPage() {
  const [savedDocuments, setSavedDocuments] = React.useState<Array<{ title: string; content: string }>>([]);
  
  const [editableContent, setEditableContent] = React.useState(`
    <h1>Enhanced Rich Text Editor</h1>
    <p>This is a fully <strong>controlled</strong> editor that demonstrates advanced features. Notice how the formatting is preserved while editing.</p>
    <h2>Formatting Examples</h2>
    <p>Below you'll find examples of various formatting options available:</p>
    <ul>
      <li>Text formatting: <em>italic</em>, <strong>bold</strong>, and <u>underline</u></li>
      <li>Text <span style="color: #ef4444">color</span> and <mark style="background-color: #fef9c3">highlighting</mark></li>
      <li>Font families: <span style="font-family: serif">Serif</span>, <span style="font-family: monospace">Monospace</span></li>
    </ul>
    <h3>Structured Content</h3>
    <p>The editor supports various content structures:</p>
    <ol>
      <li>Ordered lists like this one</li>
      <li>Unordered lists (shown above)</li>
      <li>Headings (H1, H2, H3)</li>
      <li>Code blocks and inline code</li>
    </ol>
    <pre><code>// Example code block
function greeting() {
  console.log("Hello, Tiptap!");
}</code></pre>
    <p>Inline code looks like this: <code>const editor = useEditor()</code></p>
    
    <blockquote>
      <p>You can also include blockquotes for emphasizing important points or quotes.</p>
      <p>The editor preserves formatting in both edit and preview modes!</p>
    </blockquote>
    
    <p>Every change you make is reflected in React state through the controlled component pattern.</p>
  `.trim().replace(/\n\s+/g, '\n'));

  const handleSaveDocument = (data: { title: string; content: string }) => {
    setSavedDocuments((prev) => [...prev, data]);
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-8 text-center">Advanced Rich Text Editing</h1>
      
      <Tabs defaultValue="editor" className="mb-8">
        <TabsList className="grid w-full grid-cols-2 mb-4">
          <TabsTrigger value="editor">Enhanced Editor</TabsTrigger>
          <TabsTrigger value="document">Document Editor</TabsTrigger>
        </TabsList>
        
        <TabsContent value="editor">
          <div className="mb-4">
            <Card>
              <CardHeader>
                <CardTitle>Enhanced Rich Text Editor</CardTitle>
                <CardDescription>
                  A fully controlled editor with consistent formatting in both edit and preview modes
                </CardDescription>
              </CardHeader>
              <CardContent>
                <EnhancedRichTextEditor
                  value={editableContent}
                  onChange={setEditableContent}
                  previewMode={true}
                />
                
                <div className="mt-6 p-4 border rounded-md bg-muted">
                  <h3 className="text-lg font-medium mb-2">HTML Output</h3>
                  <pre className="text-xs overflow-auto max-h-[200px] p-2 bg-background rounded">
                    {editableContent}
                  </pre>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="document">
          <Card>
            <CardHeader>
              <CardTitle>Document Editor</CardTitle>
              <CardDescription>
                A complete document editor with title, content, and save functionality
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DocumentEditor onSave={handleSaveDocument} />
              
              {savedDocuments.length > 0 && (
                <div className="mt-8">
                  <h3 className="text-xl font-semibold mb-4">Saved Documents</h3>
                  <div className="grid gap-4 md:grid-cols-2">
                    {savedDocuments.map((doc, index) => (
                      <div key={index} className="border rounded-md p-4">
                        <h4 className="text-lg font-medium mb-2">{doc.title}</h4>
                        <div 
                          className="prose prose-sm max-w-none border-t pt-2 mt-2" 
                          dangerouslySetInnerHTML={{ __html: doc.content }} 
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      <div className="mt-8 pt-6 border-t text-center">
        <a href="/tiptap" className="text-primary hover:underline">
          Go to Basic Tiptap Demo
        </a>
      </div>
    </div>
  );
} 
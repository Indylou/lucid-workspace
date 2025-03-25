"use client"

import * as React from "react"
import { RichTextEditor, ControlledRichTextEditor } from "./rich-text-editor"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../ui/card"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../ui/tabs"
import { Button } from "../ui/button"

export function TiptapDemo() {
  const [content, setContent] = React.useState('<h2>Welcome to the Tiptap editor!</h2><p>This is a <strong>rich text editor</strong> built with Tiptap and styled with our design system.</p><ul><li>Create lists</li><li>Use <em>formatting</em></li><li><code>Add code blocks</code></li></ul>')
  const [savedContent, setSavedContent] = React.useState(content)

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-8 text-center">Tiptap Rich Text Editor</h1>
      
      <Tabs defaultValue="uncontrolled" className="mb-8">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="uncontrolled">Uncontrolled Editor</TabsTrigger>
          <TabsTrigger value="controlled">Controlled Editor</TabsTrigger>
        </TabsList>
        
        <TabsContent value="uncontrolled" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Uncontrolled Editor</CardTitle>
              <CardDescription>
                This editor maintains its own internal state.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <RichTextEditor
                initialContent={content}
                onChange={(html) => setContent(html)}
              />
            </CardContent>
            <CardFooter>
              <Button onClick={() => setSavedContent(content)}>
                Save Content
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
        
        <TabsContent value="controlled" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Controlled Editor</CardTitle>
              <CardDescription>
                This editor's content is controlled by React state.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ControlledRichTextEditor
                value={content}
                onChange={setContent}
              />
            </CardContent>
            <CardFooter className="flex gap-2">
              <Button onClick={() => setSavedContent(content)}>
                Save Content
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setContent('<p>Reset content</p>')}
              >
                Reset Content
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
      
      <Card>
        <CardHeader>
          <CardTitle>Saved Content</CardTitle>
          <CardDescription>HTML output from the editor</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="p-4 bg-muted rounded-md overflow-auto">
            <pre className="text-xs">{savedContent}</pre>
          </div>
        </CardContent>
        <CardFooter>
          <div
            className="w-full p-4 border rounded-md prose prose-sm max-w-none"
            dangerouslySetInnerHTML={{ __html: savedContent }}
          />
        </CardFooter>
      </Card>
    </div>
  )
} 
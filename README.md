# Lucid Team

A modern document collaboration platform with embedded todos, project management, and team coordination features.

## Project Structure

```
src/
├── components/        # Shared UI components
│   ├── ui/            # Base UI components (from shadcn/ui)
│   ├── dashboard/     # Dashboard-specific components
│   └── tiptap/        # Rich text editor components
├── features/          # Feature-based modules
│   └── todos/         # Todo feature
│       ├── components/  # Todo-related components
│       ├── hooks/       # Todo hooks and context
│       ├── lib/         # Todo extensions and services
│       └── utils/       # Todo utilities
├── lib/               # Shared utilities and services
├── pages/             # Main application pages
└── styles/            # Global styles
```

## Features

- Rich text editing with embedded todo items
- Task management with due dates and assignees
- Project organization and collaboration
- Dashboard with analytics and activity tracking

## Todo Feature Organization

The Todo feature is organized into a cohesive module structure:

- **Components**: UI components for displaying and interacting with todos
  - `TodoItems.tsx`: Combined todo item components (simple and enhanced)
  - `TodoEditor.tsx`: Editor for creating/editing todos
  - `todo-enabled-editor.tsx`: Rich text editor with todo support
  - `todo-toolbar.tsx`: Toolbar for todo operations

- **Lib**: Extensions and services for todos
  - `todo-extensions.ts`: Combined TipTap extensions for todos
  - `todo-service.ts`: API services for todo CRUD operations

- **Hooks**: State management
  - `todo-context.tsx`: Context provider for todos

## Technologies

- React
- TypeScript
- TipTap rich text editor
- Supabase (authentication and database)
- Shadcn UI components

## Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev
```

## Overview

Lucid Team is a dashboard application providing a clean, accessible, and customizable user interface. It features a purple-themed design system with both light and dark mode support.

## Getting Started

### Prerequisites

- Node.js (v18+)
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/lucid-team.git
cd lucid-team

# Install dependencies
npm install
```

### Development

```bash
# Start the development server
npm start

# Build for production
npm run build
```

## UI Component Guidelines

### Using UI Components

Our UI components are built with Radix UI primitives and styled with Tailwind CSS. They follow these patterns:

1. **Direct Import Method**: You can directly import Radix UI primitives
   ```tsx
   import { Tabs, TabsList, TabsTrigger } from "@radix-ui/react-tabs";
   ```

2. **Shadcn-like Wrapper Method**: Use our pre-styled components
   ```tsx
   import { Tabs, TabsList, TabsTrigger } from "../ui/tabs";
   ```

### Component Rules

1. **Always use the "use client" directive** at the top of component files for React Server Components compatibility.

2. **Export named components** rather than default exports to maintain consistency.

3. **Use the `cn()` utility** for combining class names:
   ```tsx
   import { cn } from "../lib/utils";
   
   <div className={cn("base-class", condition && "conditional-class", className)}>
   ```

4. **Maintain proper TypeScript interfaces** for component props:
   ```tsx
   interface ButtonProps 
     extends React.ButtonHTMLAttributes<HTMLButtonElement>,
       VariantProps<typeof buttonVariants> {
     asChild?: boolean
   }
   ```

5. **Use the correct ref forwarding pattern**:
   ```tsx
   const Component = React.forwardRef<HTMLElementType, ComponentProps>(
     ({ className, ...props }, ref) => {
       return <Element ref={ref} className={cn("classes", className)} {...props} />
     }
   )
   Component.displayName = "Component"
   ```

### Theme

We use a custom color theme defined in CSS variables. The primary color is a beautiful purple shade with carefully selected supporting colors.

Access theme colors in Tailwind using:
```css
className="bg-primary text-primary-foreground"
```

Data visualization charts use our special chart color palette:
```css
className="fill-chart-1 stroke-chart-2"
```

### Dark Mode

Our application supports dark mode through the `.dark` class and CSS variables. Toggle it with a dark mode switcher component.

## Best Practices

1. **Keep components small and focused** on a single responsibility.

2. **Use composition** over inheritance for component flexibility.

3. **Maintain accessibility** by leveraging Radix UI's built-in accessibility features.

4. **Follow naming conventions**:
   - Component files: PascalCase.tsx
   - Utility files: camelCase.ts
   - CSS files: kebab-case.css

5. **Document complex components** with JSDoc comments.

6. **Test UI components** thoroughly for functionality and accessibility.

## Troubleshooting

### Common Issues

- **Cannot find module '@radix-ui/...'**: Ensure you've installed all Radix UI dependencies.
  ```bash
  npm install @radix-ui/react-[component-name]
  ```

- **Styling issues**: Make sure Tailwind is properly configured and processing your CSS.

- **Type errors**: Check that you're using proper TypeScript interfaces for your components.

## License

MIT

## Setup

1. Install dependencies:
```bash
npm install
```

2. Configure Supabase:
   - Create a new project at [Supabase](https://supabase.com)
   - Copy your project URL and anon key from the project settings
   - Create a `.env` file in the root directory with:
   ```
   REACT_APP_SUPABASE_URL=your_project_url
   REACT_APP_SUPABASE_ANON_KEY=your_anon_key
   ```

3. Start the development server:
```bash
npm start
```

## Features

- Rich text editing with Tiptap
- Task management with checkboxes
- User mentions with @username
- Real-time collaboration
- Project organization

## Development

See [README-DEV.md](./README-DEV.md) for detailed development instructions.

## Enhanced Todo Functionality

The Todo functionality has been redesigned to be more flexible, customizable, and better integrated with the TipTap editor. Key improvements include:

### Custom Todo Node Extension

- Implemented a dedicated `TodoExtension` that supports rich metadata (ID, completion status, due date, assignments, etc.)
- Added support for custom rendering of todo items using ReactNodeViewRenderer
- Added callbacks for todo item updates to sync with external systems

### NodeView Based Rendering

- Created a `TodoNodeView` component that provides a rich UI for todo items in the editor
- Support for displaying assignees, due dates, and project associations
- Automatic styling for overdue items

### Improved Data Synchronization

- Real-time synchronization between editor state and database
- Bidirectional updates: changes in external task lists reflect in the editor and vice versa
- Optimized database operations with debounced updates

### Enhanced User Experience

- Added toolbar controls for todo creation, assignment, and due date setting
- Implemented context-aware toolbar that only shows relevant actions based on cursor position
- Keyboard shortcuts for quick todo creation and management

### Using the Todo Functionality

To add a todo in your document:

1. Click the todo button in the toolbar or use the `/todo` command
2. Type your todo content
3. Optionally add:
   - Due date by clicking the calendar icon
   - Assignee by clicking the @mention button
   - Project by using the project selector

Todos are automatically synced with your database and can be viewed and managed in dedicated task list views.

### Customization Options

The todo system can be customized in several ways:

```typescript
// Configure the todo extension with custom options
TodoExtension.configure({
  HTMLAttributes: {
    class: 'my-custom-todo-class',
  },
  onToggle: (id, completed) => {
    // Custom callback when a todo is toggled
    console.log(`Todo ${id} was ${completed ? 'completed' : 'reopened'}`);
  },
  onUpdate: (attrs) => {
    // Custom callback when todo attributes are updated
    console.log('Todo updated:', attrs);
  },
  renderNodeView: (props) => {
    // Optional custom rendering for todo items
    return <MyCustomTodoRenderer {...props} />;
  }
})
```

# Lucid Team

A modern React application with a beautiful UI built using Radix UI primitives and Tailwind CSS.

![Lucid Team](https://via.placeholder.com/800x400?text=Lucid+Team)

## Overview

Lucid Team is a dashboard application providing a clean, accessible, and customizable user interface. It features a purple-themed design system with both light and dark mode support.

## Technologies

- **React**: UI library
- **TypeScript**: Type-safe JavaScript
- **Tailwind CSS**: Utility-first CSS framework
- **Radix UI**: Unstyled, accessible UI primitives
- **Lucide React**: Beautiful icons

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

## Project Structure

```
src/
├── components/        # UI components
│   ├── ui/            # Base UI components
│   └── dashboard/     # Dashboard-specific components
├── lib/               # Utility functions
├── styles/            # Global styles
│   └── globals.css    # Global CSS and theme variables
├── App.tsx            # Main application component
└── index.tsx          # Application entry point
```

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

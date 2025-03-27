# Environment Configuration Guide

This project uses environment variables to manage configuration across different environments (local development, staging, production).

## Available Environment Files

- `.env` - Local development environment configuration
- `.env.production` - Production environment configuration
- `.env.example` - Example template showing all available configuration options

## Environment Variables

### Supabase Configuration

- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key for administrative access
- `SUPABASE_ANON_KEY` - Anonymous public key for client-side access

### Application Environment

- `NODE_ENV` - Set to `development`, `staging`, or `production`

### Debug Options

- `DEBUG_LOGGING` - Enable/disable detailed logging (`true`/`false`)
- `DEBUG_SUPABASE` - Enable/disable Supabase API request/response logging (`true`/`false`)

## Setup Instructions

1. Copy `.env.example` to `.env` for local development
2. Update the values in the `.env` file with your own Supabase credentials
3. For production deployment, copy `.env.example` to `.env.production` and update with production values

## Environment Switching

The app will automatically load the appropriate environment variables based on:

- The `NODE_ENV` setting
- The specific `.env` file used

## Security Considerations

- **Never commit** real API keys or secrets to your repository
- The `.env` and `.env.production` files are added to `.gitignore` to prevent accidental commits
- Only commit the `.env.example` file with placeholder values

## Usage in Code

Access configuration values through the `config` object:

```typescript
import config from './lib/config';

// Check environment
if (config.isDev) {
  // Development-only code
}

// Access Supabase config
const supabaseUrl = config.supabase.url;

// Check debug settings
if (config.debug.logging) {
  console.log('Debug logging is enabled');
}
``` 
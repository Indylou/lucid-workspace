/**
 * Configuration manager for the application
 * Handles loading environment variables with proper typing and defaults
 */

// Environment type
type Environment = 'development' | 'staging' | 'production';

// Configuration interface
interface Config {
  // Supabase
  supabase: {
    url: string;
    serviceRoleKey: string;
    anonKey: string;
  };
  
  // Environment
  nodeEnv: Environment;
  
  // Debug options
  debug: {
    logging: boolean;
    supabase: boolean;
  };
  
  // Is production environment
  isProd: boolean;
}

// Helper to get env variable with fallback
function getEnv(key: string, fallback: string = ''): string {
  // For Vite/Create React App
  if (typeof import.meta !== 'undefined') {
    const { env = {} } = import.meta as any;
    return env[key] || fallback;
  }
  
  // For Node.js/Next.js
  if (typeof process !== 'undefined' && process.env) {
    return process.env[key] || fallback;
  }
  
  // If neither is available, use fallback
  return fallback;
}

// Get boolean env variable
function getBoolEnv(key: string, fallback: boolean = false): boolean {
  const value = getEnv(key, fallback ? 'true' : 'false').toLowerCase();
  return value === 'true' || value === '1' || value === 'yes';
}

// Create the config object
const config: Config = {
  supabase: {
    url: getEnv('SUPABASE_URL', 'https://tygibsmxqdslroimelkh.supabase.co'),
    serviceRoleKey: getEnv('SUPABASE_SERVICE_ROLE_KEY', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR5Z2lic214cWRzbHJvaW1lbGtoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0Mjg3MDMwMiwiZXhwIjoyMDU4NDQ2MzAyfQ.2ik-HtsUm-V-xkBIYWiWGlIRVZoGIU6uBcYK8tGVFVg'),
    anonKey: getEnv('SUPABASE_ANON_KEY', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR5Z2lic214cWRzbHJvaW1lbGtoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI4NzAzMDIsImV4cCI6MjA1ODQ0NjMwMn0.ar3hEgext-BNJtibzCFPAMQBStNtmS02Y8aXBLnjwcU'),
  },
  
  nodeEnv: getEnv('NODE_ENV', 'development') as Environment,
  
  debug: {
    logging: getBoolEnv('DEBUG_LOGGING', true),
    supabase: getBoolEnv('DEBUG_SUPABASE', true),
  },
  
  get isProd() {
    return this.nodeEnv === 'production';
  },
};

export default config; 
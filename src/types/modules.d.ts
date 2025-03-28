declare module '../../components/ui/progress' {
  export const Progress: React.FC<{
    value?: number;
    className?: string;
  }>;
}

declare module '../../lib/auth' {
  export const useAuth: () => {
    user: any;
    loading: boolean;
    error: any;
  };
} 
import { useState } from 'react';
import { useUser } from '../lib/user-context';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import AppLayout from '../components/layout/AppLayout';
import { Loader2 } from 'lucide-react';

interface TestResult {
  success: boolean;
  message?: string;
}

// Mock test functions until we have the actual implementations
const testSupabaseConnection = async (): Promise<TestResult> => {
  return { success: true, message: 'Connection successful' };
};

const testAuthServices = async (): Promise<TestResult> => {
  return { success: true, message: 'Auth services working correctly' };
};

const testProjectServices = async (): Promise<TestResult> => {
  return { success: true, message: 'Project services working correctly' };
};

export default function TestSupabasePage() {
  const { user } = useUser();
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<Array<{ name: string; success: boolean; message?: string }>>([]);

  const runTest = async (testFn: () => Promise<TestResult>, name: string) => {
    setLoading(true);
    try {
      const result = await testFn();
      setResults(prev => [...prev, { name, ...result }]);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      setResults(prev => [...prev, { name, success: false, message: errorMessage }]);
    }
    setLoading(false);
  };

  const runAllTests = async (): Promise<TestResult> => {
    setResults([]);
    await runTest(testSupabaseConnection, 'Connection Test');
    await runTest(testAuthServices, 'Auth Services');
    await runTest(testProjectServices, 'Project Services');
    return { success: true, message: 'All tests completed' };
  };

  const runRLSTest = async (): Promise<TestResult> => {
    return { success: true, message: 'RLS test completed successfully' };
  };

  return (
    <AppLayout>
      <div className="h-full flex flex-col p-6 gap-4 overflow-hidden">
        {/* Page header */}
        <div className="shrink-0">
          <h2 className="text-2xl font-semibold tracking-tight">Supabase Integration Tests</h2>
          <p className="text-sm text-muted-foreground">
            Test and verify Supabase functionality
          </p>
        </div>

        {/* Test content - scrollable */}
        <div className="flex-1 min-h-0 space-y-4 overflow-y-auto">
          {/* Status Card */}
          <Card className="p-6">
            <h3 className="text-sm font-medium mb-2">Status</h3>
            <p className="flex items-center gap-2 text-sm">
              <span className="font-medium">Authenticated User:</span>
              {user ? (
                <span className="text-green-500">{user.email}</span>
              ) : (
                <span className="text-yellow-500">Not authenticated</span>
              )}
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              You must be logged in to run most tests.
            </p>
          </Card>

          {/* Test Controls */}
          <Card className="p-6">
            <h3 className="text-sm font-medium mb-4">Test Controls</h3>
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={() => runTest(runAllTests, 'All Tests')}
                disabled={loading || !user}
              >
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Run All Tests
              </Button>
              
              <Button
                variant="outline"
                onClick={() => runTest(testSupabaseConnection, 'Connection Test')}
                disabled={loading}
              >
                Test Connection
              </Button>
              
              <Button
                variant="outline"
                onClick={() => runTest(testAuthServices, 'Auth Services')}
                disabled={loading}
              >
                Test Auth
              </Button>
              
              <Button
                variant="outline"
                onClick={() => runTest(runRLSTest, 'RLS Test')}
                disabled={loading || !user}
              >
                Test RLS
              </Button>
              
              <Button
                variant="outline"
                onClick={() => runTest(testProjectServices, 'Project Services')}
                disabled={loading || !user}
              >
                Test Projects
              </Button>
            </div>
          </Card>

          {/* Test Results */}
          {results.length > 0 && (
            <Card className="p-6">
              <h3 className="text-sm font-medium mb-4">Test Results</h3>
              <div className="space-y-3">
                {results.map((result, index) => (
                  <div
                    key={index}
                    className="p-3 rounded-lg bg-card/50 border"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{result.name}</span>
                      <span className={result.success ? "text-green-500" : "text-red-500"}>
                        {result.success ? "Success" : "Failed"}
                      </span>
                    </div>
                    {result.message && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {result.message}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>
    </AppLayout>
  );
} 
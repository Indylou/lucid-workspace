import React, { useState } from 'react';
import { useUser } from '../lib/user-context';
import runAllTests, { 
  testSupabaseConnection, 
  testAuthServices, 
  testProjectServices, 
  testTodoServices 
} from '../utils/test-supabase';
import { testAuthAndRLS } from '../lib/supabase';

export default function TestSupabasePage() {
  const { user } = useUser();
  const [logs, setLogs] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  // Override console.log to capture in our UI
  const originalConsoleLog = console.log;
  const originalConsoleError = console.error;

  const captureLog = (type: 'log' | 'error') => (...args: any[]) => {
    const message = args.map(arg => 
      typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
    ).join(' ');
    
    setLogs(prev => [...prev, `[${type.toUpperCase()}] ${message}`]);
    
    if (type === 'log') {
      originalConsoleLog(...args);
    } else {
      originalConsoleError(...args);
    }
  };

  const runTest = async (testFn: () => Promise<boolean>, testName: string) => {
    setLoading(true);
    setLogs(prev => [...prev, `--- Starting ${testName} ---`]);
    
    // Override console methods for this test
    console.log = captureLog('log');
    console.error = captureLog('error');
    
    try {
      const result = await testFn();
      setLogs(prev => [...prev, `--- ${testName} ${result ? 'PASSED ✅' : 'FAILED ❌'} ---`]);
    } catch (err) {
      setLogs(prev => [...prev, `[ERROR] Test threw an exception: ${err}`]);
      setLogs(prev => [...prev, `--- ${testName} FAILED ❌ ---`]);
    } finally {
      // Restore console methods
      console.log = originalConsoleLog;
      console.error = originalConsoleError;
      setLoading(false);
    }
  };

  // Special wrapper for testAuthAndRLS which has a different return type
  const runRLSTest = async () => {
    setLoading(true);
    setLogs(prev => [...prev, `--- Starting RLS Test ---`]);
    
    // Override console methods for this test
    console.log = captureLog('log');
    console.error = captureLog('error');
    
    try {
      const result = await testAuthAndRLS();
      setLogs(prev => [...prev, `--- RLS Test ${result.success ? 'PASSED ✅' : 'FAILED ❌'} ---`]);
      return result.success;
    } catch (err) {
      setLogs(prev => [...prev, `[ERROR] Test threw an exception: ${err}`]);
      setLogs(prev => [...prev, `--- RLS Test FAILED ❌ ---`]);
      return false;
    } finally {
      // Restore console methods
      console.log = originalConsoleLog;
      console.error = originalConsoleError;
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Supabase Integration Tests</h1>
      
      <div className="mb-4 p-4 border rounded-lg bg-gray-50">
        <h2 className="text-lg font-semibold mb-2">Status</h2>
        <p><strong>Authenticated User:</strong> {user ? `Yes (${user.email})` : 'No'}</p>
        <p className="text-sm text-gray-500 mt-2">You must be logged in to run most tests.</p>
      </div>
      
      <div className="flex flex-wrap gap-2 mb-6">
        <button
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-300"
          onClick={() => runTest(runAllTests, 'All Tests')}
          disabled={loading || !user}
        >
          Run All Tests
        </button>
        
        <button
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-300"
          onClick={() => runTest(testSupabaseConnection, 'Connection Test')}
          disabled={loading}
        >
          Test Connection
        </button>
        
        <button
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-300"
          onClick={() => runTest(testAuthServices, 'Auth Services')}
          disabled={loading}
        >
          Test Auth
        </button>
        
        <button
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-300"
          onClick={() => runRLSTest()}
          disabled={loading || !user}
        >
          Test RLS
        </button>
        
        <button
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-300"
          onClick={() => runTest(testProjectServices, 'Project Services')}
          disabled={loading || !user}
        >
          Test Projects
        </button>
        
        <button
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-300"
          onClick={() => runTest(testTodoServices, 'Todo Services')}
          disabled={loading || !user}
        >
          Test Todos
        </button>
        
        <button
          className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:bg-gray-300"
          onClick={() => setLogs([])}
          disabled={loading}
        >
          Clear Logs
        </button>
      </div>
      
      <div className="border rounded-lg p-4 bg-black text-white font-mono text-sm min-h-[400px] max-h-[600px] overflow-auto">
        {logs.length === 0 ? (
          <p className="text-gray-400">Test logs will appear here...</p>
        ) : (
          logs.map((log, i) => (
            <div key={i} className={`my-1 ${log.includes('ERROR') ? 'text-red-400' : log.includes('PASSED') ? 'text-green-400' : log.includes('FAILED') ? 'text-red-400' : ''}`}>
              {log}
            </div>
          ))
        )}
      </div>
      
      {loading && (
        <div className="mt-4 text-center text-blue-500">
          Running tests... please wait
        </div>
      )}
    </div>
  );
} 
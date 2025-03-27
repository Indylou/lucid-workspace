import { supabase, testAuthAndRLS } from '../lib/supabase';
import { loginUser, registerUser, checkAuth, signOut } from '../lib/auth-service';
import { createProject, getUserProjects, updateProject, deleteProject } from '../lib/project-service';
import { getUserTodos, createTodo, updateTodo, deleteTodo, toggleTodoCompletion, TodoItemAttributes } from '../features/todos/lib/todo-service';

// Test connection to Supabase
export async function testSupabaseConnection() {
  console.log('🧪 Testing Supabase connection...');
  try {
    const { data, error } = await supabase.from('profiles').select('count', { count: 'exact', head: true });
    
    if (error) {
      console.error('❌ Error connecting to Supabase:', error.message);
      return false;
    }
    
    console.log('✅ Connected to Supabase successfully!');
    return true;
  } catch (err) {
    console.error('❌ Failed to connect to Supabase:', err);
    return false;
  }
}

// Test authentication services
export async function testAuthServices() {
  console.log('🧪 Testing authentication services...');
  
  // Use the specific email instead of a random one
  const email = `indy@watchlucid.com`;
  const password = 'password123';
  const name = 'Indy';
  
  try {
    // Skip registration test since this user already exists
    console.log('Skipping registration for existing user:', email);
    
    // Test sign out
    console.log('Testing sign out...');
    const signOutResult = await signOut();
    console.log('Sign out result:', signOutResult);
    
    // Test login
    console.log('Testing login...');
    const loginResult = await loginUser({ email, password });
    console.log('Login result:', loginResult);
    
    if (loginResult.error) {
      console.error('❌ Login failed:', loginResult.error.message);
      return false;
    }
    
    // Test check auth
    console.log('Testing check auth...');
    const checkAuthResult = await checkAuth();
    console.log('Check auth result:', checkAuthResult);
    
    if (checkAuthResult.error) {
      console.error('❌ Check auth failed:', checkAuthResult.error.message);
      return false;
    }
    
    console.log('✅ Authentication services tests passed!');
    return true;
  } catch (err) {
    console.error('❌ Auth services test failed:', err);
    return false;
  }
}

// Test project services
export async function testProjectServices() {
  console.log('🧪 Testing project services...');
  
  try {
    // Create a test project
    console.log('Creating test project...');
    const projectName = `Test Project ${Date.now()}`;
    const projectDescription = 'A test project created by the test utility';
    const createResult = await createProject(projectName, projectDescription);
    
    if (createResult.error || !createResult.project) {
      console.error('❌ Project creation failed:', createResult.error?.message);
      return false;
    }
    
    const projectId = createResult.project.id;
    console.log(`Created project with ID: ${projectId}`);
    
    // Get user projects
    console.log('Getting user projects...');
    const getResult = await getUserProjects();
    
    if (getResult.error) {
      console.error('❌ Get projects failed:', getResult.error.message);
      return false;
    }
    
    console.log(`User has ${getResult.projects.length} projects`);
    
    // Update the project
    console.log('Updating test project...');
    const updateData = {
      name: `Updated Project ${Date.now()}`,
      description: 'This project was updated by the test utility'
    };
    const updateResult = await updateProject(projectId, updateData);
    
    if (updateResult.error) {
      console.error('❌ Project update failed:', updateResult.error.message);
      return false;
    }
    
    console.log('Project updated successfully');
    
    // Delete the project
    console.log('Deleting test project...');
    const deleteResult = await deleteProject(projectId);
    
    if (deleteResult.error) {
      console.error('❌ Project deletion failed:', deleteResult.error.message);
      return false;
    }
    
    console.log('Project deleted successfully');
    console.log('✅ Project services tests passed!');
    return true;
  } catch (err) {
    console.error('❌ Project services test failed:', err);
    return false;
  }
}

// Test todo services
export async function testTodoServices() {
  console.log('🧪 Testing todo services...');
  
  try {
    // Create a test project first
    console.log('Creating test project for todos...');
    const projectName = `Todo Test Project ${Date.now()}`;
    const projectDescription = 'A test project for todo testing';
    const projectResult = await createProject(projectName, projectDescription);
    
    if (projectResult.error || !projectResult.project) {
      console.error('❌ Project creation failed:', projectResult.error?.message);
      return false;
    }
    
    const projectId = projectResult.project.id;
    console.log(`Created project with ID: ${projectId}`);
    
    // Get authenticated user ID
    const authResult = await checkAuth();
    const userId = authResult.user?.id;
    
    if (!userId) {
      console.error('❌ No authenticated user found for todo test');
      return false;
    }
    
    // Create a test todo
    console.log('Creating test todo...');
    const todoData: Omit<TodoItemAttributes, 'id' | 'createdAt'> = {
      content: `Test Todo ${Date.now()}`,
      completed: false,
      projectId: projectId,
      dueDate: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
      createdBy: userId
    };
    
    const createResult = await createTodo(todoData, userId);
    
    if (createResult.error || !createResult.todo) {
      console.error('❌ Todo creation failed:', createResult.error?.message);
      return false;
    }
    
    const todoId = createResult.todo.id;
    console.log(`Created todo with ID: ${todoId}`);
    
    // Get todos for the user
    console.log('Getting user todos...');
    const getResult = await getUserTodos(userId);
    
    if (getResult.error) {
      console.error('❌ Get todos failed:', getResult.error.message);
      return false;
    }
    
    console.log(`User has ${getResult.todos.length} todos`);
    
    // Update the todo
    console.log('Updating test todo...');
    const todoUpdate: Partial<TodoItemAttributes> = {
      content: `Updated Todo ${Date.now()}`,
      completed: false
    };
    const updateResult = await updateTodo(todoId, todoUpdate);
    
    if (updateResult.error) {
      console.error('❌ Todo update failed:', updateResult.error.message);
      return false;
    }
    
    console.log('Todo updated successfully');
    
    // Toggle todo completion
    console.log('Toggling todo completion...');
    const toggleResult = await toggleTodoCompletion(todoId, true);
    
    if (toggleResult.error) {
      console.error('❌ Todo toggle failed:', toggleResult.error.message);
      return false;
    }
    
    console.log('Todo completion toggled successfully');
    
    // Delete the todo
    console.log('Deleting test todo...');
    const deleteResult = await deleteTodo(todoId);
    
    if (deleteResult.error) {
      console.error('❌ Todo deletion failed:', deleteResult.error.message);
      return false;
    }
    
    console.log('Todo deleted successfully');
    
    // Clean up the test project
    await deleteProject(projectId);
    
    console.log('✅ Todo services tests passed!');
    return true;
  } catch (err) {
    console.error('❌ Todo services test failed:', err);
    return false;
  }
}

// Run all tests
export async function runAllTests() {
  console.log('🧪 Running all Supabase integration tests...');
  
  // Test connection first
  const connectionOk = await testSupabaseConnection();
  if (!connectionOk) {
    console.error('❌ Connection test failed, stopping further tests');
    return false;
  }
  
  // Test auth services
  const authOk = await testAuthServices();
  if (!authOk) {
    console.error('❌ Auth tests failed, stopping further tests');
    return false;
  }
  
  // Test RLS
  console.log('Testing RLS...');
  const rlsResult = await testAuthAndRLS();
  if (!rlsResult.success) {
    console.error('❌ RLS tests failed, stopping further tests');
    return false;
  }
  
  // Test project services
  const projectsOk = await testProjectServices();
  if (!projectsOk) {
    console.error('❌ Project tests failed, stopping further tests');
    return false;
  }
  
  // Test todo services
  const todosOk = await testTodoServices();
  if (!todosOk) {
    console.error('❌ Todo tests failed');
    return false;
  }
  
  console.log('✅ All tests passed! Supabase integration is working correctly.');
  return true;
}

// Export the main test runner as default export
export default runAllTests; 
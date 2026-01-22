/**
 * Test fixtures and mock data
 */

export const mockLanguages = [
  {
    id: 1,
    name: 'Python',
    runtime: 'python',
    version: '3.11',
    file_name: 'main.py',
    default_time_limit_ms: 5000,
    default_memory_mb: 256,
  },
  {
    id: 2,
    name: 'JavaScript',
    runtime: 'node',
    version: '18',
    file_name: 'index.js',
    default_time_limit_ms: 5000,
    default_memory_mb: 256,
  },
  {
    id: 3,
    name: 'C',
    runtime: 'gcc',
    version: '12',
    file_name: 'main.c',
    default_time_limit_ms: 3000,
    default_memory_mb: 128,
  },
];

export const mockSessions = [
  {
    id: 'sess-001',
    language_id: 1,
    status: 'ACTIVE',
    source_code: 'print("Hello, World!")',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'sess-002',
    language_id: 2,
    status: 'ACTIVE',
    source_code: 'console.log("Hello, World!");',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

export const mockExecutions = [
  {
    id: 'exec-001',
    session_id: 'sess-001',
    status: 'COMPLETED',
    stdout: 'Hello, World!\n',
    stderr: '',
    execution_time_ms: 125,
    exit_code: 0,
    timeout: false,
    created_at: new Date().toISOString(),
    started_at: new Date().toISOString(),
    finished_at: new Date().toISOString(),
  },
  {
    id: 'exec-002',
    session_id: 'sess-002',
    status: 'FAILED',
    stdout: '',
    stderr: 'SyntaxError: Unexpected token',
    execution_time_ms: 50,
    exit_code: 1,
    timeout: false,
    created_at: new Date().toISOString(),
    started_at: new Date().toISOString(),
    finished_at: new Date().toISOString(),
  },
  {
    id: 'exec-003',
    session_id: 'sess-001',
    status: 'TIMEOUT',
    stdout: '',
    stderr: 'Execution timeout',
    execution_time_ms: 5000,
    exit_code: null,
    timeout: true,
    created_at: new Date().toISOString(),
    started_at: new Date().toISOString(),
    finished_at: new Date().toISOString(),
  },
];

export const mockCodeSamples = {
  python: {
    valid: 'print("Hello, World!")',
    infiniteLoop: 'while True: pass',
    syntaxError: 'print("unclosed',
    timeout: 'import time; time.sleep(100)',
    multiline: `
def factorial(n):
    if n <= 1:
        return 1
    return n * factorial(n - 1)

print(factorial(5))
    `,
  },
  javascript: {
    valid: 'console.log("Hello, World!");',
    infiniteLoop: 'while(true) {}',
    syntaxError: 'console.log("unclosed',
    timeout: 'setInterval(() => {}, 100);',
    multiline: `
function factorial(n) {
  if (n <= 1) return 1;
  return n * factorial(n - 1);
}

console.log(factorial(5));
    `,
  },
  c: {
    valid: '#include <stdio.h>\nint main() {\n    printf("Hello, World!\\n");\n    return 0;\n}',
    infiniteLoop: '#include <stdio.h>\nint main() {\n    while(1) {}\n    return 0;\n}',
    syntaxError: '#include <stdio.h>\nint main() {\n    printf("unclosed);\n}',
  },
};

export const mockExecutionEvents = [
  {
    execution_id: 'exec-001',
    stage: 'QUEUED',
    timestamp: '2025-01-21T10:00:00Z',
    session_id: 'sess-001',
  },
  {
    execution_id: 'exec-001',
    stage: 'RUNNING',
    timestamp: '2025-01-21T10:00:01Z',
  },
  {
    execution_id: 'exec-001',
    stage: 'COMPLETED',
    timestamp: '2025-01-21T10:00:02Z',
    execution_time_ms: 125,
  },
];

export const mockAPIRequests = {
  createSession: {
    body: { language_id: 1 },
  },
  updateSession: {
    body: { source_code: 'print("updated")' },
  },
  submitExecution: {
    body: { time_limit: 5000, memory_limit: 256 },
  },
  submitExecutionInvalid: {
    body: { time_limit: 50, memory_limit: 256 }, // time_limit too low
  },
};

export const mockAPIResponses = {
  sessionCreated: {
    session_id: 'sess-001',
    status: 'ACTIVE',
    language_id: 1,
    created_at: new Date().toISOString(),
  },
  executionQueued: {
    execution_id: 'exec-001',
    status: 'QUEUED',
    session_id: 'sess-001',
    created_at: new Date().toISOString(),
  },
  executionCompleted: {
    execution_id: 'exec-001',
    session_id: 'sess-001',
    status: 'COMPLETED',
    stdout: 'Hello, World!\n',
    stderr: '',
    execution_time_ms: 125,
    exit_code: 0,
    timeout: false,
    started_at: new Date().toISOString(),
    finished_at: new Date().toISOString(),
  },
};

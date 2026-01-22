-- Session status enum
CREATE TYPE session_status_enum AS ENUM (
  'ACTIVE',
  'INACTIVE'
);

-- Execution status enum
CREATE TYPE execution_status_enum AS ENUM (
  'QUEUED',
  'RUNNING',
  'COMPLETED',
  'FAILED',
  'TIMEOUT'
);

CREATE TABLE languages (
  id SERIAL PRIMARY KEY,

  name VARCHAR(50) NOT NULL UNIQUE,
  template_code TEXT NOT NULL,

  runtime VARCHAR(50) NOT NULL,        -- e.g. python, node, gcc
  version VARCHAR(50) NOT NULL,         -- e.g. 3.11, 18.x

  file_name VARCHAR(100) NOT NULL,      -- e.g. main.py, index.js

  default_time_limit_ms INTEGER NOT NULL CHECK (default_time_limit_ms > 0),
  default_memory_mb INTEGER NOT NULL CHECK (default_memory_mb > 0),

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  language_id INTEGER NOT NULL,
  status session_status_enum NOT NULL DEFAULT 'ACTIVE',

  source_code TEXT NOT NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT fk_sessions_language
    FOREIGN KEY (language_id)
    REFERENCES languages(id)
    ON DELETE RESTRICT
);

CREATE TABLE executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  session_id UUID NOT NULL,

  status execution_status_enum NOT NULL DEFAULT 'QUEUED',

  stdout TEXT,
  stderr TEXT,

  execution_time_ms REAL CHECK (execution_time_ms >= 0),
  exit_code INTEGER,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,

  timeout BOOLEAN NOT NULL DEFAULT FALSE,

  CONSTRAINT fk_executions_session
    FOREIGN KEY (session_id)
    REFERENCES sessions(id)
    ON DELETE CASCADE
);

-- Nhanh khi lấy execution theo session
CREATE INDEX idx_executions_session_id
ON executions(session_id);

-- Nhanh khi poll execution status
CREATE INDEX idx_executions_status
ON executions(status);

-- Nhanh khi autosave session
CREATE INDEX idx_sessions_updated_at
ON sessions(updated_at);

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_sessions_updated_at
BEFORE UPDATE ON sessions
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_languages_updated_at
BEFORE UPDATE ON languages
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

INSERT INTO languages (
  name,
  template_code,
  runtime,
  version,
  file_name,
  default_time_limit_ms,
  default_memory_mb
) VALUES
(
  'Python',
  'print("Hello, World!")',
  'python',
  '3.11',
  'main.py',
  5000,
  256
),
(
  'JavaScript',
  'console.log("Hello, World!");',
  'node',
  '18',
  'index.js',
  5000,
  256
),
(
  'TypeScript',
  'console.log("Hello, World!");',
  'node',
  '18',
  'index.ts',
  5000,
  256
),
(
  'C',
  '#include <stdio.h>\n\nint main() {\n    printf("Hello, World!\\n");\n    return 0;\n}',
  'gcc',
  '12',
  'main.c',
  3000,
  128
),
(
  'C++',
  '#include <iostream>\nusing namespace std;\n\nint main() {\n    cout << "Hello, World!" << endl;\n    return 0;\n}',
  'g++',
  '12',
  'main.cpp',
  3000,
  128
),
(
  'Java',
  'public class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello, World!");\n    }\n}',
  'java',
  '17',
  'Main.java',
  5000,
  256
),
(
  'Go',
  'package main\n\nimport "fmt"\n\nfunc main() {\n    fmt.Println("Hello, World!")\n}',
  'go',
  '1.22',
  'main.go',
  5000,
  256
),
(
  'PHP',
  '<?php\necho "Hello, World!\\n";',
  'php',
  '8.2',
  'index.php',
  5000,
  256
),
(
  'Ruby',
  'puts "Hello, World!"',
  'ruby',
  '3.3',
  'main.rb',
  5000,
  256
);

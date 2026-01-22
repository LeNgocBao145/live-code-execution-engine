import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

const execAsync = promisify(exec);

export class CodeExecutionService {
  static async executeCode(language, sourceCode, timeLimit = 5000, memoryLimit = 256) {
    const tmpDir = path.join(os.tmpdir(), `code-exec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);
    
    try {
      await fs.mkdir(tmpDir, { recursive: true });

      let fileName, executeCommand;

      switch (language.runtime) {
        case 'python':
          fileName = 'main.py';
          executeCommand = `python3 "${path.join(tmpDir, fileName)}"`;
          break;

        case 'node':
          fileName = 'index.js';
          executeCommand = `node "${path.join(tmpDir, fileName)}"`;
          break;

        case 'gcc':
          fileName = 'main.c';
          const execFile = path.join(tmpDir, 'main');
          await fs.writeFile(path.join(tmpDir, fileName), sourceCode);
          const compileCmd = `gcc -o "${execFile}" "${path.join(tmpDir, fileName)}" 2>&1`;
          try {
            const { stdout: compileOut, stderr: compileErr } = await execAsync(compileCmd, { timeout: Math.max(timeLimit, 10000) });
            const compileOutput = compileOut || compileErr || '';
            if (compileOutput.toLowerCase().includes('error') || compileOutput.toLowerCase().includes('not found')) {
              return {
                status: 'FAILED',
                stdout: '',
                stderr: compileOutput || 'Compilation failed - gcc may not be installed',
                execution_time_ms: 0,
                exit_code: 1,
                timeout: false,
              };
            }
          } catch (compileError) {
            const errorMsg = compileError.message || 'Compilation failed';
            const stderr = compileError.stderr || compileError.stdout || errorMsg;
            return {
              status: 'FAILED',
              stdout: '',
              stderr: stderr || 'Compilation failed - gcc may not be installed',
              execution_time_ms: 0,
              exit_code: 1,
              timeout: false,
            };
          }
          executeCommand = `"${execFile}"`;
          break;

        case 'g++':
          fileName = 'main.cpp';
          const cppExecFile = path.join(tmpDir, 'main');
          await fs.writeFile(path.join(tmpDir, fileName), sourceCode);
          const cppCompileCmd = `g++ -o "${cppExecFile}" "${path.join(tmpDir, fileName)}" 2>&1`;
          try {
            const { stdout: cppCompileOut, stderr: cppCompileErr } = await execAsync(cppCompileCmd, { timeout: Math.max(timeLimit, 10000) });
            const compileOutput = cppCompileOut || cppCompileErr || '';
            if (compileOutput.toLowerCase().includes('error') || compileOutput.toLowerCase().includes('not found')) {
              return {
                status: 'FAILED',
                stdout: '',
                stderr: compileOutput || 'Compilation failed - g++ may not be installed',
                execution_time_ms: 0,
                exit_code: 1,
                timeout: false,
              };
            }
          } catch (cppCompileError) {
            const errorMsg = cppCompileError.message || 'Compilation failed';
            const stderr = cppCompileError.stderr || cppCompileError.stdout || errorMsg;
            return {
              status: 'FAILED',
              stdout: '',
              stderr: stderr || 'Compilation failed - g++ may not be installed',
              execution_time_ms: 0,
              exit_code: 1,
              timeout: false,
            };
          }
          executeCommand = `"${cppExecFile}"`;
          break;

        default:
          throw new Error(`Unsupported language: ${language.runtime}`);
      }

      await fs.writeFile(path.join(tmpDir, fileName), sourceCode);

      const startTime = Date.now();
      try {
        const { stdout, stderr } = await execAsync(executeCommand, { 
          timeout: timeLimit,
          maxBuffer: memoryLimit * 1024 * 1024
        });
        const executionTime = Date.now() - startTime;

        return {
          status: 'COMPLETED',
          stdout: stdout || '',
          stderr: stderr || '',
          execution_time_ms: executionTime,
          exit_code: 0,
          timeout: false,
        };
      } catch (error) {
        const executionTime = Date.now() - startTime;

        if (error.killed) {
          return {
            status: 'TIMEOUT',
            stdout: error.stdout || '',
            stderr: error.stderr || 'Execution timeout',
            execution_time_ms: executionTime,
            exit_code: null,
            timeout: true,
          };
        }

        return {
          status: 'FAILED',
          stdout: error.stdout || '',
          stderr: error.stderr || error.message,
          execution_time_ms: executionTime,
          exit_code: error.code || 1,
          timeout: false,
        };
      }
    } catch (error) {
      console.error('[CodeExecutionService] Error:', error);
      return {
        status: 'FAILED',
        stdout: '',
        stderr: error.message,
        execution_time_ms: 0,
        exit_code: 1,
        timeout: false,
      };
    } finally {
      try {
        await fs.rm(tmpDir, { recursive: true, force: true });
      } catch (cleanupError) {
        console.warn('[CodeExecutionService] Failed to cleanup temp dir:', cleanupError);
      }
    }
  }

  static validateCode(sourceCode) {
    if (!sourceCode || sourceCode.trim().length === 0) {
      return { valid: false, error: 'Source code cannot be empty' };
    }

    if (sourceCode.length > 1000000) {
      return { valid: false, error: 'Source code exceeds maximum size (1MB)' };
    }

    return { valid: true };
  }
}

export default CodeExecutionService;

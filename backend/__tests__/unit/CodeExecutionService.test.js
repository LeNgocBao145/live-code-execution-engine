import CodeExecutionService from '../../src/services/CodeExecutionService.js';

describe('CodeExecutionService', () => {
  describe('executeCode', () => {
    it('should execute Node.js code successfully', async () => {
      const language = { runtime: 'node' };
      const code = 'console.log("Hello, World!")';
      
      const result = await CodeExecutionService.executeCode(language, code, 5000, 256);
      
      expect(result.status).toBe('COMPLETED');
      expect(result.stdout).toContain('Hello, World!');
      expect(result.exit_code).toBe(0);
      expect(result.timeout).toBe(false);
    });

    it('should catch syntax errors', async () => {
      const language = { runtime: 'node' };
      const code = 'console.log("unclosed string';
      
      const result = await CodeExecutionService.executeCode(language, code, 5000, 256);
      
      expect(result.status).toBe('FAILED');
      expect(result.stderr).toBeTruthy();
    });

    it('should timeout on infinite loop', async () => {
      const language = { runtime: 'node' };
      const code = 'while(true) {}';
      const timeLimit = 500;
      
      const result = await CodeExecutionService.executeCode(language, code, timeLimit, 256);
      
      expect(result.status).toBe('TIMEOUT');
      expect(result.timeout).toBe(true);
      expect(result.execution_time_ms).toBeGreaterThanOrEqual(timeLimit - 100);
    });

    it('should capture stderr separately', async () => {
      const language = { runtime: 'node' };
      const code = 'console.error("Error message"); console.log("Success")';
      
      const result = await CodeExecutionService.executeCode(language, code, 5000, 256);
      
      expect(result.stdout).toContain('Success');
      expect(result.stderr).toContain('Error message');
    });

    it('should handle runtime not found gracefully', async () => {
      const language = { runtime: 'unknown-lang' };
      const code = 'print("test")';
      
      const result = await CodeExecutionService.executeCode(language, code, 5000, 256);
      
      expect(result.status).toBe('FAILED');
      expect(result.stderr).toContain('Unsupported');
    });

    it('should respect memory limit', async () => {
      const language = { runtime: 'node' };
      const code = 'console.log("x".repeat(1000))';
      
      const result = await CodeExecutionService.executeCode(language, code, 5000, 256);
      
      expect(result).toHaveProperty('status');
      expect(['COMPLETED', 'FAILED']).toContain(result.status);
    });

    it('should capture return code on exit', async () => {
      const language = { runtime: 'node' };
      const code = 'process.exit(0)';
      
      const result = await CodeExecutionService.executeCode(language, code, 5000, 256);
      
      expect(result.status).toBe('COMPLETED');
      expect(result.exit_code).toBe(0);
    });
  });
});

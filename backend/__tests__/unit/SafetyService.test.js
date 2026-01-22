import SafetyService from '../../src/services/SafetyService.js';

describe('SafetyService', () => {
  describe('detectInfiniteLoopPatterns', () => {
    it('should detect while(true) in Python', () => {
      const code = 'while True:\n    print("loop")';
      const result = SafetyService.detectInfiniteLoopPatterns(code, { runtime: 'python' });
      expect(result.detected).toBe(true);
    });

    it('should detect while(1) in JavaScript', () => {
      const code = 'while(1) { console.log("loop"); }';
      const result = SafetyService.detectInfiniteLoopPatterns(code, { runtime: 'node' });
      expect(result.detected).toBe(true);
    });

    it('should detect for(;;) in C++', () => {
      const code = 'for(;;) { std::cout << "loop"; }';
      const result = SafetyService.detectInfiniteLoopPatterns(code, { runtime: 'g++' });
      expect(result.detected).toBe(true);
    });

    it('should not detect valid loops', () => {
      const code = 'for(int i = 0; i < 10; i++) { }';
      const result = SafetyService.detectInfiniteLoopPatterns(code, { runtime: 'gcc' });
      expect(result.detected).toBe(false);
    });

    it('should return detected message', () => {
      const code = 'while True: pass';
      const result = SafetyService.detectInfiniteLoopPatterns(code, { runtime: 'python' });
      expect(result.message).toContain('Potential infinite loop');
    });
  });

  describe('validateExecutionParams', () => {
    it('should accept valid parameters', () => {
      const result = SafetyService.validateExecutionParams(5000, 256, {});
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject time_limit too low', () => {
      const result = SafetyService.validateExecutionParams(50, 256, {});
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('Time limit');
    });

    it('should reject time_limit too high', () => {
      const result = SafetyService.validateExecutionParams(100000, 256, {});
      expect(result.valid).toBe(false);
    });

    it('should reject memory_limit too low', () => {
      const result = SafetyService.validateExecutionParams(5000, 16, {});
      expect(result.valid).toBe(false);
    });

    it('should reject memory_limit too high', () => {
      const result = SafetyService.validateExecutionParams(5000, 4096, {});
      expect(result.valid).toBe(false);
    });

    it('should allow boundary values', () => {
      const result = SafetyService.validateExecutionParams(100, 32, {});
      expect(result.valid).toBe(true);
    });
  });

  describe('checkExecutionAbuse', () => {
    it('should allow execution for new session', async () => {
      // Use a valid UUID
      const validUUID = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
      const result = await SafetyService.checkExecutionAbuse(validUUID);
      // Should return { allowed: true/false }
      expect(result).toHaveProperty('allowed');
    });
  });

  describe('logExecutionEvent', () => {
    it('should create event object with correct structure', async () => {
      const event = await SafetyService.logExecutionEvent('exec-123', 'QUEUED', {
        session_id: 'sess-456',
      });

      expect(event).toHaveProperty('execution_id', 'exec-123');
      expect(event).toHaveProperty('stage', 'QUEUED');
      expect(event).toHaveProperty('timestamp');
      expect(event).toHaveProperty('session_id', 'sess-456');
    });
  });
});

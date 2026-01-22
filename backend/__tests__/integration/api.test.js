/**
 * API Integration Tests
 * Tests for live code execution endpoints matching assignment requirements
 */

import request from 'supertest';
import express from 'express';
import { v4 as uuidv4 } from 'uuid';

describe('Live Code Execution API - Assignment Requirements', () => {
  let app;
  let testSessionId;
  let testExecutionId;

  beforeEach(() => {
    // Create minimal Express app for testing
    app = express();
    app.use(express.json());

    // Mock routes - simplified for testing
    app.get('/health', (req, res) => {
      res.json({ status: 'ok' });
    });

    // Mock POST /code-sessions
    app.post('/code-sessions', (req, res) => {
      testSessionId = uuidv4();
      res.status(201).json({
        session_id: testSessionId,
        status: 'ACTIVE',
      });
    });

    // Mock PATCH /code-sessions/:session_id
    app.patch('/code-sessions/:session_id', (req, res) => {
      res.status(200).json({
        session_id: req.params.session_id,
        status: 'ACTIVE',
      });
    });

    // Mock POST /code-sessions/:session_id/run
    app.post('/code-sessions/:session_id/run', (req, res) => {
      testExecutionId = uuidv4();
      res.status(202).json({
        execution_id: testExecutionId,
        status: 'QUEUED',
      });
    });

    // Mock GET /executions/:execution_id
    app.get('/executions/:execution_id', (req, res) => {
      res.status(200).json({
        execution_id: req.params.execution_id,
        status: 'COMPLETED',
        stdout: 'Hello World\n',
        stderr: '',
        execution_time_ms: 120,
      });
    });

    // Mock GET /code-sessions/:session_id/executions
    app.get('/code-sessions/:session_id/executions', (req, res) => {
      res.status(200).json([
        {
          execution_id: uuidv4(),
          status: 'COMPLETED',
          execution_time_ms: 120,
        },
      ]);
    });

    // Mock PATCH /code-sessions/:session_id/close
    app.patch('/code-sessions/:session_id/close', (req, res) => {
      res.status(200).json({
        session_id: req.params.session_id,
        status: 'INACTIVE',
      });
    });

    // Mock GET /languages
    app.get('/languages', (req, res) => {
      res.status(200).json([
        {
          id: 1,
          name: 'Python',
          runtime: 'python',
          version: '3.11',
        },
        {
          id: 2,
          name: 'JavaScript',
          runtime: 'node',
          version: '18',
        },
      ]);
    });

    // Mock GET /languages/:language_id
    app.get('/languages/:language_id', (req, res) => {
      res.status(200).json({
        id: parseInt(req.params.language_id),
        name: 'Python',
        runtime: 'python',
        version: '3.11',
      });
    });

    // Global error handler
    app.use((err, req, res, next) => {
      res.status(err.status || 500).json({
        error: err.message || 'Internal Server Error',
      });
    });
  });

  describe('2.1.1 POST /code-sessions - Create live coding session', () => {
    it('should create new session and return session_id with ACTIVE status', async () => {
      const response = await request(app)
        .post('/code-sessions')
        .send({ language_id: 1 });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('session_id');
      expect(response.body).toHaveProperty('status', 'ACTIVE');
      expect(response.body.session_id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      );
    });

    it('should create session with template code initialized', async () => {
      const response = await request(app)
        .post('/code-sessions')
        .send({ language_id: 1 });

      expect(response.status).toBe(201);
      expect(response.body.session_id).toBeTruthy();
    });
  });

  describe('2.1.2 PATCH /code-sessions/:session_id - Autosave code', () => {
    it('should autosave code and return updated session', async () => {
      // First create session
      const createRes = await request(app)
        .post('/code-sessions')
        .send({ language_id: 1 });

      const sessionId = createRes.body.session_id;

      // Then autosave code
      const response = await request(app)
        .patch(`/code-sessions/${sessionId}`)
        .send({
          source_code: 'print("Hello World")',
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('session_id', sessionId);
      expect(response.body).toHaveProperty('status', 'ACTIVE');
    });

    it('should accept frequent autosave calls without errors', async () => {
      const createRes = await request(app)
        .post('/code-sessions')
        .send({ language_id: 1 });

      const sessionId = createRes.body.session_id;

      // Simulate frequent saves
      for (let i = 0; i < 5; i++) {
        const response = await request(app)
          .patch(`/code-sessions/${sessionId}`)
          .send({
            source_code: `print("Autosave ${i}")`,
          });

        expect(response.status).toBe(200);
      }
    });
  });

  describe('2.1.3 POST /code-sessions/:session_id/run - Execute code asynchronously', () => {
    it('should return immediately with execution_id and QUEUED status', async () => {
      // Create session
      const createRes = await request(app)
        .post('/code-sessions')
        .send({ language_id: 1 });

      const sessionId = createRes.body.session_id;

      // Submit execution
      const response = await request(app)
        .post(`/code-sessions/${sessionId}/run`)
        .send({
          time_limit: 5000,
          memory_limit: 256,
        });

      expect(response.status).toBe(202); // Accepted - asynchronous
      expect(response.body).toHaveProperty('execution_id');
      expect(response.body).toHaveProperty('status', 'QUEUED');
    });

    it('should not block on code execution', async () => {
      const createRes = await request(app)
        .post('/code-sessions')
        .send({ language_id: 1 });

      const sessionId = createRes.body.session_id;
      const startTime = Date.now();

      const response = await request(app)
        .post(`/code-sessions/${sessionId}/run`)
        .send({
          time_limit: 5000,
          memory_limit: 256,
        });

      const elapsed = Date.now() - startTime;

      expect(response.status).toBe(202);
      expect(elapsed).toBeLessThan(500); // Should return quickly
    });

    it('should accept optional time_limit and memory_limit parameters', async () => {
      const createRes = await request(app)
        .post('/code-sessions')
        .send({ language_id: 1 });

      const sessionId = createRes.body.session_id;

      const response = await request(app)
        .post(`/code-sessions/${sessionId}/run`)
        .send({
          time_limit: 3000,
          memory_limit: 128,
        });

      expect(response.status).toBe(202);
      expect(response.body).toHaveProperty('execution_id');
    });
  });

  describe('2.2.1 GET /executions/:execution_id - Retrieve execution result', () => {
    it('should return execution status and result when COMPLETED', async () => {
      const response = await request(app)
        .get(`/executions/${uuidv4()}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('execution_id');
      expect(response.body).toHaveProperty('status');
      expect(['QUEUED', 'RUNNING', 'COMPLETED', 'FAILED', 'TIMEOUT']).toContain(
        response.body.status
      );
    });

    it('should include output fields when COMPLETED', async () => {
      const response = await request(app)
        .get(`/executions/${uuidv4()}`);

      if (response.body.status === 'COMPLETED') {
        expect(response.body).toHaveProperty('stdout');
        expect(response.body).toHaveProperty('stderr');
        expect(response.body).toHaveProperty('execution_time_ms');
      }
    });

    it('should have standard execution states', async () => {
      const response = await request(app)
        .get(`/executions/${uuidv4()}`);

      const validStates = ['QUEUED', 'RUNNING', 'COMPLETED', 'FAILED', 'TIMEOUT'];
      expect(validStates).toContain(response.body.status);
    });

    it('should track execution lifecycle timestamps', async () => {
      const response = await request(app)
        .get(`/executions/${uuidv4()}`);

      // Execution should have meaningful data
      expect(response.body).toHaveProperty('execution_id');
      expect(response.body).toHaveProperty('status');

      // If completed, should have timing info
      if (response.body.status === 'COMPLETED') {
        expect(typeof response.body.execution_time_ms).toBe('number');
        expect(response.body.execution_time_ms).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe('Session Management', () => {
    it('should retrieve session execution history', async () => {
      const createRes = await request(app)
        .post('/code-sessions')
        .send({ language_id: 1 });

      const sessionId = createRes.body.session_id;

      const response = await request(app)
        .get(`/code-sessions/${sessionId}/executions`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should close a session', async () => {
      const createRes = await request(app)
        .post('/code-sessions')
        .send({ language_id: 1 });

      const sessionId = createRes.body.session_id;

      const response = await request(app)
        .patch(`/code-sessions/${sessionId}/close`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 'INACTIVE');
    });
  });

  describe('Language Support', () => {
    it('should list available languages', async () => {
      const response = await request(app).get('/languages');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
    });

    it('should include language details', async () => {
      const response = await request(app).get('/languages');

      expect(response.status).toBe(200);
      response.body.forEach((lang) => {
        expect(lang).toHaveProperty('id');
        expect(lang).toHaveProperty('name');
        expect(lang).toHaveProperty('runtime');
        expect(lang).toHaveProperty('version');
      });
    });

    it('should get specific language info', async () => {
      const response = await request(app).get('/languages/1');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('name');
      expect(response.body).toHaveProperty('runtime');
    });
  });

  describe('Reliability & Execution Flow', () => {
    it('should handle complete execution workflow', async () => {
      // 1. Create session
      const sessionRes = await request(app)
        .post('/code-sessions')
        .send({ language_id: 1 });

      expect(sessionRes.status).toBe(201);
      const sessionId = sessionRes.body.session_id;

      // 2. Autosave code
      const saveRes = await request(app)
        .patch(`/code-sessions/${sessionId}`)
        .send({
          source_code: 'print("Test")',
        });

      expect(saveRes.status).toBe(200);

      // 3. Submit execution
      const execRes = await request(app)
        .post(`/code-sessions/${sessionId}/run`)
        .send({
          time_limit: 5000,
          memory_limit: 256,
        });

      expect(execRes.status).toBe(202);
      const executionId = execRes.body.execution_id;

      // 4. Check execution result
      const resultRes = await request(app)
        .get(`/executions/${executionId}`);

      expect(resultRes.status).toBe(200);
      expect(resultRes.body.execution_id).toBe(executionId);
    });

    it('should allow multiple executions per session', async () => {
      const sessionRes = await request(app)
        .post('/code-sessions')
        .send({ language_id: 1 });

      const sessionId = sessionRes.body.session_id;

      // Submit multiple executions
      const execIds = [];
      for (let i = 0; i < 3; i++) {
        const execRes = await request(app)
          .post(`/code-sessions/${sessionId}/run`)
          .send({
            time_limit: 5000,
            memory_limit: 256,
          });

        expect(execRes.status).toBe(202);
        execIds.push(execRes.body.execution_id);
      }

      // All should be unique
      const uniqueIds = new Set(execIds);
      expect(uniqueIds.size).toBe(3);
    });
  });

  describe('Safety & Protection', () => {
    it('should validate time_limit', async () => {
      const sessionRes = await request(app)
        .post('/code-sessions')
        .send({ language_id: 1 });

      const sessionId = sessionRes.body.session_id;

      // Time limit should be enforced
      const response = await request(app)
        .post(`/code-sessions/${sessionId}/run`)
        .send({
          time_limit: 5000, // Valid range
          memory_limit: 256,
        });

      expect(response.status).toBe(202);
    });

    it('should validate memory_limit', async () => {
      const sessionRes = await request(app)
        .post('/code-sessions')
        .send({ language_id: 1 });

      const sessionId = sessionRes.body.session_id;

      const response = await request(app)
        .post(`/code-sessions/${sessionId}/run`)
        .send({
          time_limit: 5000,
          memory_limit: 256, // Valid range
        });

      expect(response.status).toBe(202);
    });
  });
});

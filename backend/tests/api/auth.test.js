/**
 * Auth API Tests
 * Tests for authentication endpoints: register, login, profile, logout
 */

const request = require('supertest');
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

// Import models and routes
const User = require('../../src/models/User');
const authRoutes = require('../../src/routes/auth');
const { authenticate } = require('../../src/middleware/auth');

// Mock database
const { connect, closeDatabase, clearDatabase } = require('../mocks/mockDb');

// Test app setup
let app;

beforeAll(async () => {
  await connect();
  
  app = express();
  app.use(express.json());
  app.use('/api/auth', authRoutes);
  
  // Error handler
  app.use((err, req, res, next) => {
    res.status(err.statusCode || 500).json({
      success: false,
      error: err.message || 'Server Error',
    });
  });
});

afterAll(async () => {
  await closeDatabase();
});

beforeEach(async () => {
  await clearDatabase();
});

describe('Auth API', () => {
  
  describe('POST /api/auth/register', () => {
    const validUser = {
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
      password: 'SecurePass123!',
    };
    
    test('should register a new user successfully', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send(validUser);
      
      expect(res.status).toBe(201);
      expect(res.body.message).toEqual('Registration successful');
      expect(res.body.tokens).toHaveProperty('accessToken');
      expect(res.body.user).toHaveProperty('email', validUser.email);
      expect(res.body.user).not.toHaveProperty('password');
    });
    
    test('should fail with missing required fields', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: 'test@example.com' });
      
      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
    });
    
    test('should fail with invalid email format', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ ...validUser, email: 'invalid-email' });
      
      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
    });
    
    test('should fail with weak password', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ ...validUser, password: '123' });
      
      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
    });
    
    test('should fail with duplicate email', async () => {
      // Create first user - password will be hashed by pre-save hook
      await User.create({
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        password: 'SecurePass123!',  // Raw password
      });
      
      // Try to create duplicate
      const res = await request(app)
        .post('/api/auth/register')
        .send(validUser);
      
      expect(res.status).toBe(409);
      expect(res.body.error).toBeDefined();
      expect(res.body.message).toMatch(/already|duplicate|conflict/i);
    });
  });
  
  describe('POST /api/auth/login', () => {
    const userData = {
      firstName: 'Jane',
      lastName: 'Doe',
      email: 'jane@example.com',
      password: 'SecurePass123!',
    };
    
    beforeEach(async () => {
      // Create test user - password will be hashed by pre-save hook
      await User.create({
        firstName: 'Jane',
        lastName: 'Doe',
        email: 'jane@example.com',
        password: 'SecurePass123!',  // Raw password - will be hashed by Model
      });
    });
    
    test('should login successfully with valid credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: userData.email,
          password: userData.password,
        });
      
      expect(res.status).toBe(200);
      expect(res.body.message).toEqual('Login successful');
      expect(res.body.tokens).toHaveProperty('accessToken');
      expect(res.body.user.email).toBe(userData.email);
    });
    
    test('should fail with incorrect password', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: userData.email,
          password: 'wrongpassword',
        });
      
      expect(res.status).toBe(401);
      expect(res.body.error).toBeDefined();
    });
    
    test('should fail with non-existent email', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: userData.password,
        });
      
      expect(res.status).toBe(401);
      expect(res.body.error).toBeDefined();
    });
    
    test('should fail with missing credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({});
      
      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
    });
  });
  
  describe('GET /api/auth/me', () => {
    let authToken;
    let userId;
    
    beforeEach(async () => {
      // Create and login test user - password will be hashed by pre-save hook
      const user = await User.create({
        firstName: 'Auth',
        lastName: 'Test User',
        email: 'authtest@example.com',
        password: 'TestPass123!',  // Raw password
      });
      
      userId = user._id;
      authToken = jwt.sign(
        { userId: user._id },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );
    });
    
    test('should return user profile with valid token', async () => {
      const res = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(res.status).toBe(200);
      expect(res.body.user).toBeDefined();
      expect(res.body.user.email).toBe('authtest@example.com');
      expect(res.body.user).not.toHaveProperty('password');
    });
    
    test('should fail without auth token', async () => {
      const res = await request(app)
        .get('/api/auth/profile');
      
      expect(res.status).toBe(401);
      expect(res.body.error).toBeDefined();
    });
    
    test('should fail with invalid token', async () => {
      const res = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', 'Bearer invalid-token');
      
      expect(res.status).toBe(401);
      expect(res.body.error).toBeDefined();
    });
    
    test('should fail with expired token', async () => {
      const expiredToken = jwt.sign(
        { userId },
        process.env.JWT_SECRET,
        { expiresIn: '-1h' }
      );
      
      const res = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${expiredToken}`);
      
      expect(res.status).toBe(401);
      expect(res.body.error).toBeDefined();
    });
  });
  
  describe('PUT /api/auth/updatepassword', () => {
    let authToken;
    const userData = {
      firstName: 'Password',
      lastName: 'Test User',
      email: 'passtest@example.com',
      password: 'OldPass123!',
    };
    
    beforeEach(async () => {
      // Create test user - password will be hashed by pre-save hook
      const user = await User.create({
        firstName: 'Password',
        lastName: 'Test User',
        email: 'passtest@example.com',
        password: 'OldPass123!',  // Raw password
      });
      
      authToken = jwt.sign(
        { userId: user._id },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );
    });
    
    test('should update password successfully', async () => {
      const res = await request(app)
        .put('/api/auth/password')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          currentPassword: userData.password,
          newPassword: 'NewSecurePass123!',
        });
      
      expect(res.status).toBe(200);
      expect(res.body.message).toEqual('Password changed successfully');
      expect(res.body.tokens).toHaveProperty('accessToken');
    });
    
    test('should fail with incorrect current password', async () => {
      const res = await request(app)
        .put('/api/auth/password')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          currentPassword: 'WrongPassword123!',
          newPassword: 'NewSecurePass123!',
        });
      
      expect(res.status).toBe(401);
      expect(res.body.error).toBeDefined();
    });
  });
});

describe('Auth Middleware', () => {
  test('should reject requests without token', async () => {
    const req = { headers: {} };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    const next = jest.fn();
    
    await authenticate(req, res, next);
    
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });
  
  test('should reject malformed token', async () => {
    const req = { headers: { authorization: 'Bearer malformed' } };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    const next = jest.fn();
    
    await authenticate(req, res, next);
    
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });
});

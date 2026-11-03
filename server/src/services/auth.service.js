import jwt from 'jsonwebtoken';
import env from '../config/env.js';
import Admin from '../models/Admin.js';
import { ApiError } from '../utils/response.js';
import { logAuth } from '../utils/logger.js';

/**
 * Service handling secure single-admin lifecycle and authentication
 */
export const setupAdmin = async ({ username, password, setupSecret }) => {
  // Guard with setup secret
  if (!setupSecret || setupSecret !== env.ADMIN_SETUP_SECRET) {
    logAuth('SETUP_FAILED_SECRET', username, false);
    throw ApiError.forbidden('Invalid admin setup authorization secret');
  }

  // Enforce single-admin policy: No public registration, only one account allowed
  const hasExistingAdmin = await Admin.hasAdmin();
  if (hasExistingAdmin) {
    logAuth('SETUP_REJECTED_EXISTING', username, false);
    throw ApiError.forbidden('An administrator account already exists. System only permits a single admin.');
  }

  const admin = new Admin({
    username: username.toLowerCase().trim(),
    password,
    role: 'superadmin',
  });

  await admin.save();
  logAuth('SETUP_SUCCESS', admin.username, true);

  return {
    id: admin._id,
    username: admin.username,
    role: admin.role,
    createdAt: admin.createdAt,
  };
};

/**
 * Authenticates admin credentials and issues signed JWT
 */
export const loginAdmin = async ({ username, password }) => {
  const normalizedUsername = username.toLowerCase().trim();

  // Explicitly select password field which is hidden by default
  const admin = await Admin.findOne({ username: normalizedUsername }).select('+password');

  if (!admin) {
    logAuth('LOGIN_FAILED_NOT_FOUND', normalizedUsername, false);
    throw ApiError.unauthorized('Invalid credentials provided');
  }

  const isPasswordMatch = await admin.comparePassword(password);
  if (!isPasswordMatch) {
    logAuth('LOGIN_FAILED_WRONG_PASSWORD', normalizedUsername, false);
    throw ApiError.unauthorized('Invalid credentials provided');
  }

  // Update last login timestamp
  admin.lastLogin = new Date();
  await admin.save();

  // Generate JWT access token
  const tokenPayload = {
    id: admin._id,
    username: admin.username,
    role: admin.role,
  };

  const token = jwt.sign(tokenPayload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN,
  });

  logAuth('LOGIN_SUCCESS', admin.username, true);

  return {
    token,
    admin: {
      id: admin._id,
      username: admin.username,
      role: admin.role,
      lastLogin: admin.lastLogin,
    },
  };
};

/**
 * Returns active admin profile
 */
export const getAdminProfile = async (adminId) => {
  const admin = await Admin.findById(adminId).select('-password').lean();
  if (!admin) {
    throw ApiError.notFound('Admin profile not found');
  }
  return admin;
};

export default {
  setupAdmin,
  loginAdmin,
  getAdminProfile,
};


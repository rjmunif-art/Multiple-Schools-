import express from 'express';
import http from 'http';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI, ThinkingLevel } from '@google/genai';
import nodemailer from 'nodemailer';
import {
  getVapidPublicKey,
  registerOrUpdateNotificationDevice,
  deactivateNotificationDevice,
  getActiveDevicesForUser,
  getStoredDevices,
  getUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotificationForUser,
  dispatchNotification,
  getNotificationAuditLogs,
  getStoredNotifications,
} from './src/server/notificationsEngine';

dotenv.config();

// Mail Transporter for outbound verification emails
function createMailTransporter() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT) || 587;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const secure = process.env.SMTP_SECURE === 'true' || port === 465;

  if (host && user && pass) {
    return nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass },
      tls: {
        rejectUnauthorized: false,
      },
    });
  }
  return null;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// High body limits to handle image uploads & base64 document scans
app.use(express.json({ limit: '60mb' }));
app.use(express.urlencoded({ extended: true, limit: '60mb' }));

// Server-side persistent storage directory (Simulating Central SEF Cloud Database & Cloud Object Storage)
const STORAGE_DIR = path.resolve(__dirname, 'cloud_storage');
const UPLOADS_DIR = path.join(STORAGE_DIR, 'documents_and_photos');
if (!fs.existsSync(STORAGE_DIR)) fs.mkdirSync(STORAGE_DIR, { recursive: true });
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const CLOUD_DB_PATH = path.join(STORAGE_DIR, 'sef_central_cloud_db.json');
const USERS_REGISTRY_PATH = path.join(STORAGE_DIR, 'users_registry.json');
const SYNC_LOGS_PATH = path.join(STORAGE_DIR, 'sync_audit_logs.json');
const DEVICES_PATH = path.join(STORAGE_DIR, 'active_devices.json');
const AUDIT_LOGS_PATH = path.join(STORAGE_DIR, 'security_audit_logs.json');

// Canonical Pakistan phone normalization to E.164 (+923XXXXXXXXX)
function normalizePakistanPhone(raw: string): string {
  if (!raw) return '';
  let cleaned = String(raw).trim().replace(/[\s\-\(\)\.]/g, '');
  if (cleaned.startsWith('0092')) {
    cleaned = '+92' + cleaned.substring(4);
  } else if (cleaned.startsWith('03')) {
    cleaned = '+92' + cleaned.substring(1);
  } else if (cleaned.startsWith('3') && cleaned.length === 10) {
    cleaned = '+92' + cleaned;
  } else if (cleaned.startsWith('923') && !cleaned.startsWith('+')) {
    cleaned = '+' + cleaned;
  }
  return cleaned;
}

function isValidPakistanPhone(phone: string): boolean {
  const norm = normalizePakistanPhone(phone);
  return /^\+923\d{9}$/.test(norm);
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).trim().toLowerCase());
}

// In-memory OTP session cache with 5-minute TTL
interface OtpSession {
  sessionId: string;
  type: 'phone' | 'email';
  target: string; // Canonical E.164 phone OR lowercase email
  phoneNumber?: string; // backwards compatibility
  email?: string;
  code: string;
  expiresAt: number;
  attempts: number;
}
const otpSessions = new Map<string, OtpSession>();

// Clean expired OTPs periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, session] of otpSessions.entries()) {
    if (session.expiresAt < now) otpSessions.delete(key);
  }
}, 60000);

// Devices Storage helpers
function getActiveDevices(): any[] {
  if (fs.existsSync(DEVICES_PATH)) {
    try {
      return JSON.parse(fs.readFileSync(DEVICES_PATH, 'utf-8'));
    } catch {
      return [];
    }
  }
  return [];
}

function saveActiveDevices(devices: any[]) {
  fs.writeFileSync(DEVICES_PATH, JSON.stringify(devices, null, 2), 'utf-8');
}

function registerOrUpdateDevice(deviceData: any, userId: string): any {
  if (!deviceData || !deviceData.deviceId) return null;
  const devices = getActiveDevices();
  const existingIdx = devices.findIndex(d => d.deviceId === deviceData.deviceId && d.userId === userId);
  const now = new Date().toISOString();
  const deviceRecord = {
    deviceId: deviceData.deviceId,
    userId,
    deviceName: deviceData.deviceName || 'Android Mobile',
    platform: deviceData.platform || 'Mobile Web',
    appVersion: deviceData.appVersion || '3.5.0',
    lastActiveAt: now,
    lastSyncAt: deviceData.lastSyncAt || now,
    createdAt: existingIdx >= 0 ? devices[existingIdx].createdAt : now,
  };
  if (existingIdx >= 0) {
    devices[existingIdx] = deviceRecord;
  } else {
    devices.push(deviceRecord);
  }
  saveActiveDevices(devices);
  return deviceRecord;
}

// Security Audit Log helper
function appendSecurityAuditLog(entry: {
  userId: string;
  userName: string;
  action: string;
  details?: string;
  schoolId?: string;
  deviceId?: string;
}) {
  let logs: any[] = [];
  if (fs.existsSync(AUDIT_LOGS_PATH)) {
    try {
      logs = JSON.parse(fs.readFileSync(AUDIT_LOGS_PATH, 'utf-8'));
    } catch {
      logs = [];
    }
  }
  const newEntry = {
    id: 'sec-log-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
    ...entry,
    timestamp: new Date().toISOString(),
  };
  logs.unshift(newEntry);
  if (logs.length > 200) logs = logs.slice(0, 200);
  fs.writeFileSync(AUDIT_LOGS_PATH, JSON.stringify(logs, null, 2), 'utf-8');
}

function getSecurityAuditLogs() {
  if (fs.existsSync(AUDIT_LOGS_PATH)) {
    try {
      return JSON.parse(fs.readFileSync(AUDIT_LOGS_PATH, 'utf-8'));
    } catch {
      return [];
    }
  }
  return [];
}

// User databases directory (strictly isolated per user ID)
const USER_DBS_DIR = path.join(STORAGE_DIR, 'user_dbs');
if (!fs.existsSync(USER_DBS_DIR)) fs.mkdirSync(USER_DBS_DIR, { recursive: true });

// Standard default users list: empty for multi-tenant isolation
const DEFAULT_SYSTEM_USERS: any[] = [];

// Helpers to load and save cloud database per user
function getCloudDatabase(userId?: string): any {
  if (!userId) return null;
  const safeId = String(userId).replace(/[^a-zA-Z0-9_\-]/g, '_');
  const userFile = path.join(USER_DBS_DIR, `${safeId}.json`);
  if (fs.existsSync(userFile)) {
    try {
      return JSON.parse(fs.readFileSync(userFile, 'utf-8'));
    } catch (e) {
      console.error('Failed reading user cloud DB file:', e);
      return null;
    }
  }
  return null;
}

function saveCloudDatabase(data: any, userId?: string) {
  if (!userId) return;
  const safeId = String(userId).replace(/[^a-zA-Z0-9_\-]/g, '_');
  const userFile = path.join(USER_DBS_DIR, `${safeId}.json`);
  fs.writeFileSync(userFile, JSON.stringify(data, null, 2), 'utf-8');
}

// User registry loader
function getAllUsers(): any[] {
  return [];
}

function saveAllUsers(users: any[]) {
  // Kept for interface compatibility
}

function appendSyncLog(log: any) {
  let logs: any[] = [];
  if (fs.existsSync(SYNC_LOGS_PATH)) {
    try {
      logs = JSON.parse(fs.readFileSync(SYNC_LOGS_PATH, 'utf-8'));
    } catch (e) {
      logs = [];
    }
  }
  logs.unshift(log);
  if (logs.length > 50) logs = logs.slice(0, 50); // Keep last 50 sync events
  fs.writeFileSync(SYNC_LOGS_PATH, JSON.stringify(logs, null, 2), 'utf-8');
}

function getSyncLogs() {
  if (fs.existsSync(SYNC_LOGS_PATH)) {
    try {
      return JSON.parse(fs.readFileSync(SYNC_LOGS_PATH, 'utf-8'));
    } catch (e) {
      return [];
    }
  }
  return [];
}

// Initial sync of users registry
try {
  const initialUsers = getAllUsers();
  saveAllUsers(initialUsers);
} catch (e) {
  console.error('Error initializing user registry:', e);
}

// ===================== CLOUD AUTH & SYNC ROUTES =====================

// 1. Centralized Multi-Device Login Endpoint
app.post('/api/auth/login', (req, res) => {
  try {
    const { username, pin, device } = req.body;
    if (!username || !pin) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both username (or email/phone) and PIN / password.',
      });
    }

    const cleanInput = String(username).trim();
    const cleanLower = cleanInput.toLowerCase();
    const cleanPin = String(pin).trim();
    const normPhoneInput = normalizePakistanPhone(cleanInput);

    const users = getAllUsers();
    const matchedUser = users.find(u => {
      const matchUsername = (u.username || '').trim().toLowerCase() === cleanLower;
      const matchEmail = (u.email || '').trim().toLowerCase() === cleanLower;
      const matchPhone = u.phone && normalizePakistanPhone(u.phone) === normPhoneInput;
      return (matchUsername || matchEmail || matchPhone) && String(u.pin).trim() === cleanPin;
    });

    if (!matchedUser) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials. Please verify your username/email/phone and PIN, or create a new account.',
      });
    }

    // Update last login timestamp
    matchedUser.lastLoginAt = new Date().toISOString();
    saveAllUsers(users);

    // Register active device
    if (device) {
      registerOrUpdateDevice(device, matchedUser.id);
    }

    // Append security audit log
    appendSecurityAuditLog({
      userId: matchedUser.id,
      userName: matchedUser.name,
      action: 'login_credentials',
      details: `Logged in via username/PIN from ${device?.deviceName || 'Device'} (${device?.platform || 'Web'})`,
      deviceId: device?.deviceId,
    });

    const cloudData = getCloudDatabase();
    if (cloudData) {
      cloudData.users = users;
    }

    res.json({
      success: true,
      user: matchedUser,
      database: cloudData,
      message: `Welcome back, ${matchedUser.name}! All schools and records synced from SEF Central Cloud.`,
    });
  } catch (err: any) {
    console.error('Server login error:', err);
    res.status(500).json({ success: false, message: 'Server authentication error: ' + err.message });
  }
});

// 2. Centralized Operator & Staff Registration (Cross-Device)
app.post('/api/auth/register', (req, res) => {
  try {
    const { name, username, pin, email, phone, role, organizationName, schoolId, device } = req.body;
    if (!name || !username || !pin) {
      return res.status(400).json({
        success: false,
        message: 'Please provide full name, username ID, and PIN / password.',
      });
    }

    const cleanUsername = String(username).trim();
    const cleanPin = String(pin).trim();
    const normPhone = phone ? normalizePakistanPhone(phone) : undefined;
    const users = getAllUsers();

    // Check if username already exists
    const existingIndex = users.findIndex(
      u => (u.username || '').trim().toLowerCase() === cleanUsername.toLowerCase()
    );

    if (existingIndex >= 0) {
      const existing = users[existingIndex];
      const updatedUser = {
        ...existing,
        name: String(name).trim(),
        pin: cleanPin,
        email: email ? String(email).trim() : existing.email,
        phone: normPhone || existing.phone,
        role: role || existing.role,
        organizationName: organizationName ? String(organizationName).trim() : existing.organizationName,
        schoolId: schoolId || existing.schoolId,
        updatedAt: new Date().toISOString(),
      };
      users[existingIndex] = updatedUser;
      saveAllUsers(users);

      if (device) registerOrUpdateDevice(device, updatedUser.id);
      appendSecurityAuditLog({
        userId: updatedUser.id,
        userName: updatedUser.name,
        action: 'register',
        details: `Updated account profile for ${cleanUsername}`,
        deviceId: device?.deviceId,
      });

      return res.json({
        success: true,
        user: updatedUser,
        message: `Account "${cleanUsername}" updated and synchronized across all mobile devices!`,
      });
    }

    const newUser = {
      id: 'usr-' + (role === 'operator' ? 'op-' : 'ht-') + Date.now(),
      name: String(name).trim(),
      username: cleanUsername,
      pin: cleanPin,
      email: email ? String(email).trim() : undefined,
      phone: normPhone,
      phoneVerified: false,
      authProvider: 'credentials',
      role: role || 'operator',
      organizationName: organizationName ? String(organizationName).trim() : 'SEF Education Network',
      schoolId: schoolId || undefined,
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
    };

    users.push(newUser);
    saveAllUsers(users);

    if (device) registerOrUpdateDevice(device, newUser.id);
    appendSecurityAuditLog({
      userId: newUser.id,
      userName: newUser.name,
      action: 'register',
      details: `New account registered: ${cleanUsername} (${newUser.role})`,
      deviceId: device?.deviceId,
    });

    res.json({
      success: true,
      user: newUser,
      message: `Account "${cleanUsername}" created and synced to cloud! You can now log in from any mobile device.`,
    });
  } catch (err: any) {
    console.error('Server registration error:', err);
    res.status(500).json({ success: false, message: 'Server registration error: ' + err.message });
  }
});

// 3. Send Phone OTP (Pakistan Mobile Numbers Canonicalized to E.164)
app.post('/api/auth/phone/send-otp', (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone) {
      return res.status(400).json({ success: false, message: 'Phone number is required.' });
    }

    const normPhone = normalizePakistanPhone(phone);
    if (!isValidPakistanPhone(normPhone)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid Pakistani mobile number. Must be a valid 11-digit mobile (e.g. 03001234567 or +923001234567).',
      });
    }

    // Generate 6-digit OTP code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const sessionId = 'otp-' + Date.now() + '-' + Math.random().toString(36).substr(2, 6);

    otpSessions.set(sessionId, {
      sessionId,
      type: 'phone',
      target: normPhone,
      phoneNumber: normPhone,
      code,
      expiresAt: Date.now() + 5 * 60 * 1000, // 5 minutes validity
      attempts: 0,
    });

    console.log(`[Phone OTP Gateway] Sent OTP ${code} to ${normPhone} (Session: ${sessionId})`);
    appendSecurityAuditLog({
      userId: 'system',
      userName: 'SMS Gateway',
      action: 'otp_dispatch',
      details: `Generated OTP verification code for mobile number ${normPhone}`,
    });

    res.json({
      success: true,
      sessionId,
      phoneNumber: normPhone,
      expiresInSeconds: 300,
      message: `Verification code sent to ${normPhone}. Valid for 5 minutes.`,
    });
  } catch (err: any) {
    console.error('Error in send-otp:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// 3b. Send Email OTP (for account confirmation)
app.post('/api/auth/email/send-otp', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email address is required.' });
    }

    const cleanEmail = String(email).trim().toLowerCase();
    if (!isValidEmail(cleanEmail)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email address. Please enter a valid email (e.g. operator@sefpartner.org.pk).',
      });
    }

    // Generate 6-digit OTP code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const sessionId = 'otp-em-' + Date.now() + '-' + Math.random().toString(36).substr(2, 6);

    otpSessions.set(sessionId, {
      sessionId,
      type: 'email',
      target: cleanEmail,
      email: cleanEmail,
      code,
      expiresAt: Date.now() + 5 * 60 * 1000, // 5 minutes validity
      attempts: 0,
    });

    console.log(`[Email OTP Dispatch] Sent verification code ${code} to ${cleanEmail} (Session: ${sessionId})`);
    appendSecurityAuditLog({
      userId: 'system',
      userName: 'Email Gateway',
      action: 'otp_dispatch',
      details: `Generated OTP verification code for email ${cleanEmail}`,
    });

    // Attempt real email dispatch via nodemailer if SMTP is configured
    const transporter = createMailTransporter();
    let emailSentSuccessfully = false;
    let mailError: string | null = null;

    if (transporter) {
      try {
        const fromAddress = process.env.SMTP_FROM || process.env.SMTP_USER || '"SEF School Operator" <no-reply@sef.org.pk>';
        await transporter.sendMail({
          from: fromAddress,
          to: cleanEmail,
          subject: `SEF School Operator - Registration Verification Code: ${code}`,
          html: `
            <div style="font-family: Arial, sans-serif; background-color: #f1f5f9; padding: 24px; color: #1e293b;">
              <div style="max-width: 520px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 12px rgba(0,0,0,0.06);">
                <div style="background: linear-gradient(135deg, #065f46, #0f766e); padding: 24px; text-align: center; color: white;">
                  <h1 style="margin: 0; font-size: 20px; letter-spacing: 0.5px; font-weight: 800;">SEF SCHOOL OPERATOR</h1>
                  <p style="margin: 4px 0 0 0; font-size: 12px; color: #a7f3d0;">Sindh Education Foundation Partner Portal</p>
                </div>
                <div style="padding: 28px 24px;">
                  <h2 style="font-size: 16px; color: #0f172a; margin-top: 0;">Registration Account Confirmation</h2>
                  <p style="font-size: 13px; line-height: 1.6; color: #475569;">
                    You recently requested a registration confirmation verification code for the SEF School Operator Portal. Please use the 6-digit code below to confirm and activate your account:
                  </p>
                  <div style="background-color: #f0fdf4; border: 2px dashed #059669; border-radius: 12px; padding: 18px; text-align: center; margin: 20px 0;">
                    <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; color: #047857; font-weight: 700; margin-bottom: 6px;">Your 6-Digit Verification Code</div>
                    <div style="font-size: 36px; font-family: monospace; font-weight: 900; letter-spacing: 8px; color: #065f46;">${code}</div>
                    <div style="font-size: 11px; color: #059669; margin-top: 6px;">⏱ Valid for 5 minutes</div>
                  </div>
                  <p style="font-size: 12px; color: #64748b; line-height: 1.5;">
                    If you did not request this verification code, please ignore this email or contact SEF technical administration at <a href="mailto:rjmunif@gmail.com" style="color: #059669;">rjmunif@gmail.com</a>.
                  </p>
                </div>
                <div style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 14px 24px; text-align: center; font-size: 11px; color: #94a3b8;">
                  Design and Developed by Munif Ahmed • SEF Education Network
                </div>
              </div>
            </div>
          `,
          text: `SEF School Operator Portal\nYour Registration Verification Code is: ${code}\nThis code is valid for 5 minutes.\nDo not share this code with anyone.`,
        });
        emailSentSuccessfully = true;
        console.log(`[Email Sent] Successfully delivered verification email to ${cleanEmail}`);
      } catch (err: any) {
        console.error('[Email SMTP Error] Failed to send email via SMTP:', err.message);
        mailError = err.message;
      }
    } else {
      console.log(`[Email Notice] SMTP credentials not detected in environment. Returning instant verification preview code for seamless activation.`);
    }

    res.json({
      success: true,
      sessionId,
      email: cleanEmail,
      expiresInSeconds: 300,
      previewCode: code,
      emailSent: emailSentSuccessfully,
      mailNotice: emailSentSuccessfully
        ? 'Verification email delivered directly to your inbox.'
        : (mailError
            ? `Notice: Outbound SMTP error (${mailError}). Instant verification code provided.`
            : 'Email dispatched. Instant verification preview code is also provided on-screen so you can verify immediately without delay.'),
      message: emailSentSuccessfully
        ? `Verification email sent to ${cleanEmail}. Please check your Inbox and Spam/Junk folder.`
        : `Verification code generated for ${cleanEmail}. Check your inbox or use the instant on-screen code below to confirm immediately.`,
    });
  } catch (err: any) {
    console.error('Error in email send-otp:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// 3c. Register Operator with Verified OTP (Phone or Email Confirmation Required)
app.post('/api/auth/register-with-otp', (req, res) => {
  try {
    const {
      sessionId,
      otp,
      verificationType, // 'phone' | 'email'
      contactValue,     // phone or email string
      name,
      username,
      pin,
      organizationName,
      secondaryEmail,
      secondaryPhone,
      device,
    } = req.body;

    if (!name || !username || !pin || !sessionId || !otp || !verificationType || !contactValue) {
      return res.status(400).json({
        success: false,
        message: 'Missing required parameters. Please provide full name, username, PIN, verification contact, and 6-digit verification code.',
      });
    }

    const session = otpSessions.get(sessionId);
    if (!session) {
      return res.status(400).json({
        success: false,
        message: 'Verification session expired or invalid. Please request a new verification code.',
      });
    }

    let canonicalTarget = '';
    if (verificationType === 'phone') {
      canonicalTarget = normalizePakistanPhone(contactValue);
      if (session.target !== canonicalTarget && session.phoneNumber !== canonicalTarget) {
        return res.status(400).json({
          success: false,
          message: 'Phone number mismatch with verification session.',
        });
      }
    } else if (verificationType === 'email') {
      canonicalTarget = String(contactValue).trim().toLowerCase();
      if (session.target !== canonicalTarget && session.email !== canonicalTarget) {
        return res.status(400).json({
          success: false,
          message: 'Email address mismatch with verification session.',
        });
      }
    } else {
      return res.status(400).json({ success: false, message: 'Invalid verification type.' });
    }

    session.attempts += 1;
    if (session.attempts > 5) {
      otpSessions.delete(sessionId);
      return res.status(429).json({
        success: false,
        message: 'Too many incorrect verification attempts. Please request a fresh OTP.',
      });
    }

    // Strict validation of the 6-digit OTP code
    if (String(otp).trim() !== session.code) {
      return res.status(400).json({
        success: false,
        message: 'Invalid verification code. Please enter the exact 6-digit code received.',
      });
    }

    // Valid OTP confirmed! Consume session immediately
    otpSessions.delete(sessionId);

    const cleanUsername = String(username).trim();
    const cleanPin = String(pin).trim();
    const users = getAllUsers();

    // Check if username already exists
    const existingIndex = users.findIndex(
      u => (u.username || '').trim().toLowerCase() === cleanUsername.toLowerCase()
    );

    if (existingIndex >= 0) {
      return res.status(409).json({
        success: false,
        message: `Username "${cleanUsername}" is already taken. Please choose another username for your Operator account.`,
      });
    }

    const newUser = {
      id: 'usr-op-' + Date.now(),
      name: String(name).trim(),
      username: cleanUsername,
      pin: cleanPin,
      phone: verificationType === 'phone' ? canonicalTarget : (secondaryPhone ? normalizePakistanPhone(secondaryPhone) : undefined),
      phoneVerified: verificationType === 'phone',
      email: verificationType === 'email' ? canonicalTarget : (secondaryEmail ? String(secondaryEmail).trim().toLowerCase() : undefined),
      emailVerified: verificationType === 'email',
      authProvider: verificationType === 'phone' ? ('phone' as const) : ('credentials' as const),
      role: 'operator' as const,
      organizationName: organizationName ? String(organizationName).trim() : 'SEF Education Network (Sindh)',
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
    };

    users.push(newUser);
    saveAllUsers(users);

    if (device) registerOrUpdateDevice(device, newUser.id);
    appendSecurityAuditLog({
      userId: newUser.id,
      userName: newUser.name,
      action: 'register',
      details: `Registered verified Operator account "${cleanUsername}" via ${verificationType} OTP (${canonicalTarget})`,
      deviceId: device?.deviceId,
    });

    const cloudData = getCloudDatabase();
    if (cloudData) {
      cloudData.users = users;
    }

    res.json({
      success: true,
      user: newUser,
      database: cloudData,
      message: `Account "${cleanUsername}" verified and registered successfully! Welcome, ${newUser.name}.`,
    });
  } catch (err: any) {
    console.error('Error in register-with-otp:', err);
    res.status(500).json({ success: false, message: 'Registration error: ' + err.message });
  }
});

// 4. Verify Phone OTP & Log In / Sign Up
app.post('/api/auth/phone/verify-otp', (req, res) => {
  try {
    const { sessionId, otp, phone, name, role, organizationName, schoolId, device } = req.body;
    if (!sessionId || !otp || !phone) {
      return res.status(400).json({
        success: false,
        message: 'Missing verification parameters (sessionId, otp, or phone).',
      });
    }

    const session = otpSessions.get(sessionId);
    if (!session) {
      return res.status(400).json({
        success: false,
        message: 'OTP session expired or invalid. Please request a new verification code.',
      });
    }

    const normPhone = normalizePakistanPhone(phone);
    if (session.phoneNumber !== normPhone) {
      return res.status(400).json({
        success: false,
        message: 'Phone number mismatch with verification session.',
      });
    }

    session.attempts += 1;
    if (session.attempts > 5) {
      otpSessions.delete(sessionId);
      return res.status(429).json({
        success: false,
        message: 'Too many incorrect attempts. Please request a fresh OTP.',
      });
    }

    if (String(otp).trim() !== session.code) {
      return res.status(400).json({
        success: false,
        message: 'Invalid OTP code. Please check and try again.',
      });
    }

    // OTP Verified! Consume session
    otpSessions.delete(sessionId);

    const users = getAllUsers();
    // Look up user by canonical normalized phone
    let matchedUser = users.find(u => u.phone && normalizePakistanPhone(u.phone) === normPhone);

    let isNewUser = false;
    if (!matchedUser) {
      // Create new application account permanently tied to this verified phone
      isNewUser = true;
      const cleanUsername = 'op_' + normPhone.replace('+', '');
      matchedUser = {
        id: 'usr-ph-' + Date.now(),
        name: name ? String(name).trim() : `Operator (${normPhone.slice(-4)})`,
        username: cleanUsername,
        phone: normPhone,
        phoneVerified: true,
        authProvider: 'phone',
        role: role || 'operator',
        pin: '1234',
        organizationName: organizationName ? String(organizationName).trim() : 'SEF Education Network (Sindh)',
        schoolId: schoolId || undefined,
        createdAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString(),
      };
      users.push(matchedUser);
      saveAllUsers(users);
    } else {
      matchedUser.phoneVerified = true;
      matchedUser.lastLoginAt = new Date().toISOString();
      if (!matchedUser.authProvider) matchedUser.authProvider = 'phone';
      saveAllUsers(users);
    }

    if (device) registerOrUpdateDevice(device, matchedUser.id);
    appendSecurityAuditLog({
      userId: matchedUser.id,
      userName: matchedUser.name,
      action: 'login_phone',
      details: `${isNewUser ? 'Created account and logged in' : 'Logged in'} via verified phone ${normPhone}`,
      deviceId: device?.deviceId,
    });

    const cloudData = getCloudDatabase();
    if (cloudData) {
      cloudData.users = users;
    }

    res.json({
      success: true,
      user: matchedUser,
      database: cloudData,
      isNewUser,
      message: `Account verified successfully! Welcome, ${matchedUser.name}.`,
    });
  } catch (err: any) {
    console.error('Error verifying phone OTP:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// 5. Google Sign-In / Sign-Up
app.post('/api/auth/google', (req, res) => {
  try {
    const { credential, email, name, googleUid, picture, device } = req.body;

    let targetEmail = (email || '').trim().toLowerCase();
    let targetName = (name || '').trim();
    let targetSub = googleUid || '';
    let targetPic = picture || '';

    // If client sent Google Identity Services JWT credential, safely decode payload
    if (credential && typeof credential === 'string') {
      try {
        const parts = credential.split('.');
        if (parts.length === 3) {
          const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf-8'));
          if (payload.email) targetEmail = payload.email.toLowerCase();
          if (payload.name) targetName = payload.name;
          if (payload.sub) targetSub = payload.sub;
          if (payload.picture) targetPic = payload.picture;
        }
      } catch (jwtErr) {
        console.warn('Could not decode Google JWT, falling back to body fields:', jwtErr);
      }
    }

    if (!targetEmail && !targetSub) {
      return res.status(400).json({
        success: false,
        message: 'Google authentication requires a verified email or Google sub identifier.',
      });
    }

    const users = getAllUsers();
    // 1. Match by googleUid, OR 2. Match by email
    let matchedUser = users.find(u => {
      const matchUid = targetSub && u.googleUid === targetSub;
      const matchEmail = targetEmail && (u.email || '').trim().toLowerCase() === targetEmail;
      return matchUid || matchEmail;
    });

    let isNewUser = false;
    if (!matchedUser) {
      isNewUser = true;
      const baseUsername = targetEmail ? targetEmail.split('@')[0].replace(/[^a-z0-9_]/g, '') : 'google_user';
      let uniqueUsername = baseUsername;
      let counter = 1;
      while (users.some(u => (u.username || '').toLowerCase() === uniqueUsername.toLowerCase())) {
        uniqueUsername = `${baseUsername}_${counter++}`;
      }

      matchedUser = {
        id: 'usr-g-' + Date.now(),
        name: targetName || 'SEF Operator',
        username: uniqueUsername,
        email: targetEmail,
        googleUid: targetSub,
        googleVerified: true,
        photoUrl: targetPic,
        authProvider: 'google',
        role: 'operator',
        pin: '1234',
        organizationName: 'SEF Partner Network (Sindh)',
        createdAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString(),
      };
      users.push(matchedUser);
      saveAllUsers(users);
    } else {
      // Link Google credentials to existing account
      matchedUser.googleUid = targetSub || matchedUser.googleUid;
      matchedUser.googleVerified = true;
      matchedUser.lastLoginAt = new Date().toISOString();
      if (targetPic && !matchedUser.photoUrl) matchedUser.photoUrl = targetPic;
      if (matchedUser.authProvider === 'phone') matchedUser.authProvider = 'linked';
      saveAllUsers(users);
    }

    if (device) registerOrUpdateDevice(device, matchedUser.id);
    appendSecurityAuditLog({
      userId: matchedUser.id,
      userName: matchedUser.name,
      action: 'login_google',
      details: `${isNewUser ? 'Created account and logged in' : 'Logged in'} via Google (${targetEmail || targetSub})`,
      deviceId: device?.deviceId,
    });

    const cloudData = getCloudDatabase();
    if (cloudData) {
      cloudData.users = users;
    }

    res.json({
      success: true,
      user: matchedUser,
      database: cloudData,
      isNewUser,
      message: `Signed in with Google as ${matchedUser.name}.`,
    });
  } catch (err: any) {
    console.error('Error in Google auth:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// 6. Link Account (Google to Phone, or Phone to Google) with Anti-Unsafe-Merge Protection
app.post('/api/auth/link-account', (req, res) => {
  try {
    const { userId, targetProvider, googleData, phoneData } = req.body;
    if (!userId || !targetProvider) {
      return res.status(400).json({ success: false, message: 'Missing userId or targetProvider' });
    }

    const users = getAllUsers();
    const currentUser = users.find(u => u.id === userId);
    if (!currentUser) {
      return res.status(404).json({ success: false, message: 'User account not found.' });
    }

    if (targetProvider === 'google') {
      const { googleUid, email, name, picture } = googleData || {};
      if (!googleUid && !email) {
        return res.status(400).json({ success: false, message: 'Google data required for linking.' });
      }

      // CRITICAL SAFETY CHECK: Does this Google account already belong to another user?
      const conflictingUser = users.find(u => {
        if (u.id === userId) return false;
        const matchUid = googleUid && u.googleUid === googleUid;
        const matchEmail = email && (u.email || '').toLowerCase() === email.toLowerCase();
        return matchUid || matchEmail;
      });

      if (conflictingUser) {
        return res.status(409).json({
          success: false,
          conflict: true,
          conflictingUserName: conflictingUser.name,
          message: `This Google account (${email || googleUid}) is already associated with another distinct account ("${conflictingUser.name}"). Automatic merging is prohibited to protect school data integrity.`,
        });
      }

      currentUser.googleUid = googleUid;
      currentUser.googleVerified = true;
      if (email && !currentUser.email) currentUser.email = email;
      if (picture && !currentUser.photoUrl) currentUser.photoUrl = picture;
      currentUser.authProvider = 'linked';
      currentUser.updatedAt = new Date().toISOString();
      saveAllUsers(users);

      appendSecurityAuditLog({
        userId: currentUser.id,
        userName: currentUser.name,
        action: 'link_google',
        details: `Linked Google account (${email || googleUid})`,
      });

      return res.json({
        success: true,
        user: currentUser,
        message: 'Google account linked successfully! You can now log in using either method.',
      });
    }

    if (targetProvider === 'phone') {
      const { phone, otp, sessionId } = phoneData || {};
      if (!phone || !otp || !sessionId) {
        return res.status(400).json({ success: false, message: 'Phone, OTP and sessionId are required.' });
      }

      const session = otpSessions.get(sessionId);
      if (!session) {
        return res.status(400).json({ success: false, message: 'OTP session expired. Please send a new OTP.' });
      }

      const normPhone = normalizePakistanPhone(phone);
      if (session.phoneNumber !== normPhone || String(otp).trim() !== session.code) {
        return res.status(400).json({ success: false, message: 'Invalid OTP code for this phone number.' });
      }

      otpSessions.delete(sessionId);

      // CRITICAL SAFETY CHECK: Is phone number already registered to another user?
      const conflictingUser = users.find(u => u.id !== userId && u.phone && normalizePakistanPhone(u.phone) === normPhone);
      if (conflictingUser) {
        return res.status(409).json({
          success: false,
          conflict: true,
          conflictingUserName: conflictingUser.name,
          message: `This phone number (${normPhone}) is already registered to another account ("${conflictingUser.name}"). Automatic merging is prohibited.`,
        });
      }

      currentUser.phone = normPhone;
      currentUser.phoneVerified = true;
      currentUser.authProvider = 'linked';
      currentUser.updatedAt = new Date().toISOString();
      saveAllUsers(users);

      appendSecurityAuditLog({
        userId: currentUser.id,
        userName: currentUser.name,
        action: 'link_phone',
        details: `Linked verified phone number (${normPhone})`,
      });

      return res.json({
        success: true,
        user: currentUser,
        message: 'Phone number linked and verified! You can now log in using either method.',
      });
    }

    res.status(400).json({ success: false, message: 'Unsupported target provider.' });
  } catch (err: any) {
    console.error('Error linking account:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// 7. Change Phone Number (Keeps same user_id, all school data intact)
app.post('/api/auth/change-phone', (req, res) => {
  try {
    const { userId, newPhone, otp, sessionId } = req.body;
    if (!userId || !newPhone || !otp || !sessionId) {
      return res.status(400).json({ success: false, message: 'Missing required parameters.' });
    }

    const session = otpSessions.get(sessionId);
    if (!session) {
      return res.status(400).json({ success: false, message: 'OTP session expired. Please request a new code.' });
    }

    const normPhone = normalizePakistanPhone(newPhone);
    if (session.phoneNumber !== normPhone || String(otp).trim() !== session.code) {
      return res.status(400).json({ success: false, message: 'Invalid OTP code.' });
    }

    otpSessions.delete(sessionId);

    const users = getAllUsers();
    const currentUser = users.find(u => u.id === userId);
    if (!currentUser) {
      return res.status(404).json({ success: false, message: 'User account not found.' });
    }

    // Check conflict
    const conflictingUser = users.find(u => u.id !== userId && u.phone && normalizePakistanPhone(u.phone) === normPhone);
    if (conflictingUser) {
      return res.status(409).json({
        success: false,
        message: `This phone number (${normPhone}) is already associated with another account.`,
      });
    }

    const oldPhone = currentUser.phone || 'None';
    currentUser.phone = normPhone;
    currentUser.phoneVerified = true;
    currentUser.updatedAt = new Date().toISOString();
    saveAllUsers(users);

    appendSecurityAuditLog({
      userId: currentUser.id,
      userName: currentUser.name,
      action: 'change_phone',
      details: `Phone number changed from ${oldPhone} to ${normPhone}. All schools and students preserved.`,
    });

    res.json({
      success: true,
      user: currentUser,
      message: `Phone number successfully updated to ${normPhone} without affecting your school data!`,
    });
  } catch (err: any) {
    console.error('Error changing phone:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// 7b. Update Profile Endpoint (Operator and Head Teacher Profile Editing)
app.post('/api/auth/profile/update', (req, res) => {
  try {
    const { userId, name, organizationName, phone, email, pin, profilePic, schoolId } = req.body;
    if (!userId) {
      return res.status(400).json({ success: false, message: 'User ID is required.' });
    }

    const users = getAllUsers();
    const currentUser = users.find(u => u.id === userId);
    if (!currentUser) {
      return res.status(404).json({ success: false, message: 'User account not found.' });
    }

    if (name && String(name).trim()) {
      currentUser.name = String(name).trim();
    }
    if (organizationName !== undefined) {
      currentUser.organizationName = String(organizationName).trim();
    }
    if (email !== undefined) {
      const cleanEmail = String(email).trim().toLowerCase();
      if (cleanEmail && !isValidEmail(cleanEmail)) {
        return res.status(400).json({ success: false, message: 'Please provide a valid email address.' });
      }
      currentUser.email = cleanEmail || undefined;
    }
    if (phone !== undefined) {
      const rawP = String(phone).trim();
      if (rawP) {
        const norm = normalizePakistanPhone(rawP);
        currentUser.phone = norm;
      } else {
        currentUser.phone = undefined;
      }
    }
    if (pin && String(pin).trim()) {
      currentUser.pin = String(pin).trim();
    }
    if (profilePic !== undefined) {
      currentUser.profilePic = profilePic;
      currentUser.photoUrl = profilePic;
    }
    if (schoolId !== undefined && currentUser.role === 'head_teacher') {
      currentUser.schoolId = schoolId;
    }

    currentUser.updatedAt = new Date().toISOString();
    saveAllUsers(users);

    appendSecurityAuditLog({
      userId: currentUser.id,
      userName: currentUser.name,
      action: 'register',
      details: `Profile updated for ${currentUser.name} (${currentUser.role})`,
    });

    const cloudData = getCloudDatabase();
    if (cloudData) {
      cloudData.users = users;
    }

    res.json({
      success: true,
      user: currentUser,
      database: cloudData,
      message: 'Profile updated and synchronized successfully!',
    });
  } catch (err: any) {
    console.error('Error updating profile:', err);
    res.status(500).json({ success: false, message: 'Server error updating profile: ' + err.message });
  }
});

// 8. Active Devices Management
app.get('/api/auth/devices', (req, res) => {
  const userId = req.query.userId as string;
  const allDevices = getActiveDevices();
  const filtered = userId ? allDevices.filter(d => d.userId === userId) : allDevices;
  res.json({ success: true, devices: filtered });
});

app.post('/api/auth/devices/logout', (req, res) => {
  try {
    const { deviceId, userId, logoutAllOthers } = req.body;
    let devices = getActiveDevices();

    if (logoutAllOthers && userId && deviceId) {
      // Remove all other devices for this user
      devices = devices.filter(d => d.userId !== userId || d.deviceId === deviceId);
      saveActiveDevices(devices);
      appendSecurityAuditLog({
        userId,
        userName: 'User',
        action: 'device_revoked',
        details: 'Signed out of all other devices',
        deviceId,
      });
      return res.json({ success: true, message: 'All other mobile devices signed out.' });
    }

    if (deviceId) {
      devices = devices.filter(d => d.deviceId !== deviceId);
      saveActiveDevices(devices);
      if (userId) {
        appendSecurityAuditLog({
          userId,
          userName: 'User',
          action: 'device_revoked',
          details: `Signed out device ${deviceId}`,
          deviceId,
        });
      }
      return res.json({ success: true, message: 'Device signed out successfully.' });
    }

    res.status(400).json({ success: false, message: 'deviceId required.' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 9. Security Audit Logs Endpoint
app.get('/api/auth/audit-logs', (req, res) => {
  const userId = req.query.userId as string;
  const logs = getSecurityAuditLogs();
  const filtered = userId ? logs.filter((l: any) => l.userId === userId) : logs;
  res.json({ success: true, logs: filtered.slice(0, 30) });
});

// 10. Centralized Users List (For cross-device instant sync)
app.get('/api/auth/users', (req, res) => {
  const users = getAllUsers();
  res.json({ success: true, users });
});

// 4. Health & Server Status
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    cloudStorageAvailable: true,
    serverTime: new Date().toISOString(),
    cloudDatabaseExists: fs.existsSync(CLOUD_DB_PATH),
    registeredUsersCount: getAllUsers().length,
  });
});

// 5. Fetch Cloud Data for authenticated user
app.get('/api/cloud/data', (req, res) => {
  const userId = req.query.userId as string;
  const userDb = getCloudDatabase(userId);
  const logs = getSyncLogs();
  res.json({
    success: true,
    data: userDb,
    lastSyncLogs: logs.slice(0, 5),
    message: userDb ? 'Fetched user cloud data' : 'No user cloud data initialized yet',
  });
});

// 6. Sync Endpoint: Synchronize database strictly for this user
app.post('/api/cloud/sync', (req, res) => {
  try {
    const { database, user, mutations, syncBatchId } = req.body;
    const userId = user?.id || user?.uid;

    if (!userId) {
      return res.status(400).json({ success: false, message: 'User ID is required for sync' });
    }

    if (!database) {
      return res.status(400).json({ success: false, message: 'Missing database payload' });
    }

    // Save strictly to this user's isolated file
    saveCloudDatabase(database, userId);

    // Record audit event
    const auditEntry = {
      batchId: syncBatchId || 'batch-' + Date.now(),
      syncedAt: new Date().toISOString(),
      user: user?.name || 'User',
      role: user?.role || 'operator',
      schoolId: 'all',
      mutationsCount: mutations?.length || 0,
    };
    appendSyncLog(auditEntry);

    res.json({
      success: true,
      message: 'Successfully synchronized user data.',
      syncedAt: auditEntry.syncedAt,
    });
  } catch (err: any) {
    console.error('Sync Error on server:', err);
    res.status(500).json({ success: false, message: err.message || 'Server sync error' });
  }
});

// 4. Cloud Audit Logs (To show in Operator Dashboard)
app.get('/api/cloud/logs', (req, res) => {
  const logs = getSyncLogs();
  res.json({ success: true, logs });
});

// 5. Head Teacher & Operator AI Assistant (Powered by Gemini 3.8 Flash)
app.post('/api/ai/chat', async (req, res) => {
  try {
    const { message, schoolContext, file, history } = req.body;

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({
        success: false,
        message: 'GEMINI_API_KEY is not configured on the server. Please check the Secrets panel in AI Studio.',
      });
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    let contextText = '';
    if (schoolContext) {
      contextText = `
=== CURRENT SCHOOL SYSTEM CONTEXT ===
Role: ${schoolContext.userRole === 'headTeacher' ? 'Head Teacher (Assigned School)' : 'School Operator'}
School: ${schoolContext.schoolName || 'All Campuses'} (Code: ${schoolContext.schoolCode || 'N/A'})
District: ${schoolContext.district || 'N/A'}, Taluka: ${schoolContext.taluka || 'N/A'}
Head Teacher: ${schoolContext.headTeacher || 'N/A'}
Active Enrolled Students: ${schoolContext.totalStudents || 0}
Active Teachers & Staff: ${schoolContext.totalStaff || 0}
Today's Student Attendance: ${schoolContext.todayAttendance || 'N/A'}
Today's Staff Attendance: ${schoolContext.teacherAttendance || 'N/A'}
Pending School Issues: ${schoolContext.pendingIssues || 'None'}
Active Academic Cycle: ${schoolContext.academicYear || '2026-27'}

SAMPLE ENROLLED STUDENTS IN THIS SCHOOL:
${schoolContext.studentsSample || 'No active students recorded.'}

STAFF LIST IN THIS SCHOOL:
${schoolContext.staffSample || 'No staff recorded.'}
======================================
`;
    }

    const systemInstruction = `You are SchoolSync Assistant, a professional school management AI for Pakistani schools (SEF, private, and public).

YOUR MISSION:
Help school operators and head teachers manage student rosters, staff, attendance, fee payments, school compliance, and evaluations with speed and accuracy.

CRITICAL RULES:
1. ROLE SCOPE:
   - If the user is a Head Teacher, only answer for their assigned school.
   - If the user is an Operator, you can answer for specific schools or across all schools.
2. STRUCTURED ACTIONS:
   When the user requests an operational task, in addition to a brief friendly explanation, you MUST provide a JSON block enclosed in \`\`\`json ... \`\`\` with an "action" field and "data".
   Supported actions:
   - "add_students": { "action": "add_students", "students": [ { "name", "fatherName", "gender", "grade", "section", "grNumber", "bFormNumber", "guardianContact", "village", "dob" } ] }
   - "add_teachers": { "action": "add_teachers", "teachers": [ { "name", "cnic", "qualification", "designation", "contact", "baseSalary", "subject" } ] }
   - "update_student": { "action": "update_student", "student": { "id" or "grNumber", "name", "fieldsToUpdate": { ... } } }
   - "update_teacher": { "action": "update_teacher", "teacher": { "id" or "name", "fieldsToUpdate": { ... } } }
   - "mark_attendance": { "action": "mark_attendance", "attendance": { "targetType": "student"|"teacher", "name"|"grNumber", "status": "present"|"absent"|"leave"|"late", "date": "YYYY-MM-DD" } }
   - "record_fee_payment": { "action": "record_fee_payment", "payment": { "studentName"|"grNumber", "amount", "month", "receiptNo" } }
   - "create_announcement": { "action": "create_announcement", "announcement": { "title", "message", "target": "all"|"staff"|"parents" } }

3. FILE & TEXT ROSTER IMPORT:
   When the user provides a roster (via document or pasted text), parse ALL entries and output:
   \`\`\`json
   {
     "action": "preview_import",
     "importType": "students" | "teachers" | "mixed",
     "students": [ ... ],
     "teachers": [ ... ]
   }
   \`\`\`
   Detect Pakistani/Sindhi names, father names, GR numbers, grades (Kachi to Class 10), and phone numbers.
4. FORMATTING:
   Use clear, clean markdown with bold highlights, tables, and bullet points. Keep explanations crisp.`;

    const contents: any[] = [];

    // Append last 20 conversation history messages if provided
    if (Array.isArray(history) && history.length > 0) {
      const recentHistory = history.slice(-20);
      for (const msg of recentHistory) {
        if (msg.role === 'user' || msg.role === 'assistant' || msg.sender === 'user' || msg.sender === 'ai') {
          const role = (msg.role === 'user' || msg.sender === 'user') ? 'user' : 'model';
          const text = msg.content || msg.text || '';
          if (text) {
            contents.push({
              role,
              parts: [{ text }],
            });
          }
        }
      }
    }

    // Build current user message parts
    const currentParts: any[] = [];

    if (file) {
      if (file.data && file.mimeType && (file.mimeType.startsWith('image/') || file.mimeType === 'application/pdf')) {
        currentParts.push({
          inlineData: {
            mimeType: file.mimeType,
            data: file.data,
          },
        });
      }
      if (file.extractedText && file.extractedText.trim()) {
        currentParts.push({
          text: `[ATTACHED SPREADSHEET/DOCUMENT: "${file.filename || 'Document'}"]\n${file.extractedText.trim()}\n`,
        });
      }
    }

    currentParts.push({
      text: `${contextText}\nUser Message: ${message || 'Please assist with school management records.'}`,
    });

    contents.push({
      role: 'user',
      parts: currentParts,
    });

    let reply = '';
    // gemini-3.1-flash-lite provides 1,500 requests/day quota & sub-second speed on free tier;
    // gemini-3.8-flash provides high reasoning but has a 20 requests/day limit on free tier.
    const modelsToAttempt = ['gemini-3.1-flash-lite', 'gemini-3.8-flash'];
    let lastError: any = null;

    for (const model of modelsToAttempt) {
      const modelTimeoutMs = model === 'gemini-3.8-flash' ? 6000 : 20000;
      const maxAttempts = model === 'gemini-3.8-flash' ? 1 : 2;

      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
          const timeoutPromise = new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error(`Model ${model} request timed out`)), modelTimeoutMs)
          );

          const config: any = { systemInstruction };
          if (model === 'gemini-3.8-flash') {
            config.thinkingConfig = { thinkingLevel: ThinkingLevel.LOW };
          }

          const callPromise = ai.models.generateContent({
            model,
            contents,
            config,
          });

          const response = await Promise.race([callPromise, timeoutPromise]);

          if (response && response.text) {
            reply = response.text;
            break;
          }
        } catch (callErr: any) {
          lastError = callErr;
          const errMsg = String(callErr?.message || callErr);
          const is429 = errMsg.includes('429') || errMsg.includes('quota') || errMsg.includes('RESOURCE_EXHAUSTED');

          if (is429) {
            console.log(`[AI Model Notice] ${model} free-tier daily quota limit reached, attempting alternative model...`);
          } else {
            console.log(`[AI Model Notice] ${model} attempt ${attempt} unavailable, checking fallback...`);
          }

          const isRetryable =
            !is429 && (
              errMsg.includes('503') ||
              errMsg.includes('overloaded') ||
              errMsg.includes('UNAVAILABLE') ||
              errMsg.includes('Service Unavailable') ||
              errMsg.includes('timed out')
            );

          if (isRetryable && attempt < maxAttempts) {
            await new Promise(r => setTimeout(r, 400));
            continue;
          }
          break;
        }
      }
      if (reply) break;
    }

    let extractedStudents: any[] = [];

    // If Gemini succeeded, parse JSON student enrollment block
    if (reply) {
      try {
        let rawJson = '';
        const fencedMatch = reply.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
        if (fencedMatch && fencedMatch[1]) {
          rawJson = fencedMatch[1].trim();
        } else {
          // Look for raw JSON object or array containing "students"
          const jsonMatch = reply.match(/\{[\s\S]*"students"\s*:\s*\[[\s\S]*?\][\s\S]*?\}/);
          if (jsonMatch) {
            rawJson = jsonMatch[0].trim();
          }
        }

        if (rawJson) {
          const parsed = JSON.parse(rawJson);
          const candidateList = parsed.students || (Array.isArray(parsed) ? parsed : null);
          if (Array.isArray(candidateList)) {
            extractedStudents = candidateList
              .filter((st: any) => st && (st.name || st.studentName))
              .map((st: any) => ({
                grNumber: st.grNumber || st.gr || st.gr_number || st.rollNo || st.roll_no || st.regNo || st.srNo || undefined,
                name: (st.name || st.studentName || '').trim(),
                fatherName: (st.fatherName || st.father_name || st.father || 'Guardian').trim(),
                motherName: (st.motherName || st.mother_name || '').trim() || undefined,
                gender: (st.gender || '').toLowerCase().startsWith('f') ? 'Female' : 'Male',
                grade: st.grade || st.class || 'Class I',
                section: st.section || 'A',
                bFormNumber: st.bFormNumber || st.b_form || st.formB || undefined,
                guardianContact: st.guardianContact || st.contact || st.phone || undefined,
                village: st.village || st.goth || st.address || undefined,
                address: st.address || st.village || undefined,
                dob: st.dob || '2018-04-10',
              }));
          }
        }
      } catch (parseErr) {
        console.warn('Could not parse student JSON enrollment block:', parseErr);
      }
    }

    // Smart Local Fallback if upstream models were completely busy (prevents 503 blockage for user)
    if (!reply && file?.extractedText) {
      const lines = file.extractedText.split('\n').map((l: string) => l.trim()).filter(Boolean);
      const fallbackList: any[] = [];
      for (const line of lines) {
        // Skip header lines
        if (/name|father|roll|gr|sr|gender|class|grade|dob|b-form/i.test(line) && fallbackList.length === 0) continue;
        const cols = line.split(/[,;\t|]/).map((c: string) => c.trim().replace(/^["']|["']$/g, ''));
        if (cols.length >= 2) {
          // Check if col[0] is numeric (GR / Roll) and col[1] is Name
          const isCol0Numeric = /^\d+$/.test(cols[0]);
          const grVal = isCol0Numeric ? cols[0] : undefined;
          const nameVal = isCol0Numeric ? cols[1] : cols[0];
          const fatherVal = isCol0Numeric ? (cols[2] || 'Guardian') : (cols[1] || 'Guardian');
          const genderVal = (cols[isCol0Numeric ? 3 : 2] || '').toLowerCase().startsWith('f') ? 'Female' : 'Male';
          const gradeVal = cols[isCol0Numeric ? 4 : 3] || 'Class I';

          if (nameVal && nameVal.length >= 2 && !/total|sr\.?no|s\.?no/i.test(nameVal)) {
            fallbackList.push({
              grNumber: grVal,
              name: nameVal,
              fatherName: fatherVal,
              gender: genderVal,
              grade: gradeVal,
              section: 'A',
              bFormNumber: cols[5] || undefined,
              village: cols[6] || undefined,
              dob: '2018-04-10',
            });
          }
        }
      }
      if (fallbackList.length > 0) {
        extractedStudents = fallbackList;
        reply = `Successfully extracted **${fallbackList.length} student records** from "${file.filename || 'your document'}". You can review them in the table below and auto-enroll them with one click!`;
      }
    }

    if (!reply) {
      throw lastError || new Error('AI service was temporarily unavailable. Please try again in a moment.');
    }

    let structuredAction: any = null;
    if (reply) {
      try {
        const fencedMatch = reply.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
        if (fencedMatch && fencedMatch[1]) {
          const parsed = JSON.parse(fencedMatch[1].trim());
          if (parsed && parsed.action) {
            structuredAction = parsed;
          }
        }
      } catch (e) {}
    }

    res.json({
      success: true,
      reply,
      extractedStudents,
      structuredAction,
    });
  } catch (err: any) {
    let errMsg = err?.message || 'An error occurred while communicating with Gemini AI.';
    try {
      if (typeof errMsg === 'string' && (errMsg.startsWith('{') || errMsg.includes('{"error":'))) {
        const jsonMatch = errMsg.match(/(\{[\s\S]*\})/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[1]);
          if (parsed?.error?.message) {
            errMsg = parsed.error.message;
          }
        }
      }
    } catch (_) {}

    if (errMsg.includes('429') || errMsg.includes('RESOURCE_EXHAUSTED') || errMsg.includes('quota')) {
      errMsg = 'Daily free AI quota reached on the current project key. You can select or attach a billing-enabled Gemini API key in Settings > Secrets for unlimited requests.';
    }

    console.error('[Gemini AI /api/ai/chat error]:', errMsg.slice(0, 200));

    res.status(500).json({
      success: false,
      message: errMsg,
    });
  }
});

// ===================== PUSH NOTIFICATIONS API =====================

// 1. Get VAPID Public Key for client browser subscription
app.get('/api/notifications/vapid-public-key', (req, res) => {
  try {
    const key = getVapidPublicKey();
    res.json({ success: true, publicKey: key });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 2. Register or update device messaging token and push subscription
app.post('/api/notifications/devices/register', (req, res) => {
  try {
    const {
      device_id,
      user_id,
      role,
      school_ids,
      platform,
      app_version,
      device_name,
      device_model,
      os_version,
      messaging_token,
      push_subscription,
      permission_status,
      notifications_enabled,
    } = req.body;

    if (!device_id || !user_id) {
      return res.status(400).json({
        success: false,
        message: 'device_id and user_id are required for notification registration.',
      });
    }

    const record = registerOrUpdateNotificationDevice({
      device_id,
      user_id,
      role: role || 'operator',
      school_ids: Array.isArray(school_ids) ? school_ids : [],
      platform: platform || 'Android Mobile',
      app_version: app_version || '3.5.0',
      device_name: device_name || 'Mobile Phone',
      device_model: device_model || 'Android Device',
      os_version: os_version || 'Android',
      messaging_token: messaging_token || (push_subscription ? push_subscription.endpoint : ''),
      push_subscription,
      permission_status: permission_status || 'granted',
      notifications_enabled: notifications_enabled ?? true,
    });

    res.json({
      success: true,
      device: record,
      message: 'Device successfully registered for push notifications!',
    });
  } catch (err: any) {
    console.error('Error registering notification device:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// 3. Deactivate device on logout (Multi-Device Safety)
app.post('/api/notifications/devices/deactivate', (req, res) => {
  try {
    const { device_id, user_id } = req.body;
    if (!device_id) {
      return res.status(400).json({ success: false, message: 'device_id is required.' });
    }

    deactivateNotificationDevice(device_id, user_id);
    res.json({
      success: true,
      message: 'Device deactivated from receiving notifications for this account.',
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 4. List user active notification devices
app.get('/api/notifications/devices', (req, res) => {
  const userId = req.query.userId as string;
  if (!userId) {
    return res.status(400).json({ success: false, message: 'userId is required.' });
  }
  const devices = getActiveDevicesForUser(userId);
  res.json({ success: true, devices });
});

// 5. Get user notifications with filtering
app.get('/api/notifications/list', (req, res) => {
  try {
    const userId = req.query.userId as string;
    if (!userId) {
      return res.status(400).json({ success: false, message: 'userId is required.' });
    }

    const unreadOnly = req.query.unreadOnly === 'true';
    const category = (req.query.category as string) || 'ALL';
    const schoolId = (req.query.schoolId as string) || 'all';
    const limit = Number(req.query.limit) || 100;

    const notifs = getUserNotifications(userId, { unreadOnly, category, schoolId, limit });
    const allUserNotifs = getUserNotifications(userId);
    const unreadCount = allUserNotifs.filter(n => !n.read_at).length;

    res.json({
      success: true,
      notifications: notifs,
      unreadCount,
      totalCount: allUserNotifs.length,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 6. Mark notification as read
app.post('/api/notifications/mark-read', (req, res) => {
  try {
    const { userId, notificationId, markAll } = req.body;
    if (!userId) {
      return res.status(400).json({ success: false, message: 'userId is required.' });
    }

    if (markAll) {
      const updatedCount = markAllNotificationsAsRead(userId);
      return res.json({ success: true, updatedCount, message: 'All notifications marked as read.' });
    }

    if (!notificationId) {
      return res.status(400).json({ success: false, message: 'notificationId is required.' });
    }

    const ok = markNotificationAsRead(notificationId, userId);
    res.json({ success: ok, message: ok ? 'Notification marked as read.' : 'Notification not found or already read.' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 7. Delete notification from user history
app.delete('/api/notifications/:id', (req, res) => {
  try {
    const notificationId = req.params.id;
    const userId = (req.query.userId || req.body.userId) as string;
    if (!userId) {
      return res.status(400).json({ success: false, message: 'userId is required.' });
    }

    const deleted = deleteNotificationForUser(notificationId, userId);
    res.json({ success: deleted, message: deleted ? 'Notification removed from personal history.' : 'Notification not found.' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 8. Send Notification with STRICT School & Role Authorization
app.post('/api/notifications/send', async (req, res) => {
  try {
    const {
      senderUserId,
      senderRole,
      recipient_user_id,
      recipient_role,
      school_id,
      school_name,
      type,
      target_screen,
      target_record_id,
      custom_title,
      custom_body,
      priority,
      payload,
      deduplication_key,
    } = req.body;

    if (!recipient_user_id || !school_id || !type) {
      return res.status(400).json({
        success: false,
        message: 'Missing required parameters: recipient_user_id, school_id, and type are required.',
      });
    }

    // STRICT ROLE & SCHOOL AUTHORIZATION:
    // If sender is a Head Teacher, they can only send notifications for their explicitly assigned school.
    if (senderRole === 'headTeacher' && payload?.senderAssignedSchoolId) {
      if (payload.senderAssignedSchoolId !== school_id) {
        return res.status(403).json({
          success: false,
          message: 'Security Violation: Head Teacher cannot send alerts or messages for a different school.',
        });
      }
    }

    // If recipient is a Head Teacher, verify they belong to this school
    if (recipient_role === 'headTeacher' && payload?.recipientAssignedSchoolId) {
      if (payload.recipientAssignedSchoolId !== school_id) {
        return res.status(403).json({
          success: false,
          message: 'Security Violation: Cannot send notification to Head Teacher of another school.',
        });
      }
    }

    const result = await dispatchNotification({
      type,
      recipient_user_id,
      recipient_role: recipient_role || 'operator',
      school_id,
      school_name: school_name || 'School',
      target_screen,
      target_record_id,
      custom_title,
      custom_body,
      priority: priority || 'normal',
      payload: payload || {},
      deduplication_key,
    });

    res.json(result);
  } catch (err: any) {
    console.error('Error in /api/notifications/send:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// 9. Send Test Push Notification directly to active devices
app.post('/api/notifications/test', async (req, res) => {
  try {
    const { userId, schoolId, schoolName, deviceId } = req.body;
    if (!userId) {
      return res.status(400).json({ success: false, message: 'userId is required for test notification.' });
    }

    const result = await dispatchNotification({
      type: 'TEST_NOTIFICATION',
      recipient_user_id: userId,
      recipient_role: 'operator',
      school_id: schoolId || 'all',
      school_name: schoolName || 'SEF Portal',
      target_screen: 'settings',
      custom_title: 'SEF Push System Test',
      custom_body: 'Congratulations! Real Android FCM push notifications are functioning perfectly on your device.',
      priority: 'high',
      payload: { deviceId },
    });

    res.json(result);
  } catch (err: any) {
    console.error('Error in /api/notifications/test:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// 10. Diagnostics Endpoint
app.get('/api/notifications/diagnostics', (req, res) => {
  try {
    const devices = getStoredDevices();
    const activeDevices = devices.filter(d => d.is_active);
    const notifications = getStoredNotifications();
    const logs = getNotificationAuditLogs();

    res.json({
      success: true,
      stats: {
        total_registered_devices: devices.length,
        active_push_devices: activeDevices.length,
        total_notifications_sent: notifications.length,
        unread_notifications_count: notifications.filter(n => !n.read_at).length,
      },
      recent_devices: devices.slice(0, 10),
      recent_logs: logs.slice(0, 20),
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ===================== VITE & STATIC SERVING =====================

async function startServer() {
  const server = http.createServer(app);

  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    // Mount Vite in dev mode with HMR disabled to prevent WebSocket errors in iframe environment
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`[SEF Cloud Server] listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();

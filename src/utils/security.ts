import { z } from 'zod';

/**
 * ==========================================
 * GOUUJI PET BUSINESS - SECURITY MODULE
 * ==========================================
 * This module enforces Input Validation and Password Security.
 */

// 1. Password Security
// Requires minimum 8 characters, at least 1 uppercase, 1 lowercase, 1 number, and 1 special character.
export const passwordSchema = z.string()
  .min(8, { message: 'Password must be at least 8 characters long.' })
  .regex(/[A-Z]/, { message: 'Password must contain at least one uppercase letter.' })
  .regex(/[a-z]/, { message: 'Password must contain at least one lowercase letter.' })
  .regex(/[0-9]/, { message: 'Password must contain at least one number.' })
  .regex(/[^A-Za-z0-9]/, { message: 'Password must contain at least one special character.' })
  .max(100, { message: 'Password is too long.' });

export const checkPasswordStrength = (password: string) => {
  const result = passwordSchema.safeParse(password);
  if (!result.success) {
    return {
      isStrong: false,
      errors: result.error.issues.map(i => i.message)
    };
  }
  return { isStrong: true, errors: [] };
};

// Disposable Email Checker
export const isDisposableEmail = (email: string): boolean => {
  const disposableDomains = [
    '10minutemail.com', 'tempmail.com', 'mailinator.com', 
    'guerrillamail.com', 'yopmail.com', 'trashmail.com', 
    'throwawaymail.com', 'temp-mail.org', 'getairmail.com', 
    'tempmailaddress.com', 'mohmail.com', 'dispostable.com', 
    'maildrop.cc'
  ];
  const domain = email.split('@')[1]?.toLowerCase();
  if (!domain) return false;
  return disposableDomains.some(d => domain === d || domain.endsWith(`.${d}`));
};

// 2. Input Validation (Auth)
export const authLoginSchema = z.object({
  email: z.string().email({ message: 'Please enter a valid email address.' }).max(255),
  password: z.string().min(1, { message: 'Password is required.' })
});

export const authRegisterSchema = z.object({
  full_name: z.string().min(2, { message: 'Full name must be at least 2 characters.' }).max(100).regex(/^[a-zA-Z\s]+$/, { message: 'Name can only contain letters and spaces.' }),
  email: z.string().email({ message: 'Please enter a valid email address.' }).max(255),
  password: passwordSchema,
  phone: z.string().regex(/^\+?[1-9]\d{9,14}$/, { message: 'Please enter a valid phone number.' }).optional().or(z.literal(''))
});

// 3. Input Validation (Pet Profiles)
export const petProfileSchema = z.object({
  name: z.string().min(1).max(50).regex(/^[^<>]+$/, "Invalid characters"),
  species: z.string().min(1).max(30),
  breed: z.string().max(50).optional().or(z.literal('')),
  weight: z.number().positive().max(200).optional().or(z.literal('')),
  food_preferences: z.string().max(500).optional().or(z.literal('')),
  medical_history: z.string().max(1000).optional().or(z.literal('')),
  allergies: z.string().max(500).optional().or(z.literal(''))
});

// Sanitization utility for descriptions / text inputs
export const sanitizeText = (text: string) => {
  if (!text) return text;
  // Basic XSS protection: replace < and >
  return text.replace(/</g, "&lt;").replace(/>/g, "&gt;");
};

export const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

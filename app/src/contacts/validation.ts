import * as z from 'zod';

// Email regex pattern for validation
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Phone regex - supports various formats: (123) 456-7890, 123-456-7890, 123.456.7890, +1 123 456 7890, etc.
const phoneRegex = /^[\d\s\-\+\(\)\.]+$/;

// URL regex for basic website validation
const urlRegex = /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/;

// Validation schema for creating a contact
export const createContactSchema = z.object({
  firstName: z
    .string()
    .trim()
    .min(1, 'First name is required')
    .max(50, 'First name must be 50 characters or less'),

  lastName: z
    .string()
    .trim()
    .min(1, 'Last name is required')
    .max(50, 'Last name must be 50 characters or less'),

  email: z
    .string()
    .trim()
    .max(100, 'Email must be 100 characters or less')
    .refine((val) => val === '' || emailRegex.test(val), {
      message: 'Please enter a valid email address',
    })
    .optional()
    .transform((val) => val || ''),

  phone: z
    .string()
    .trim()
    .max(20, 'Phone number must be 20 characters or less')
    .refine((val) => val === '' || phoneRegex.test(val), {
      message: 'Please enter a valid phone number',
    })
    .optional()
    .transform((val) => val || ''),

  company: z
    .string()
    .trim()
    .max(100, 'Company name must be 100 characters or less')
    .optional()
    .transform((val) => val || ''),

  title: z
    .string()
    .trim()
    .max(100, 'Title must be 100 characters or less')
    .optional()
    .transform((val) => val || ''),

  website: z
    .string()
    .trim()
    .max(200, 'Website must be 200 characters or less')
    .refine((val) => val === '' || urlRegex.test(val), {
      message: 'Please enter a valid website URL',
    })
    .optional()
    .transform((val) => val || ''),

  notes: z
    .string()
    .trim()
    .max(1000, 'Notes must be 1000 characters or less')
    .optional()
    .transform((val) => val || ''),

  tileImageKey: z
    .string()
    .optional(),

  cardImageKey: z
    .string()
    .optional(),
});

// Validation schema for updating a contact (includes id)
export const updateContactSchema = createContactSchema.extend({
  id: z.string().uuid('Invalid contact ID'),
});

// Type exports
export type CreateContactInput = z.infer<typeof createContactSchema>;
export type UpdateContactInput = z.infer<typeof updateContactSchema>;

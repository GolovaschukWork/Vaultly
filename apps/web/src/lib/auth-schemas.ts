import { z } from 'zod';

const emailField = z
  .string()
  .trim()
  .min(1, 'emailRequired')
  .email('invalidEmail')
  .max(255, 'emailTooLong');

const passwordField = z.string().min(6, 'passwordTooShort').max(128, 'passwordTooLong');

export type AuthFormValues = {
  email: string;
  password: string;
  confirmPassword: string;
};

export function createAuthFormSchema(mode: 'signIn' | 'signUp') {
  return z
    .object({
      email: emailField,
      password: passwordField,
      confirmPassword: z.string().max(128),
    })
    .superRefine((data, ctx) => {
      if (mode !== 'signUp') return;

      if (data.confirmPassword.length < 6) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'passwordTooShort',
          path: ['confirmPassword'],
        });
        return;
      }

      if (data.password !== data.confirmPassword) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'passwordsMustMatch',
          path: ['confirmPassword'],
        });
      }
    });
}

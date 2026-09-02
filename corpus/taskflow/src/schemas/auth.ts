import { z } from "zod";
import { emailSchema } from "./common";

const passwordSchema = z
  .string()
  .min(12, "use at least 12 characters")
  .max(128)
  .regex(/[a-z]/, "include a lowercase letter")
  .regex(/[A-Z]/, "include an uppercase letter")
  .regex(/[0-9]/, "include a digit");

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "enter your password"),
  rememberMe: z.boolean().default(false),
});

export const registerSchema = z
  .object({
    name: z.string().min(1).max(80),
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string(),
    acceptTerms: z.literal(true, "you must accept the terms"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "passwords do not match",
    path: ["confirmPassword"],
  });

export const passwordResetRequestSchema = z.object({
  email: emailSchema,
});

export const passwordResetConfirmSchema = z
  .object({
    token: z.string().min(16),
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "passwords do not match",
    path: ["confirmPassword"],
  });

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type PasswordResetRequestInput = z.infer<
  typeof passwordResetRequestSchema
>;
export type PasswordResetConfirmInput = z.infer<
  typeof passwordResetConfirmSchema
>;

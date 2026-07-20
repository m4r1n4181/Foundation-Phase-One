import { pgTable, uuid, text, boolean, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";

// Extensible role enum — nurse slot is included even though not fully scoped yet (per PRD)
export const userRoleEnum = pgEnum("user_role", [
  "doctor",
  "clinic_admin",
  "nurse",
]);

export const usersTable = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: userRoleEnum("role").notNull(),
  fullName: text("full_name").notNull(),
  phone: text("phone"),
  // MFA — default ON per compliance requirement
  mfaEnabled: boolean("mfa_enabled").notNull().default(true),
  mfaSecret: text("mfa_secret"), // TOTP secret (encrypted at application layer)
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
});

export const insertUserSchema = createInsertSchema(usersTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  lastLoginAt: true,
});
export const selectUserSchema = createSelectSchema(usersTable).omit({
  passwordHash: true,
  mfaSecret: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;
export type SafeUser = Omit<User, "passwordHash" | "mfaSecret">;

"use server";

import crypto from "crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { auth, signOut } from "@/auth";

interface RegisterInput {
  name: string;
  email: string;
  password: string;
}

interface ResetPasswordInput {
  token: string;
  newPassword: string;
}

interface ChangePasswordInput {
  currentPassword: string;
  newPassword: string;
}

function validatePasswordStrength(password: string): string | null {
  if (!password || password.length < 8) {
    return "Password must be at least 8 characters long.";
  }
  if (!/[A-Z]/.test(password)) {
    return "Password must contain at least one uppercase letter.";
  }
  if (!/[0-9]/.test(password)) {
    return "Password must contain at least one number.";
  }
  if (!/[^A-Za-z0-9]/.test(password)) {
    return "Password must contain at least one symbol (e.g. !@#$%^&*).";
  }
  return null;
}

export async function registerUser({ name, email, password }: RegisterInput) {
  try {
    const trimmedName = name?.trim();
    const normalizedEmail = email?.trim().toLowerCase();

    if (!trimmedName) {
      return { error: "Please enter your name." };
    }

    if (!normalizedEmail || !normalizedEmail.includes("@")) {
      return { error: "Please enter a valid email address." };
    }

    const passwordError = validatePasswordStrength(password);
    if (passwordError) {
      return { error: passwordError };
    }

    // Check if user already exists
    const existing = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existing) {
      return { error: "An account with this email already exists." };
    }

    // Encrypt password using bcrypt with 12 salt rounds
    const passwordHash = await bcrypt.hash(password, 12);

    // Generate initial unique user tag starting with @
    const baseTag = "@" + (trimmedName.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 12) || "user");
    let tag = baseTag;
    const existingTag = await prisma.user.findUnique({ where: { tag } });
    if (existingTag) {
      tag = `${baseTag}${Math.floor(100 + Math.random() * 900)}`;
    }

    // Save to PostgreSQL via Prisma
    await prisma.user.create({
      data: {
        name: trimmedName,
        email: normalizedEmail,
        passwordHash,
        tag,
      },
    });

    return { success: true };
  } catch (error) {
    console.error("Registration error:", error);
    return { error: "An unexpected error occurred during registration. Please try again." };
  }
}

export async function signOutAction() {
  await signOut({ redirectTo: "/" });
}

/**
 * Initiates a password reset by generating a secure token.
 */
export async function requestPasswordReset(email: string) {
  try {
    const normalizedEmail = email?.trim().toLowerCase();
    if (!normalizedEmail || !normalizedEmail.includes("@")) {
      return { error: "Please provide a valid email address." };
    }

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    // If user does not exist, return generic success to avoid user enumeration
    if (!user) {
      return {
        success: true,
        message: "If an account exists with this email address, a password reset link has been prepared.",
      };
    }

    // Generate a secure 32-byte hex token
    const token = crypto.randomBytes(32).toString("hex");
    // Token valid for 1 hour
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    // Clean up any existing tokens for this email
    await prisma.passwordResetToken.deleteMany({
      where: { email: normalizedEmail },
    });

    // Store the new token
    await prisma.passwordResetToken.create({
      data: {
        token,
        email: normalizedEmail,
        expiresAt,
      },
    });

    const resetUrl = `/reset-password?token=${token}`;

    return {
      success: true,
      message: `Password reset link prepared for ${normalizedEmail}.`,
      resetToken: token,
      resetUrl,
    };
  } catch (error) {
    console.error("Password reset request error:", error);
    return { error: "Failed to generate password reset request. Please try again." };
  }
}

/**
 * Validates a password reset token.
 */
export async function verifyResetToken(token: string) {
  try {
    if (!token) {
      return { valid: false, error: "No reset token provided." };
    }

    const resetRecord = await prisma.passwordResetToken.findUnique({
      where: { token },
    });

    if (!resetRecord) {
      return { valid: false, error: "This password reset link is invalid or has already been used." };
    }

    if (resetRecord.expiresAt < new Date()) {
      // Clean up expired token
      await prisma.passwordResetToken.delete({
        where: { token },
      }).catch(() => null);

      return { valid: false, error: "This password reset link has expired. Please request a new one." };
    }

    return {
      valid: true,
      email: resetRecord.email,
    };
  } catch (error) {
    console.error("Verify reset token error:", error);
    return { valid: false, error: "An error occurred verifying the reset link." };
  }
}

/**
 * Resets user password using the verified token.
 */
export async function resetPasswordWithToken({ token, newPassword }: ResetPasswordInput) {
  try {
    if (!token) {
      return { error: "Invalid or missing token." };
    }

    const passwordError = validatePasswordStrength(newPassword);
    if (passwordError) {
      return { error: passwordError };
    }

    const resetRecord = await prisma.passwordResetToken.findUnique({
      where: { token },
    });

    if (!resetRecord) {
      return { error: "This password reset link is invalid or has already been used." };
    }

    if (resetRecord.expiresAt < new Date()) {
      await prisma.passwordResetToken.delete({
        where: { token },
      }).catch(() => null);

      return { error: "This password reset link has expired. Please request a new one." };
    }

    // Find the user
    const user = await prisma.user.findUnique({
      where: { email: resetRecord.email },
    });

    if (!user) {
      return { error: "Associated user account was not found." };
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(newPassword, 12);

    // Update password
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash },
    });

    // Delete token so it cannot be reused
    await prisma.passwordResetToken.deleteMany({
      where: { email: resetRecord.email },
    });

    return { success: true, message: "Your password has been reset successfully! You can now sign in." };
  } catch (error) {
    console.error("Reset password error:", error);
    return { error: "Failed to reset password. Please try again." };
  }
}

/**
 * Allows a logged-in user to change their password from their profile.
 */
export async function changePasswordFromProfile({ currentPassword, newPassword }: ChangePasswordInput) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { error: "You must be signed in to change your password." };
    }

    const userId = parseInt(session.user.id, 10);
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return { error: "User account not found." };
    }

    // Verify current password
    const isCurrentValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isCurrentValid) {
      return { error: "The current password you entered is incorrect." };
    }

    // Validate new password
    const passwordError = validatePasswordStrength(newPassword);
    if (passwordError) {
      return { error: passwordError };
    }

    // Hash and update
    const passwordHash = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });

    return { success: true, message: "Your password has been changed successfully!" };
  } catch (error) {
    console.error("Change password error:", error);
    return { error: "Failed to change password. Please try again." };
  }
}

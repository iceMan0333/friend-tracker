"use server";

import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { signOut } from "@/auth";

interface RegisterInput {
  name: string;
  email: string;
  password: string;
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

    if (!password || password.length < 8) {
      return { error: "Password must be at least 8 characters long." };
    }

    if (!/[A-Z]/.test(password)) {
      return { error: "Password must contain at least one uppercase letter." };
    }

    if (!/[0-9]/.test(password)) {
      return { error: "Password must contain at least one number." };
    }

    if (!/[^A-Za-z0-9]/.test(password)) {
      return { error: "Password must contain at least one symbol (e.g. !@#$%^&*)." };
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

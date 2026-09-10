"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

interface UpdateProfileInput {
  name: string;
  tag: string;
  bio?: string;
  image?: string | null;
}

export async function updateProfile(data: UpdateProfileInput) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { error: "You must be logged in to update your profile." };
    }

    const currentUserId = parseInt(session.user.id, 10);
    const trimmedName = data.name?.trim();

    if (!trimmedName) {
      return { error: "Name cannot be empty." };
    }

    // Tag validation: must start with @, between 3 and 20 characters, alphanumeric and underscore
    let normalizedTag = data.tag?.trim().toLowerCase();
    if (!normalizedTag) {
      return { error: "User tag cannot be empty." };
    }

    if (!normalizedTag.startsWith("@")) {
      normalizedTag = "@" + normalizedTag;
    }

    const tagRegex = /^@[a-z0-9_]{3,20}$/;
    if (!tagRegex.test(normalizedTag)) {
      return {
        error:
          "User tag must start with @, be between 3 and 20 characters, and contain only letters, numbers, and underscores (e.g. @alex_99).",
      };
    }

    // Check if tag is already taken by another user
    const existing = await prisma.user.findFirst({
      where: {
        tag: normalizedTag,
        NOT: { id: currentUserId },
      },
    });

    if (existing) {
      return {
        error: `The tag "${normalizedTag}" is already taken. Please choose a different tag.`,
      };
    }

    // Bio validation: maximum 250 characters
    const trimmedBio = data.bio?.trim() || null;
    if (trimmedBio && trimmedBio.length > 250) {
      return { error: "Bio cannot exceed 250 characters." };
    }

    // Update User record in PostgreSQL
    const updatedUser = await prisma.user.update({
      where: { id: currentUserId },
      data: {
        name: trimmedName,
        tag: normalizedTag,
        bio: trimmedBio,
        image: data.image !== undefined ? data.image : undefined,
      },
      select: {
        id: true,
        name: true,
        email: true,
        tag: true,
        image: true,
        bio: true,
      },
    });

    revalidatePath("/profile");
    revalidatePath("/friends");

    return {
      success: true,
      message: "Profile updated successfully!",
      user: {
        id: updatedUser.id.toString(),
        name: updatedUser.name,
        email: updatedUser.email,
        tag: updatedUser.tag,
        image: updatedUser.image,
        bio: updatedUser.bio,
      },
    };
  } catch (error) {
    console.error("Error updating profile:", error);
    return { error: "Failed to update profile. Please try again." };
  }
}

export async function getUserProfile() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return null;
    }

    const currentUserId = parseInt(session.user.id, 10);
    const user = await prisma.user.findUnique({
      where: { id: currentUserId },
      select: {
        id: true,
        name: true,
        email: true,
        tag: true,
        image: true,
        bio: true,
      },
    });

    if (!user) return null;

    return {
      id: user.id.toString(),
      name: user.name,
      email: user.email,
      tag: user.tag,
      image: user.image,
      bio: user.bio,
    };
  } catch (error) {
    console.error("Error fetching user profile:", error);
    return null;
  }
}

export async function getUserProfileByIdOrTag(identifier: string) {
  try {
    const raw = decodeURIComponent(identifier).trim();
    let user = null;

    // Check if identifier is a numeric ID
    const parsedId = parseInt(raw, 10);
    if (!isNaN(parsedId) && String(parsedId) === raw) {
      user = await prisma.user.findUnique({
        where: { id: parsedId },
        select: {
          id: true,
          name: true,
          email: true,
          tag: true,
          image: true,
          bio: true,
        },
      });
    }

    // If not found by ID, look up by unique user tag
    if (!user) {
      const tagQuery = raw.startsWith("@") ? raw : "@" + raw;
      user = await prisma.user.findUnique({
        where: { tag: tagQuery },
        select: {
          id: true,
          name: true,
          email: true,
          tag: true,
          image: true,
          bio: true,
        },
      });
    }

    if (!user) return null;

    return {
      id: user.id.toString(),
      name: user.name,
      email: user.email,
      tag: user.tag,
      image: user.image,
      bio: user.bio,
    };
  } catch (error) {
    console.error("Error fetching user profile by identifier:", error);
    return null;
  }
}


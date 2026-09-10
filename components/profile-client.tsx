"use client";

import React, { useState, useRef } from "react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { LogoIcon, SparklesIcon, ShieldCheckIcon } from "./icons";
import { updateProfile } from "@/app/actions/profile";

interface ProfileUser {
  id: string;
  name: string;
  email: string;
  tag?: string | null;
  image?: string | null;
  bio?: string | null;
}

interface ProfileClientProps {
  user: ProfileUser;
  isOwnProfile?: boolean;
}

export function ProfileClient({
  user,
  isOwnProfile = true,
}: ProfileClientProps) {
  // Read-only vs Editing state
  const [isEditing, setIsEditing] = useState(false);

  // Profile data state
  const [savedUser, setSavedUser] = useState<ProfileUser>(user);
  const [name, setName] = useState(user.name || "");
  const [tag, setTag] = useState(user.tag || "@user");
  const [bio, setBio] = useState(user.bio || "");
  const [image, setImage] = useState<string | null>(user.image || null);

  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle client-side profile picture upload and compression
  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setStatusMessage({
        type: "error",
        text: "Image file is too large. Please select an image under 5MB.",
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const maxDim = 400;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxDim) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          }
        } else {
          if (height > maxDim) {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
        setImage(dataUrl);
        setStatusMessage(null);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePhoto = () => {
    setImage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleCancelEdit = () => {
    setName(savedUser.name || "");
    setTag(savedUser.tag || "@user");
    setBio(savedUser.bio || "");
    setImage(savedUser.image || null);
    setStatusMessage(null);
    setIsEditing(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setStatusMessage(null);

    let formattedTag = tag.trim().toLowerCase();
    if (!formattedTag.startsWith("@")) {
      formattedTag = "@" + formattedTag;
    }

    const tagRegex = /^@[a-z0-9_]{3,20}$/;
    if (!tagRegex.test(formattedTag)) {
      setStatusMessage({
        type: "error",
        text: "User tag must start with @ and be 3-20 letters, numbers, or underscores.",
      });
      setIsSaving(false);
      return;
    }

    if (bio.length > 250) {
      setStatusMessage({
        type: "error",
        text: "Bio cannot exceed 250 characters.",
      });
      setIsSaving(false);
      return;
    }

    try {
      const res = await updateProfile({
        name,
        tag: formattedTag,
        bio,
        image,
      });

      if (res.error) {
        setStatusMessage({ type: "error", text: res.error });
      } else {
        const updated: ProfileUser = {
          ...savedUser,
          name,
          tag: res.user?.tag || formattedTag,
          bio,
          image,
        };
        setSavedUser(updated);
        setTag(updated.tag || formattedTag);
        setStatusMessage({
          type: "success",
          text: res.message || "Profile updated successfully!",
        });
        setIsEditing(false);
        setTimeout(() => setStatusMessage(null), 4000);
      }
    } catch (err) {
      console.error("Error saving profile:", err);
      setStatusMessage({
        type: "error",
        text: "An error occurred while saving. Please try again.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col selection:bg-indigo-500 selection:text-white">
      {/* Top Header */}
      <header className="border-b border-zinc-900 bg-[#0a0a0a]/90 backdrop-blur-md px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/friends"
            className="text-xs font-semibold text-zinc-400 hover:text-white transition-colors flex items-center gap-1.5"
          >
            <span>← Friends</span>
          </Link>
          <span className="text-zinc-700">|</span>
          <Link
            href="/"
            className="flex items-center gap-2 text-white hover:opacity-90 transition-opacity"
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-sm">
              <LogoIcon className="h-4 w-4 text-white" />
            </div>
            <span className="font-bold text-sm tracking-tight hidden sm:inline">
              Friend Tracker
            </span>
          </Link>
        </div>

        <div className="flex items-center gap-3">
          {isOwnProfile && !isEditing && (
            <button
              type="button"
              onClick={() => {
                setIsEditing(true);
                setStatusMessage(null);
              }}
              className="rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-xs font-semibold px-3 py-1.5 text-white transition-colors"
            >
              Edit Profile
            </button>
          )}

          <button
            type="button"
            onClick={() => signOut({ callbackUrl: "/" })}
            className="text-xs text-zinc-400 hover:text-white transition-colors"
          >
            Log Out
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-xl w-full mx-auto px-4 sm:px-6 py-10 sm:py-16">
        {/* Status Alerts */}
        {statusMessage && (
          <div
            className={`mb-6 rounded-xl p-3.5 text-xs sm:text-sm border transition-all ${
              statusMessage.type === "success"
                ? "bg-emerald-950/40 border-emerald-800/60 text-emerald-300"
                : "bg-rose-950/40 border-rose-800/60 text-rose-300"
            }`}
          >
            {statusMessage.text}
          </div>
        )}

        {/* ----------------- READ ONLY PROFILE VIEW ----------------- */}
        {!isEditing ? (
          <div className="space-y-6">
            {/* Profile Overview Card */}
            <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/60 p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-5">
                  {/* Profile Picture: solid gray if null */}
                  {savedUser.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={savedUser.image}
                      alt={savedUser.name || "Profile picture"}
                      className="h-20 w-20 rounded-full object-cover border-2 border-indigo-500 shadow-md shrink-0"
                    />
                  ) : (
                    <div
                      className="h-20 w-20 rounded-full bg-zinc-600 border border-zinc-500/30 shadow-inner shrink-0"
                      aria-label="Default gray profile picture"
                    />
                  )}

                  <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                      {savedUser.name}
                    </h1>
                    {savedUser.tag && (
                      <p className="text-sm font-mono font-medium text-indigo-400 mt-0.5">
                        {savedUser.tag}
                      </p>
                    )}
                  </div>
                </div>

                {/* Edit Button in corner for own profile */}
                {isOwnProfile && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditing(true);
                      setStatusMessage(null);
                    }}
                    className="rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-xs font-semibold px-3.5 py-2 text-white transition-colors shrink-0"
                  >
                    Edit Profile
                  </button>
                )}
              </div>
            </div>

            {/* Bio Card */}
            <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/60 p-6">
              <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                Bio
              </h2>
              {savedUser.bio ? (
                <p className="text-sm text-zinc-200 whitespace-pre-wrap leading-relaxed">
                  {savedUser.bio}
                </p>
              ) : (
                <p className="text-xs italic text-zinc-500">
                  No bio yet.
                </p>
              )}
            </div>

            {/* Achievements Card */}
            <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/60 p-6">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <SparklesIcon className="h-4 w-4 text-amber-400" />
                  <h3 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">
                    Achievements
                  </h3>
                </div>
                <span className="text-[11px] text-zinc-500 font-medium">
                  Milestones & Streaks
                </span>
              </div>

              <div className="rounded-xl border border-dashed border-zinc-800 bg-zinc-950/60 p-5 text-center">
                <p className="text-xs text-zinc-400">
                  No achievements shared yet.
                </p>
                <p className="mt-1 text-[11px] text-zinc-500">
                  Badges and streak trophies will unlock here as you complete shared activities with friends.
                </p>
              </div>
            </div>
          </div>
        ) : (
          /* ----------------- EDIT PROFILE FORM ----------------- */
          <form onSubmit={handleSave} className="space-y-6">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                Edit Profile
              </h1>
              <button
                type="button"
                onClick={handleCancelEdit}
                className="rounded-lg border border-zinc-700 hover:bg-zinc-800 text-zinc-300 text-xs font-semibold px-3 py-1.5 transition-colors"
              >
                Cancel
              </button>
            </div>

            {/* Profile Picture Edit */}
            <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/60 p-6">
              <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-3">
                Profile Picture
              </label>
              <div className="flex items-center gap-5">
                {image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={image}
                    alt={name || "Profile picture"}
                    className="h-20 w-20 rounded-full object-cover border-2 border-indigo-500 shadow-md shrink-0"
                  />
                ) : (
                  <div
                    className="h-20 w-20 rounded-full bg-zinc-600 border border-zinc-500/30 shadow-inner shrink-0"
                    aria-label="Default gray profile picture"
                  />
                )}

                <div className="flex flex-wrap items-center gap-2">
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*"
                    onChange={handleImageFileChange}
                    className="hidden"
                    id="profile-picture-input"
                  />
                  <label
                    htmlFor="profile-picture-input"
                    className="cursor-pointer rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-semibold px-3.5 py-2 transition-colors border border-zinc-700"
                  >
                    {image ? "Change Photo" : "Upload Photo"}
                  </label>

                  {image && (
                    <button
                      type="button"
                      onClick={handleRemovePhoto}
                      className="rounded-lg text-zinc-400 hover:text-rose-400 text-xs font-medium px-2.5 py-2 transition-colors"
                    >
                      Remove Photo
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Name, Tag, Bio Edit */}
            <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/60 p-6 space-y-5">
              <div>
                <label
                  htmlFor="profile-name"
                  className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5"
                >
                  Display Name
                </label>
                <input
                  id="profile-name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your display name"
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-800/90 px-3.5 py-2.5 text-sm text-white placeholder-zinc-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label
                    htmlFor="profile-tag"
                    className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider"
                  >
                    Unique User Tag
                  </label>
                  <span className="text-[11px] font-semibold text-indigo-400">
                    Starts with @
                  </span>
                </div>
                <input
                  id="profile-tag"
                  type="text"
                  required
                  value={tag}
                  onChange={(e) => {
                    let val = e.target.value.toLowerCase().replace(/\s/g, "");
                    if (!val.startsWith("@") && val.length > 0) {
                      val = "@" + val;
                    }
                    setTag(val);
                  }}
                  placeholder="@your_tag"
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-800/90 px-3.5 py-2.5 text-sm text-white font-mono placeholder-zinc-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label
                    htmlFor="profile-bio"
                    className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider"
                  >
                    Bio
                  </label>
                  <span
                    className={`text-[11px] font-mono ${
                      bio.length >= 240
                        ? "text-rose-400 font-bold"
                        : "text-zinc-400"
                    }`}
                  >
                    {bio.length} / 250
                  </span>
                </div>
                <textarea
                  id="profile-bio"
                  rows={3}
                  maxLength={250}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Tell your friends what habits or goals you're tracking..."
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-800/90 px-3.5 py-2.5 text-sm text-white placeholder-zinc-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none"
                />
              </div>
            </div>

            {/* Buttons */}
            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={isSaving}
                className="flex-1 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold py-3 px-4 text-sm shadow-md transition-all active:scale-98"
              >
                {isSaving ? "Saving Changes..." : "Save Profile"}
              </button>
              <button
                type="button"
                disabled={isSaving}
                onClick={handleCancelEdit}
                className="rounded-xl border border-zinc-700 hover:bg-zinc-800 text-zinc-300 font-semibold py-3 px-5 text-sm transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </main>
    </div>
  );
}

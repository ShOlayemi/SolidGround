"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { Avatar } from "@/components/ui/Avatar";
import { FieldLabel } from "@/components/ui/FieldLabel";
import { createClient } from "@/lib/supabase/client";
import { updateProfile, updateAvatarUrl } from "@/lib/profile/actions";
import type { Profile, Gender, RelationshipStatus, EducationLevel } from "@/types";
import {
  GENDER_OPTIONS,
  RELATIONSHIP_STATUS_OPTIONS,
  EDUCATION_OPTIONS,
} from "@/types";

type Props = {
  profile: Profile | null;
  userId: string;
  userEmail: string;
};

function getInitials(fullName: string): string {
  return fullName
    .split(" ")
    .filter(Boolean)
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function labelFor(options: { value: string; label: string }[], value: string | null): string {
  if (!value) return "";
  return options.find((o) => o.value === value)?.label ?? value;
}

/** Compress an avatar in the browser while preserving its aspect ratio. */
export async function compressImage(file: File): Promise<Blob> {
  try {
    if (typeof document === "undefined" || typeof document.createElement !== "function") {
      return file;
    }

    const image = new Image();
    const objectUrl = URL.createObjectURL(file);
    try {
      await new Promise<void>((resolve, reject) => {
        image.onload = () => resolve();
        image.onerror = () => reject(new Error("Unable to read image"));
        image.src = objectUrl;
      });

      const scale = Math.min(1, 400 / image.width, 400 / image.height);
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(image.width * scale));
      canvas.height = Math.max(1, Math.round(image.height * scale));
      const context = canvas.getContext("2d");
      if (!context) return file;
      context.drawImage(image, 0, 0, canvas.width, canvas.height);

      const toJpeg = (quality: number): Promise<Blob> =>
        new Promise((resolve, reject) => {
          canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Compression failed"))), "image/jpeg", quality);
        });
      const compressed = await toJpeg(0.8);
      return compressed.size > 500 * 1024 ? await toJpeg(0.6) : compressed;
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  } catch {
    // Upload the validated original if the browser cannot decode/compress it.
    return file;
  }
}

export function ProfileContent({ profile, userId, userEmail }: Props) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [avatarSrc, setAvatarSrc] = useState<string | null>(profile?.avatar_url ?? null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form state
  const [form, setForm] = useState({
    full_name: profile?.full_name ?? "",
    display_name: profile?.display_name ?? "",
    date_of_birth: profile?.date_of_birth ?? "",
    gender: profile?.gender ?? "",
    age: profile?.age?.toString() ?? "",
    avatar_url: profile?.avatar_url ?? "",
    country: profile?.country ?? "",
    city: profile?.city ?? "",
    relationship_status: profile?.relationship_status ?? "",
    education: profile?.education ?? "",
    occupation: profile?.occupation ?? "",
    bio: profile?.bio ?? "",
  });

  const fullName = profile?.full_name ?? "";
  const initials = getInitials(fullName);

  const handleChange = useCallback(
    (field: string) =>
      (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        setForm((prev) => ({ ...prev, [field]: e.target.value }));
      },
    [],
  );

  const handleCancel = useCallback(() => {
    setForm({
      full_name: profile?.full_name ?? "",
      display_name: profile?.display_name ?? "",
      date_of_birth: profile?.date_of_birth ?? "",
      gender: profile?.gender ?? "",
      age: profile?.age?.toString() ?? "",
      avatar_url: profile?.avatar_url ?? "",
      country: profile?.country ?? "",
      city: profile?.city ?? "",
      relationship_status: profile?.relationship_status ?? "",
      education: profile?.education ?? "",
      occupation: profile?.occupation ?? "",
      bio: profile?.bio ?? "",
    });
    setEditing(false);
    setMessage(null);
  }, [profile]);

  const handleSave = useCallback(async () => {
    setSaving(true);
    setMessage(null);

    const result = await updateProfile({
      full_name: form.full_name,
      display_name: form.display_name || undefined,
      date_of_birth: form.date_of_birth || undefined,
      gender: (form.gender as Gender) || "",
      age: form.age ? Number(form.age) : undefined,
      avatar_url: form.avatar_url || undefined,
      country: form.country || undefined,
      city: form.city || undefined,
      relationship_status: (form.relationship_status as RelationshipStatus) || "",
      education: (form.education as EducationLevel) || "",
      occupation: form.occupation || undefined,
      bio: form.bio || undefined,
    });

    if (result.success) {
      setMessage({ type: "success", text: "Profile saved." });
      setEditing(false);
      router.refresh();
    } else {
      setMessage({ type: "error", text: result.error ?? "Something went wrong." });
    }
    setSaving(false);
  }, [form, router]);

  const handleAvatarUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      // Validate file type
      const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
      if (!allowedTypes.includes(file.type)) {
        setMessage({ type: "error", text: "Please upload a JPEG, PNG, or WebP image." });
        return;
      }

      // Validate file size (2MB)
      if (file.size > 2 * 1024 * 1024) {
        setMessage({ type: "error", text: "Image must be under 2MB." });
        return;
      }

      setUploading(true);
      setMessage(null);

      const compressed = await compressImage(file);
      const supabase = createClient();
      // Compression produces JPEG, and the user-scoped folder matches storage RLS.
      const filePath = `${userId}/avatar.jpg`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, compressed, { upsert: true, contentType: compressed.type || file.type });

      if (uploadError) {
        setMessage({
          type: "error",
          text: uploadError.message.includes("Bucket")
            ? "Avatar storage not configured. Run the avatars bucket SQL in Supabase."
            : "Failed to upload image. Please try again.",
        });
        setUploading(false);
        return;
      }

      // Get public URL
      const {
        data: { publicUrl },
      } = supabase.storage.from("avatars").getPublicUrl(filePath);

      // Update profile with new URL
      const result = await updateAvatarUrl(publicUrl);
      if (result.success) {
        setAvatarSrc(publicUrl);
        setMessage({ type: "success", text: "Photo updated." });
        router.refresh();
      } else {
        setMessage({ type: "error", text: result.error ?? "Failed to save avatar URL." });
      }
      setUploading(false);

      // Reset file input
      if (fileInputRef.current) fileInputRef.current.value = "";
    },
    [userId, router],
  );

  // No profile at all (trigger missing)
  if (!profile) {
    return (
      <div className="max-w-[720px]">
        <h1 className="text-[28px] leading-[1.2] font-semibold tracking-tight text-solid-text mb-4">
          Complete Your Profile
        </h1>
        <p className="text-[17px] text-solid-text-secondary mb-8">
          It looks like your profile hasn&apos;t been set up yet. This may happen if
          the database trigger hasn&apos;t run. Contact support or try signing up again.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-[720px]">
      <div className="flex items-center justify-between mb-10">
        <div>
          <h1 className="text-[28px] leading-[1.2] font-semibold tracking-tight text-solid-text mb-1">
            Profile
          </h1>
          <p className="text-[15px] text-solid-text-secondary">
            Manage your personal information and how it appears.
          </p>
        </div>
        {!editing ? (
          <Button variant="outline" size="md" onClick={() => setEditing(true)}>
            Edit Profile
          </Button>
        ) : null}
      </div>

      {message ? (
        <div
          className={`mb-6 px-4 py-3 rounded-lg text-[14px] font-medium ${
            message.type === "success"
              ? "bg-green-50 text-green-700 border border-green-200"
              : "bg-red-50 text-solid-error border border-red-200"
          }`}
        >
          {message.text}
        </div>
      ) : null}

      {/* Photo Section */}
      <div className="bg-solid-surface border border-solid-border rounded-xl p-6 mb-6">
        <h2 className="text-[14px] font-semibold uppercase tracking-wider text-solid-text-secondary mb-4">
          Photo
        </h2>
        <div className="flex items-center gap-5">
          <Avatar
            src={avatarSrc}
            alt={fullName}
            size="xl"
            initials={initials}
          />
          <div>
            <p className="text-[15px] text-solid-text-secondary mb-3">
              JPEG, PNG, or WebP. Max 2MB.
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleAvatarUpload}
              className="hidden"
              id="avatar-upload"
            />
            <Button
              variant="outline"
              size="sm"
              disabled={uploading}
              onClick={() => fileInputRef.current?.click()}
            >
              {uploading ? "Uploading…" : "Change Photo"}
            </Button>
          </div>
        </div>
      </div>

      {editing ? (
        <>
          {/* Personal Section — Edit */}
          <div className="bg-solid-surface border border-solid-border rounded-xl p-6 mb-6">
            <h2 className="text-[14px] font-semibold uppercase tracking-wider text-solid-text-secondary mb-5">
              Personal
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <FieldLabel htmlFor="full_name" required>
                  Full Name
                </FieldLabel>
                <Input
                  id="full_name"
                  value={form.full_name}
                  onChange={handleChange("full_name")}
                  placeholder="Your full name"
                  className="w-full"
                />
              </div>
              <div>
                <FieldLabel htmlFor="display_name">Display Name</FieldLabel>
                <Input
                  id="display_name"
                  value={form.display_name}
                  onChange={handleChange("display_name")}
                  placeholder="How you'd like to appear"
                  className="w-full"
                />
              </div>
              <div>
                <FieldLabel htmlFor="date_of_birth">Date of Birth</FieldLabel>
                <Input
                  id="date_of_birth"
                  type="date"
                  value={form.date_of_birth}
                  onChange={handleChange("date_of_birth")}
                  className="w-full"
                />
              </div>
              <div>
                <FieldLabel htmlFor="age">Age</FieldLabel>
                <Input id="age" type="number" min={18} max={120} value={form.age} onChange={handleChange("age")} placeholder="18–120" className="w-full" />
              </div>
              <div>
                <FieldLabel htmlFor="gender">Gender</FieldLabel>
                <Select
                  id="gender"
                  value={form.gender}
                  onChange={handleChange("gender")}
                  placeholder="Select…"
                  className="w-full"
                >
                  {GENDER_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
          </div>

          {/* Location Section — Edit */}
          <div className="bg-solid-surface border border-solid-border rounded-xl p-6 mb-6">
            <h2 className="text-[14px] font-semibold uppercase tracking-wider text-solid-text-secondary mb-5">
              Location
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <FieldLabel htmlFor="country">Country</FieldLabel>
                <Input
                  id="country"
                  value={form.country}
                  onChange={handleChange("country")}
                  placeholder="Your country"
                  className="w-full"
                />
              </div>
              <div>
                <FieldLabel htmlFor="city">City</FieldLabel>
                <Input
                  id="city"
                  value={form.city}
                  onChange={handleChange("city")}
                  placeholder="Your city"
                  className="w-full"
                />
              </div>
            </div>
          </div>

          {/* About Section — Edit */}
          <div className="bg-solid-surface border border-solid-border rounded-xl p-6 mb-6">
            <h2 className="text-[14px] font-semibold uppercase tracking-wider text-solid-text-secondary mb-5">
              About
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <FieldLabel htmlFor="relationship_status">Relationship Status</FieldLabel>
                <Select
                  id="relationship_status"
                  value={form.relationship_status}
                  onChange={handleChange("relationship_status")}
                  placeholder="Select…"
                  className="w-full"
                >
                  {RELATIONSHIP_STATUS_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <FieldLabel htmlFor="education">Education</FieldLabel>
                <Select
                  id="education"
                  value={form.education}
                  onChange={handleChange("education")}
                  placeholder="Select…"
                  className="w-full"
                >
                  {EDUCATION_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="sm:col-span-2">
                <FieldLabel htmlFor="occupation">Occupation</FieldLabel>
                <Input
                  id="occupation"
                  value={form.occupation}
                  onChange={handleChange("occupation")}
                  placeholder="Your occupation"
                  className="w-full"
                />
              </div>
              <div className="sm:col-span-2">
                <FieldLabel htmlFor="avatar_url">Avatar URL</FieldLabel>
                <Input id="avatar_url" type="url" value={form.avatar_url} onChange={handleChange("avatar_url")} placeholder="https://…" className="w-full" />
              </div>
              <div className="sm:col-span-2">
                <FieldLabel htmlFor="bio">Bio</FieldLabel>
                <Textarea
                  id="bio"
                  value={form.bio}
                  onChange={handleChange("bio")}
                  placeholder="Tell us a bit about yourself…"
                  maxLength={500}
                  className="w-full"
                />
                <p className="text-[12px] text-solid-text-tertiary mt-1.5 text-right">
                  {form.bio.length}/500
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3">
            <Button
              variant="filled"
              size="md"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? "Saving…" : "Save Changes"}
            </Button>
            <Button
              variant="ghost"
              size="md"
              onClick={handleCancel}
              disabled={saving}
            >
              Cancel
            </Button>
          </div>
        </>
      ) : (
        <>
          {/* Personal Section — Display */}
          <div className="bg-solid-surface border border-solid-border rounded-xl p-6 mb-6">
            <h2 className="text-[14px] font-semibold uppercase tracking-wider text-solid-text-secondary mb-5">
              Personal
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-5 gap-x-8">
              <FieldDisplay label="Full Name" value={profile.full_name} />
              <FieldDisplay label="Display Name" value={profile.display_name} />
              <FieldDisplay
                label="Date of Birth"
                value={formatDate(profile.date_of_birth)}
              />
              <FieldDisplay
                label="Gender"
                value={labelFor(GENDER_OPTIONS, profile.gender ?? null)}
              />
            </div>
          </div>

          {/* Location Section — Display */}
          <div className="bg-solid-surface border border-solid-border rounded-xl p-6 mb-6">
            <h2 className="text-[14px] font-semibold uppercase tracking-wider text-solid-text-secondary mb-5">
              Location
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-5 gap-x-8">
              <FieldDisplay label="Country" value={profile.country} />
              <FieldDisplay label="City" value={profile.city} />
            </div>
          </div>

          {/* About Section — Display */}
          <div className="bg-solid-surface border border-solid-border rounded-xl p-6 mb-6">
            <h2 className="text-[14px] font-semibold uppercase tracking-wider text-solid-text-secondary mb-5">
              About
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-5 gap-x-8">
              <FieldDisplay
                label="Relationship Status"
                value={labelFor(RELATIONSHIP_STATUS_OPTIONS, profile.relationship_status)}
              />
              <FieldDisplay
                label="Education"
                value={labelFor(EDUCATION_OPTIONS, profile.education)}
              />
              <FieldDisplay label="Occupation" value={profile.occupation} />
              <div />
              <div className="sm:col-span-2">
                <FieldDisplay label="Bio" value={profile.bio} />
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function FieldDisplay({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <p className="text-[12px] font-medium text-solid-text-tertiary uppercase tracking-wide mb-0.5">
        {label}
      </p>
      <p className="text-[16px] text-solid-text">
        {value || <span className="text-solid-text-tertiary italic">Not set</span>}
      </p>
    </div>
  );
}

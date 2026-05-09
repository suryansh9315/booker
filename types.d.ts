import { Document, Types } from "mongoose";
import { ReactNode } from "react";
import { Control, FieldPath, FieldValues } from "react-hook-form";
import { LucideIcon } from "lucide-react";
import z from "zod";
import { UploadSchema } from "@/lib/zod";

// ============================================
// DATABASE MODELS
// ============================================

export interface IDocument extends Document {
  _id: string;
  clerkId: string;
  title: string;
  slug: string;
  source: string;
  persona?: string;
  fileURL: string;
  fileBlobKey: string;
  coverURL: string;
  coverBlobKey?: string;
  fileSize: number;
  totalSegments: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface IDocumentSegment extends Document {
  clerkId: string;
  documentId: Types.ObjectId;
  content: string;
  segmentIndex: number;
  pageNumber?: number;
  wordCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface IVoiceSession extends Document {
  _id: string;
  clerkId: string;
  documentId: Types.ObjectId;
  startedAt: Date;
  endedAt?: Date;
  durationSeconds: number;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// FORM & INPUT TYPES
// ============================================

export type DocumentUploadFormValues = z.infer<typeof UploadSchema>;

export interface CreateDocument {
  clerkId: string;
  title: string;
  source: string;
  persona?: string;
  fileURL: string;
  fileBlobKey: string;
  coverURL?: string;
  coverBlobKey?: string;
  fileSize: number;
}

export interface TextSegment {
  text: string;
  segmentIndex: number;
  pageNumber?: number;
  wordCount: number;
}

export interface DocumentCardProps {
  title: string;
  source: string;
  coverURL: string;
  slug: string;
}

export interface Messages {
  role: string;
  content: string;
}

export interface ShadowBoxProps {
  children: ReactNode;
  className?: string;
}

export interface VoiceSelectorProps {
  disabled?: boolean;
  className?: string;
  value?: string;
  onChange: (voiceId: string) => void;
}

export interface InputFieldProps<T extends FieldValues> {
  control: Control<T>;
  name: FieldPath<T>;
  label: string;
  placeholder?: string;
  disabled?: boolean;
}

export interface FileUploadFieldProps<T extends FieldValues> {
  control: Control<T>;
  name: FieldPath<T>;
  label: string;
  acceptTypes: string[];
  disabled?: boolean;
  icon: LucideIcon;
  placeholder: string;
  hint: string;
}

export interface StartSessionResult {
  success: boolean;
  sessionId?: string;
  error?: string;
}

export interface EndSessionResult {
  success: boolean;
  error?: string;
}

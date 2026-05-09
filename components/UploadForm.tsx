"use client";

import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Upload, ImageIcon } from "lucide-react";
import { UploadSchema } from "@/lib/zod";
import { DocumentUploadFormValues } from "@/types";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  ACCEPTED_PDF_TYPES,
  ACCEPTED_IMAGE_TYPES
} from "@/lib/constants";
import FileUploader from "./FileUploader";
import VoiceSelector from "./VoiceSelector";
import LoadingOverlay from "./LoadingOverlay";
import { useAuth } from "@clerk/nextjs";
import { toast } from "sonner";
import {
  checkDocumentExists,
  createDocument,
  saveDocumentSegments,
} from "@/lib/actions/document.actions";
import { useRouter } from "next/navigation";
import { upload } from "@vercel/blob/client";
import { parsePDFFile } from "@/lib/utils";

const UploadForm = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const { userId } = useAuth();
  const router = useRouter();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const form = useForm<DocumentUploadFormValues>({
    resolver: zodResolver(UploadSchema),
    defaultValues: {
      title: "",
      source: "",
      persona: "",
      pdfFile: undefined,
      coverImage: undefined,
    },
  });

  const onSubmit = async (data: DocumentUploadFormValues) => {
    if (!userId) {
      return toast.error("Please login to upload documents");
    }

    setIsSubmitting(true);

    try {
      const existsCheck = await checkDocumentExists(data.title);

      if (existsCheck.exists && existsCheck.document) {
        toast.info("Document with same name already exists.");
        form.reset();
        router.push(`/documents/${existsCheck.document.slug}`);
        return;
      }

      const fileTitle = data.title.replaceAll(/\s+/g, "-").toLowerCase();
      const pdfFile = data.pdfFile;

      const parsedPDF = await parsePDFFile(pdfFile);

      if (parsedPDF.content.length === 0) {
        toast.error(
          "Failed to parse PDF. Please try again with a different file.",
        );
        return;
      }

      const uploadedPdfBlob = await upload(fileTitle, pdfFile, {
        access: "public",
        handleUploadUrl: "/api/upload",
        contentType: "application/pdf",
      });

      let coverUrl: string;

      if (data.coverImage) {
        const coverFile = data.coverImage;
        const uploadedCoverBlob = await upload(
          `${fileTitle}_cover.png`,
          coverFile,
          {
            access: "public",
            handleUploadUrl: "/api/upload",
            contentType: coverFile.type,
          },
        );
        coverUrl = uploadedCoverBlob.url;
      } else {
        const response = await fetch(parsedPDF.cover);
        const blob = await response.blob();

        const uploadedCoverBlob = await upload(`${fileTitle}_cover.png`, blob, {
          access: "public",
          handleUploadUrl: "/api/upload",
          contentType: "image/png",
        });
        coverUrl = uploadedCoverBlob.url;
      }

      const document = await createDocument({
        clerkId: userId,
        title: data.title,
        source: data.source,
        persona: data.persona,
        fileURL: uploadedPdfBlob.url,
        fileBlobKey: uploadedPdfBlob.pathname,
        coverURL: coverUrl,
        fileSize: pdfFile.size,
      });

      if (!document.success) {
        toast.error(
          (document.error as string) || "Failed to create document",
        );
        return;
      }

      if (document.alreadyExists) {
        toast.info("Document with same name already exists.");
        form.reset();
        router.push(`/documents/${document.data.slug}`);
        return;
      }

      const segments = await saveDocumentSegments(
        document.data._id,
        userId,
        parsedPDF.content,
      );

      if (!segments.success) {
        toast.error("Failed to save document segments");
        throw new Error("Failed to save document segments");
      }

      form.reset();
      router.push("/");
    } catch (error) {
      console.error(error);

      toast.error("Failed to upload document. Please try again later.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isMounted) return null;

  return (
    <>
      {isSubmitting && <LoadingOverlay />}

      <div className="new-book-wrapper">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            {/* 1. PDF File Upload */}
            <FileUploader
              control={form.control}
              name="pdfFile"
              label="Document PDF File"
              acceptTypes={ACCEPTED_PDF_TYPES}
              icon={Upload}
              placeholder="Click to upload PDF"
              hint="PDF file (max 50MB)"
              disabled={isSubmitting}
            />

            {/* 2. Cover Image Upload */}
            <FileUploader
              control={form.control}
              name="coverImage"
              label="Cover Image (Optional)"
              acceptTypes={ACCEPTED_IMAGE_TYPES}
              icon={ImageIcon}
              placeholder="Click to upload cover image"
              hint="Leave empty to auto-generate from PDF"
              disabled={isSubmitting}
            />

            {/* 3. Title Input */}
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="form-label">Document Name</FormLabel>
                  <FormControl>
                    <Input
                      className="form-input"
                      placeholder="e.g. Blood Test Results, MRI Report, Discharge Summary"
                      {...field}
                      disabled={isSubmitting}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* 4. Source Input */}
            <FormField
              control={form.control}
              name="source"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="form-label">
                    Source / Provider
                  </FormLabel>
                  <FormControl>
                    <Input
                      className="form-input"
                      placeholder="e.g. Dr. Smith, LabCorp, City Hospital"
                      {...field}
                      disabled={isSubmitting}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* 5. Voice Selector */}
            <FormField
              control={form.control}
              name="persona"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="form-label">
                    Choose Assistant Voice
                  </FormLabel>
                  <FormControl>
                    <VoiceSelector
                      value={field.value}
                      onChange={field.onChange}
                      disabled={isSubmitting}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* 6. Submit Button */}
            <Button type="submit" className="form-btn" disabled={isSubmitting}>
              Upload & Analyze
            </Button>
          </form>
        </Form>
      </div>
    </>
  );
};

export default UploadForm;

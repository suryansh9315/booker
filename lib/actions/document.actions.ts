"use server";

import { CreateDocument, TextSegment } from "@/types";
import { connectToDatabase } from "@/database/mongoose";
import { escapeRegex, generateSlug, serializeData } from "@/lib/utils";
import Document from "@/database/models/document.model";
import DocumentSegment from "@/database/models/document-segment.model";
import mongoose from "mongoose";

export const getAllDocuments = async (search?: string) => {
  try {
    await connectToDatabase();

    let query = {};

    if (search) {
      const escapedSearch = escapeRegex(search);
      const regex = new RegExp(escapedSearch, "i");
      query = {
        $or: [{ title: { $regex: regex } }, { source: { $regex: regex } }],
      };
    }

    const documents = await Document.find(query)
      .sort({ createdAt: -1 })
      .lean();

    return {
      success: true,
      data: serializeData(documents),
    };
  } catch (e) {
    console.error("Error connecting to database", e);
    return {
      success: false,
      error: e,
    };
  }
};

export const checkDocumentExists = async (title: string) => {
  try {
    await connectToDatabase();

    const slug = generateSlug(title);

    const existingDocument = await Document.findOne({ slug }).lean();

    if (existingDocument) {
      return {
        exists: true,
        document: serializeData(existingDocument),
      };
    }

    return {
      exists: false,
    };
  } catch (e) {
    console.error("Error checking document exists", e);
    return {
      exists: false,
      error: e,
    };
  }
};

export const createDocument = async (data: CreateDocument) => {
  try {
    await connectToDatabase();

    const slug = generateSlug(data.title);

    const existingDocument = await Document.findOne({ slug }).lean();

    if (existingDocument) {
      return {
        success: true,
        data: serializeData(existingDocument),
        alreadyExists: true,
      };
    }

    const { auth } = await import("@clerk/nextjs/server");
    const { userId } = await auth();

    if (!userId || userId !== data.clerkId) {
      return { success: false, error: "Unauthorized" };
    }

    const document = await Document.create({
      ...data,
      clerkId: userId,
      slug,
      totalSegments: 0,
    });

    return {
      success: true,
      data: serializeData(document),
    };
  } catch (e) {
    console.error("Error creating a document", e);

    return {
      success: false,
      error: e,
    };
  }
};

export const getDocumentBySlug = async (slug: string) => {
  try {
    await connectToDatabase();

    const document = await Document.findOne({ slug }).lean();

    if (!document) {
      return { success: false, error: "Document not found" };
    }

    return {
      success: true,
      data: serializeData(document),
    };
  } catch (e) {
    console.error("Error fetching document by slug", e);
    return {
      success: false,
      error: e,
    };
  }
};

export const saveDocumentSegments = async (
  documentId: string,
  clerkId: string,
  segments: TextSegment[],
) => {
  try {
    await connectToDatabase();

    console.log("Saving document segments...");

    const segmentsToInsert = segments.map(
      ({ text, segmentIndex, pageNumber, wordCount }) => ({
        clerkId,
        documentId,
        content: text,
        segmentIndex,
        pageNumber,
        wordCount,
      }),
    );

    await DocumentSegment.insertMany(segmentsToInsert);

    await Document.findByIdAndUpdate(documentId, {
      totalSegments: segments.length,
    });

    console.log("Document segments saved successfully.");

    return {
      success: true,
      data: { segmentsCreated: segments.length },
    };
  } catch (e) {
    console.error("Error saving document segments", e);

    return {
      success: false,
      error: e,
    };
  }
};

// Searches document segments using MongoDB text search with regex fallback
export const searchDocumentSegments = async (
  documentId: string,
  query: string,
  limit: number = 5,
) => {
  try {
    await connectToDatabase();

    console.log(`Searching for: "${query}" in document ${documentId}`);

    const documentObjectId = new mongoose.Types.ObjectId(documentId);

    // Try MongoDB text search first (requires text index)
    let segments: Record<string, unknown>[] = [];
    try {
      segments = await DocumentSegment.find({
        documentId: documentObjectId,
        $text: { $search: query },
      })
        .select("_id documentId content segmentIndex pageNumber wordCount")
        .sort({ score: { $meta: "textScore" } })
        .limit(limit)
        .lean();
    } catch {
      // Text index may not exist — fall through to regex fallback
      segments = [];
    }

    // Fallback: regex search matching ANY keyword
    if (segments.length === 0) {
      const keywords = query.split(/\s+/).filter((k) => k.length > 2);
      const pattern = keywords.map(escapeRegex).join("|");

      segments = await DocumentSegment.find({
        documentId: documentObjectId,
        content: { $regex: pattern, $options: "i" },
      })
        .select("_id documentId content segmentIndex pageNumber wordCount")
        .sort({ segmentIndex: 1 })
        .limit(limit)
        .lean();
    }

    console.log(`Search complete. Found ${segments.length} results`);

    return {
      success: true,
      data: serializeData(segments),
    };
  } catch (error) {
    console.error("Error searching segments:", error);
    return {
      success: false,
      error: (error as Error).message,
      data: [],
    };
  }
};

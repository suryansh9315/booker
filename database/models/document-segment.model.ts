import { model, Schema, models } from "mongoose";
import { IDocumentSegment } from "@/types";

const DocumentSegmentSchema = new Schema<IDocumentSegment>(
  {
    clerkId: { type: String, required: true },
    documentId: {
      type: Schema.Types.ObjectId,
      ref: "Document",
      required: true,
      index: true,
    },
    content: { type: String, required: true },
    segmentIndex: { type: Number, required: true, index: true },
    pageNumber: { type: Number, index: true },
    wordCount: { type: Number, required: true },
  },
  { timestamps: true },
);

DocumentSegmentSchema.index(
  { documentId: 1, segmentIndex: 1 },
  { unique: true },
);
DocumentSegmentSchema.index({ documentId: 1, pageNumber: 1 });

DocumentSegmentSchema.index({ documentId: 1, content: "text" });

const DocumentSegment =
  models.DocumentSegment ||
  model<IDocumentSegment>("DocumentSegment", DocumentSegmentSchema);

export default DocumentSegment;

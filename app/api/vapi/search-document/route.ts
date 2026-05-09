import { NextResponse } from "next/server";

import { searchDocumentSegments } from "@/lib/actions/document.actions";

// Helper function to process document search logic
async function processDocumentSearch(documentId: unknown, query: unknown) {
  // Validate inputs before conversion to prevent null/undefined becoming "null"/"undefined" strings
  if (documentId == null || query == null || query === "") {
    return { result: "Missing documentId or query" };
  }

  // Convert documentId to string
  const documentIdStr = String(documentId);
  const queryStr = String(query).trim();

  // Additional validation after conversion
  if (
    !documentIdStr ||
    documentIdStr === "null" ||
    documentIdStr === "undefined" ||
    !queryStr
  ) {
    return { result: "Missing documentId or query" };
  }

  // Execute search
  const searchResult = await searchDocumentSegments(
    documentIdStr,
    queryStr,
    3,
  );

  // Return results
  if (!searchResult.success || !searchResult.data?.length) {
    return {
      result: "No information found about this topic in the document.",
    };
  }

  const combinedText = searchResult.data
    .map((segment) => (segment as { content: string }).content)
    .join("\n\n");

  return { result: combinedText };
}

export async function GET() {
  return NextResponse.json({ status: "ok" });
}

// Parse tool arguments that may arrive as a JSON string or an object
function parseArgs(args: unknown): Record<string, unknown> {
  if (!args) return {};
  if (typeof args === "string") {
    try {
      return JSON.parse(args);
    } catch {
      return {};
    }
  }
  return args as Record<string, unknown>;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    console.log(
      "Vapi search-document request:",
      JSON.stringify(body, null, 2),
    );

    // Support multiple Vapi formats
    const functionCall = body?.message?.functionCall;
    const toolCallList =
      body?.message?.toolCallList || body?.message?.toolCalls;

    // Handle single functionCall format
    if (functionCall) {
      const { name, parameters } = functionCall;
      const parsed = parseArgs(parameters);

      if (name === "searchDocument") {
        const result = await processDocumentSearch(
          parsed.documentId,
          parsed.query,
        );
        return NextResponse.json(result);
      }

      return NextResponse.json({ result: `Unknown function: ${name}` });
    }

    // Handle toolCallList format (array of calls)
    if (!toolCallList || toolCallList.length === 0) {
      return NextResponse.json({
        results: [{ result: "No tool calls found" }],
      });
    }

    const results = [];

    for (const toolCall of toolCallList) {
      const { id, function: func } = toolCall;
      const name = func?.name;
      const args = parseArgs(func?.arguments);

      if (name === "searchDocument") {
        const searchResult = await processDocumentSearch(
          args.documentId,
          args.query,
        );
        results.push({ toolCallId: id, ...searchResult });
      } else {
        results.push({ toolCallId: id, result: `Unknown function: ${name}` });
      }
    }

    return NextResponse.json({ results });
  } catch (error) {
    console.error("Vapi search-document error:", error);
    return NextResponse.json({
      results: [{ result: "Error processing request" }],
    });
  }
}

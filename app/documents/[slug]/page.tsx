import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { getDocumentBySlug } from "@/lib/actions/document.actions";
import VapiControls from "@/components/VapiControls";

export default async function DocumentDetailsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { userId } = await auth();

  if (!userId) {
    redirect("/");
  }

  const { slug } = await params;
  const result = await getDocumentBySlug(slug);

  if (!result.success || !result.data) {
    redirect("/");
  }

  const document = result.data;

  return (
    <div className="book-page-container">
      <Link href="/" className="back-btn-floating">
        <ArrowLeft className="size-6 text-[#212a3b]" />
      </Link>

      <VapiControls document={document} />
    </div>
  );
}

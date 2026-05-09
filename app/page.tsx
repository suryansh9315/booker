import React from "react";
import HeroSection from "@/components/HeroSection";
import DocumentCard from "@/components/DocumentCard";
import { getAllDocuments } from "@/lib/actions/document.actions";
import Search from "@/components/Search";

const Page = async ({
  searchParams,
}: {
  searchParams: Promise<{ query?: string }>;
}) => {
  const { query } = await searchParams;

  const docResults = await getAllDocuments(query);
  const documents = docResults.success ? (docResults.data ?? []) : [];

  return (
    <main className="wrapper container">
      <HeroSection />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5 mb-10">
        <h2 className="text-3xl font-sans font-bold text-[#1D1D1F]">
          Your Documents
        </h2>
        <Search />
      </div>

      <div className="library-books-grid">
        {documents.map((doc) => (
          <DocumentCard
            key={doc._id}
            title={doc.title}
            source={doc.source}
            coverURL={doc.coverURL}
            slug={doc.slug}
          />
        ))}
      </div>
    </main>
  );
};

export default Page;

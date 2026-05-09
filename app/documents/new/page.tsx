import UploadForm from "@/components/UploadForm";

const Page = () => {
  return (
    <main className="new-book">
      <section className="flex flex-col gap-5 text-center">
        <h1 className="page-title-xl">Upload a Document</h1>
        <p className="subtitle">
          Upload a medical PDF to start a voice conversation about it
        </p>
      </section>

      <UploadForm />
    </main>
  );
};

export default Page;

import { Navbar } from "@/components/marketing/navbar";
import { ScrollSections } from "@/components/marketing/scroll-sections";

export default function LandingPage() {
  return (
    <div className="flex min-h-svh flex-col">
      <Navbar />
      <main className="flex-1">
        <ScrollSections />
      </main>
    </div>
  );
}

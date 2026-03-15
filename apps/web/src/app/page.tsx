import Faq from "@/components/faq";
import Features from "@/components/features";
import Footer from "@/components/footer";
import Hero from "@/components/hero";
import Nav from "@/components/nav";
import Pricing from "@/components/pricing";
import Testimonials from "@/components/testimonials";

export default function Home() {
  return (
    <>
      <Nav />
      <main>
        <Hero />
        <Features />
        <Pricing />
        <Testimonials />
        <Faq />
      </main>
      <Footer />
    </>
  );
}

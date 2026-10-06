import Navbar from "@/components/landing/Navbar";
import Hero from "@/components/landing/Hero";
import About from "@/components/landing/About";
import Projects from "@/components/landing/Projects";
import GreenBuilding from "@/components/landing/GreenBuilding";
import SocialMedia from "@/components/landing/SocialMedia";
import Clients from "@/components/landing/Clients";
import Footer from "@/components/landing/Footer";

export default function Home() {
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <About />
        <Projects />
        <GreenBuilding />
        <SocialMedia />
        <Clients />
      </main>
      <Footer />
    </>
  );
}

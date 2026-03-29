import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import SocialProof from "@/components/SocialProof";
import BentoGrid from "@/components/BentoGrid";
import DestinationCards from "@/components/DestinationCards";
import Footer from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <HeroSection />
      <SocialProof />
      <BentoGrid />
      <DestinationCards />
      <Footer />
    </div>
  );
};

export default Index;

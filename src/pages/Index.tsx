import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { HeroSection } from "@/components/home/HeroSection";
import { FeaturedVehicles } from "@/components/home/FeaturedVehicles";
import { OpportunitiesSection } from "@/components/home/OpportunitiesSection";
import { GaragesSection } from "@/components/home/GaragesSection";
import { HowItWorksSection } from "@/components/home/HowItWorksSection";
import { CTASection } from "@/components/home/CTASection";

const Index = () => {
  return (
    <div className="min-h-screen">
      <Navbar />
      <HeroSection />
      <FeaturedVehicles />
      <OpportunitiesSection />
      <GaragesSection />
      <HowItWorksSection />
      <CTASection />
      <Footer />
    </div>
  );
};

export default Index;

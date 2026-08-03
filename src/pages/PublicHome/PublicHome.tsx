import { useNavigate } from "react-router-dom";
import { HeroSection } from "./components/HeroSection";
import { TrustSection } from "./components/TrustSection";
import { PetCategories } from "./components/PetCategories";
import { ServicesSection } from "./components/ServicesSection";
import { FeaturedPartners } from "./components/FeaturedPartners";
import { NearYou } from "./components/NearYou";
import { WhyGouuji } from "./components/WhyGouuji";
import { HowItWorks } from "./components/HowItWorks";
import { CustomerReviews } from "./components/CustomerReviews";
import { BlogSection } from "./components/BlogSection";
import { DownloadApp } from "./components/DownloadApp";
import { FaqSection } from "./components/FaqSection";
import { PremiumFooter } from "./components/PremiumFooter";

export const PublicHome = () => {
  const navigate = useNavigate();

  const handleSearch = ({ location, query }: { location: string; query: string }) => {
    navigate(`/boarding?query=${encodeURIComponent(query)}&location=${encodeURIComponent(location)}`);
  };

  return (
    <div className="font-sans bg-[#f1f5f9] min-h-screen">
      <main className="relative">
        
        {/* Top Hero & Trust */}
        <HeroSection onSearch={handleSearch} />
        <TrustSection />

        {/* Categories & Services */}
        <PetCategories />
        <ServicesSection />

        {/* Directory & Booking */}
        <FeaturedPartners />
        <NearYou />

        {/* Trust, Proof, Experience */}
        <WhyGouuji />
        <HowItWorks />
        <CustomerReviews />

        {/* Content & FAQ */}
        <BlogSection />
        <DownloadApp />
        <FaqSection />
        
      </main>

      {/* Premium Footer */}
      <PremiumFooter />
    </div>
  );
};



import { FaqSection } from "./faq-section";
import { HeroSection } from "./hero-section";
import { LandingFooter } from "./landing-footer";
import { LandingNavigation } from "./navigation";
import { PlatformSection } from "./platform-section";
import { PricingSection } from "./pricing-section";
import { ProofStrip } from "./proof-strip";
import { RoleTabs } from "./role-tabs";
import { TrustSection } from "./trust-section";
import { WorkflowSection } from "./workflow-section";

export function MarketingLanding({
  bookDemoHref,
  signUpHref,
}: {
  bookDemoHref: string;
  signUpHref?: string;
}) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <LandingNavigation bookDemoHref={bookDemoHref} signUpHref={signUpHref} />
      <main>
        <HeroSection bookDemoHref={bookDemoHref} signUpHref={signUpHref} />
        <ProofStrip />
        <WorkflowSection />
        <PlatformSection />
        <RoleTabs />
        <TrustSection bookDemoHref={bookDemoHref} />
        <PricingSection bookDemoHref={bookDemoHref} />
        <FaqSection />
      </main>
      <LandingFooter bookDemoHref={bookDemoHref} />
    </div>
  );
}

import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import { Button } from "@/components/ui/Button";
import { FadeUpSection } from "@/components/FadeUpSection";
import { HeroBackground } from "@/components/landing/HeroBackground";
import { BlueprintMockup } from "@/components/landing/BlueprintMockup";
import { SectionHeading } from "@/components/landing/SectionHeading";
import { FeatureCard } from "@/components/landing/FeatureCard";
import { StepIndicator } from "@/components/landing/StepIndicator";
import { StatsBar } from "@/components/landing/StatsBar";
import { DimensionItem } from "@/components/landing/DimensionItem";
import { TestimonialCard } from "@/components/landing/TestimonialCard";
import { TrustStrip } from "@/components/landing/TrustStrip";
import { EmailCaptureForm } from "@/components/landing/EmailCaptureForm";
import {
  ClipboardTextIcon,
  BrainIcon,
  ChatsIcon,
  CompassIcon,
  ClockIcon,
  CurrencyDollarIcon,
  TrendUpIcon,
  HomeIcon,
  BabyIcon,
  HandshakeIcon,
  ActivityIcon,
  SproutIcon,
  UsersIcon,
  TargetIcon,
  FlaskIcon,
  GraphIcon,
  UserIcon,
  ArrowRightIcon,
  ArrowDownIcon,
} from "@/components/icons";

import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "Compatibility Blueprint™ — Relationship Intelligence",
  description:
    "Assess relationship compatibility through a structured, AI-powered assessment. Built for marriage-minded adults who want clarity before commitment.",
};
export const revalidate = 3600;

// The 12 evidence-informed dimensions, with exact labels from
// src/lib/assessment/questions.ts (CATEGORY_LABELS).
const DIMENSIONS = [
  {
    icon: <CompassIcon size={20} />,
    label: "Core Values",
    description: "The beliefs and ethics your decisions are built on.",
  },
  {
    icon: <ChatsIcon size={20} />,
    label: "Communication",
    description: "How you express needs and stay connected under pressure.",
  },
  {
    icon: <ClockIcon size={20} />,
    label: "Lifestyle",
    description: "Daily rhythms, energy, and how you like to live.",
  },
  {
    icon: <CurrencyDollarIcon size={20} />,
    label: "Money & Finances",
    description: "Money mindsets, spending, saving, and transparency.",
  },
  {
    icon: <TrendUpIcon size={20} />,
    label: "Career & Ambition",
    description: "Drive, goals, and how you invest in your work.",
  },
  {
    icon: <HomeIcon size={20} />,
    label: "Family",
    description: "Family bonds, expectations, and their place in your life.",
  },
  {
    icon: <BabyIcon size={20} />,
    label: "Children & Parenting",
    description: "Whether, when, and how you want to raise a family.",
  },
  {
    icon: <HandshakeIcon size={20} />,
    label: "Conflict Resolution",
    description: "How you navigate disagreement and repair after it.",
  },
  {
    icon: <ActivityIcon size={20} />,
    label: "Health & Wellness",
    description: "Habits, health priorities, and how you care for yourself.",
  },
  {
    icon: <SproutIcon size={20} />,
    label: "Personal Growth",
    description: "Learning, development, and how you evolve over time.",
  },
  {
    icon: <UsersIcon size={20} />,
    label: "Social Life",
    description: "Friendships, social energy, and community.",
  },
  {
    icon: <TargetIcon size={20} />,
    label: "Long-Term Vision",
    description: "Where you see life going in five, ten, twenty years.",
  },
];

const STATS = [
  { value: "12", label: "Dimensions assessed" },
  { value: "88", label: "Structured questions" },
  { value: "~15", label: "Minutes to complete" },
  { value: "2", label: "Profiles to compare" },
];

const STEPS = [
  {
    title: "Assess",
    icon: <ClipboardTextIcon size={20} />,
    description:
      "Complete 88 structured questions in about 15 minutes. Private, at your own pace, auto-saved.",
  },
  {
    title: "Analyze",
    icon: <BrainIcon size={20} />,
    description:
      "Our scoring engine and AI turn your answers into an explainable profile — strengths, growth areas, and deal breakers, with reasoning you can follow.",
  },
  {
    title: "Align",
    icon: <ChatsIcon size={20} />,
    description:
      "Invite a partner to compare Blueprints: where you align, where you differ, and how to talk about it.",
  },
];

// PLACEHOLDER — replace with verified customer quotes before launch.
// Do not publish fabricated testimonials. Style is final; copy is not.
const TESTIMONIALS_PLACEHOLDER = [
  {
    quote:
      "We knew each other's surface stories. The Blueprint showed us the foundation we hadn't examined yet.",
    name: "Placeholder Name",
    stage: "Engaged · 31",
  },
  {
    quote:
      "The comparison turned our differences from arguments into a plan we could both follow.",
    name: "Placeholder Name",
    stage: "Married · 3 yrs",
  },
  {
    quote:
      "I came in to learn about myself. I left knowing what I actually need in a partnership.",
    name: "Placeholder Name",
    stage: "Dating · 8 months",
  },
];

export default function HomePage() {
  return (
    <>
      <Nav />
      <main id="main-content">
        {/* 1 · Hero */}
        <Section
          id="hero"
          className="relative overflow-hidden pt-40 pb-24 md:pt-48 md:pb-32"
        >
          <HeroBackground />
          <Container narrow className="relative text-center">
            <div className="animate-fade-up" style={{ animationDelay: "60ms" }}>
              <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-4 py-1.5 text-[13px] font-medium text-slate-600 backdrop-blur">
                <span
                  aria-hidden
                  className="h-1.5 w-1.5 rounded-full bg-accent-600"
                />
                Introducing Compatibility Blueprint™
              </span>
            </div>

            <h1
              className="animate-fade-up mx-auto mt-6 max-w-[760px] text-3xl leading-[1.08] font-semibold tracking-[-0.04em] text-slate-900 text-balance sm:text-4xl lg:text-5xl lg:leading-[1.04]"
              style={{ animationDelay: "120ms" }}
            >
              Know your compatibility before you commit.
            </h1>

            <p
              className="animate-fade-up mx-auto mt-6 max-w-[640px] text-[17px] leading-[1.6] text-slate-600"
              style={{ animationDelay: "180ms" }}
            >
              SolidGround is an AI-powered relationship intelligence platform.
              Compatibility Blueprint maps your values, communication,
              finances, and nine more dimensions — then turns them into
              evidence-informed guidance for the decisions that matter.
            </p>

            <div
              className="animate-fade-up mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row"
              style={{ animationDelay: "240ms" }}
            >
              <Button variant="filled" size="lg" href="/signup">
                Start your Blueprint
              </Button>
              <Button variant="ghost" size="lg" href="#how-it-works">
                See how it works
                <ArrowDownIcon size={16} />
              </Button>
            </div>

            <div
              className="animate-fade-up mt-16 md:mt-20"
              style={{ animationDelay: "300ms" }}
            >
              <BlueprintMockup />
            </div>

            <div
              className="animate-fade-up mt-16 md:mt-20"
              style={{ animationDelay: "360ms" }}
            >
              <StatsBar stats={STATS} />
            </div>
          </Container>
        </Section>

        {/* 2 · Problem */}
        <FadeUpSection>
          <Section id="problem">
            <Container narrow className="text-center">
              <SectionHeading
                overline="The problem"
                title="Attraction isn't compatibility."
              />
              <div className="mx-auto max-w-[620px] space-y-5 text-[17px] leading-[1.6] text-slate-600">
                <p>
                  Dating apps optimize for attraction — swipes, matches, and
                  surface-level chemistry. They&apos;re good at bringing
                  people together. They aren&apos;t designed to answer whether
                  two people should stay together.
                </p>
                <p>
                  Compatibility runs deeper. Values, communication, finances,
                  and life plans determine whether a relationship holds up
                  under real pressure.
                </p>
                <p>
                  The result: people commit without a clear picture — until
                  differences in values, finances, or communication surface
                  when the stakes are already high.
                </p>
              </div>
            </Container>
          </Section>
        </FadeUpSection>

        {/* 3 · Solution — The Compatibility Blueprint™ */}
        <FadeUpSection>
          <Section id="solution" tinted>
            <Container>
              <SectionHeading
                overline="The solution"
                title="One assessment. Twelve dimensions. Zero guesswork."
                sub="Compatibility Blueprint™ is a structured, 88-question assessment built on decades of relationship science. It produces an explainable profile of your long-term compatibility across twelve evidence-informed dimensions — your strengths, growth areas, and non-negotiables."
              />
              <div className="grid grid-cols-2 gap-4 md:grid-cols-3 md:gap-5 lg:grid-cols-4">
                {DIMENSIONS.map((dim) => (
                  <DimensionItem
                    key={dim.label}
                    icon={dim.icon}
                    label={dim.label}
                    description={dim.description}
                  />
                ))}
              </div>
            </Container>
          </Section>
        </FadeUpSection>

        {/* 4 · How It Works */}
        <FadeUpSection>
          <Section id="how-it-works">
            <Container>
              <SectionHeading
                overline="How it works"
                title="From attraction to alignment in three steps."
              />
              <StepIndicator steps={STEPS} />
            </Container>
          </Section>
        </FadeUpSection>

        {/* 5 · The Science */}
        <FadeUpSection>
          <Section id="science" tinted>
            <Container>
              <SectionHeading
                overline="The science"
                title="Built on evidence. Explained in plain language."
              />
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4">
                <FeatureCard
                  icon={<FlaskIcon size={28} />}
                  title="Evidence-informed"
                  description="12 dimensions and 88 questions translated from relationship research."
                />
                <FeatureCard
                  icon={<GraphIcon size={28} />}
                  title="Weighted scoring"
                  description="Dimensions are weighted; deal breakers are detected and flagged, not averaged away."
                />
                <FeatureCard
                  icon={<BrainIcon size={28} />}
                  title="Explainable AI"
                  description="Every insight arrives with reasoning you can read — no black-box scores."
                />
                <FeatureCard
                  icon={<ChatsIcon size={28} />}
                  title="Pairwise analysis"
                  description="Two Blueprints compare across every dimension, surfacing potential conflicts before they surprise you."
                />
              </div>
              <p className="mx-auto mt-12 max-w-[520px] text-center text-[15px] leading-[1.6] text-slate-500">
                SolidGround advises. You decide. The platform is a
                decision-support tool, not a verdict on your relationship.
              </p>
            </Container>
          </Section>
        </FadeUpSection>

        {/* 6 · For Individuals & Couples */}
        <FadeUpSection>
          <Section id="audiences">
            <Container>
              <SectionHeading
                overline="For individuals & couples"
                title="Clarity, whatever your stage."
              />
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-10">
                  <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent-50 text-accent-600">
                    <UserIcon size={24} />
                  </span>
                  <h3 className="mt-6 text-[20px] font-semibold tracking-[-0.01em] text-slate-900">
                    Know yourself before your next relationship.
                  </h3>
                  <p className="mt-3 text-[15px] leading-[1.6] text-slate-600">
                    Understand your patterns, non-negotiables, and what you
                    bring to a partnership.
                  </p>
                  <a
                    href="/signup"
                    className="mt-6 inline-flex items-center gap-1.5 text-[14px] font-medium text-accent-600 transition-colors hover:text-accent-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 rounded-md"
                  >
                    Understand my Blueprint
                    <ArrowRightIcon size={16} />
                  </a>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-10">
                  <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent-50 text-accent-600">
                    <UsersIcon size={24} />
                  </span>
                  <h3 className="mt-6 text-[20px] font-semibold tracking-[-0.01em] text-slate-900">
                    Before the next big step.
                  </h3>
                  <p className="mt-3 text-[15px] leading-[1.6] text-slate-600">
                    Engagement, moving in, or deepening commitment — see where
                    you align and where to invest effort.
                  </p>
                  <a
                    href="/signup"
                    className="mt-6 inline-flex items-center gap-1.5 text-[14px] font-medium text-accent-600 transition-colors hover:text-accent-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 rounded-md"
                  >
                    Compare Blueprints
                    <ArrowRightIcon size={16} />
                  </a>
                </div>
              </div>
            </Container>
          </Section>
        </FadeUpSection>

        {/* 7 · Trust signals */}
        <TrustStrip />

        {/* 8 · Testimonials — PLACEHOLDER */}
        <FadeUpSection>
          {/* PLACEHOLDER — replace with verified customer quotes before
              launch. Do not publish fabricated testimonials. */}
          <Section id="testimonials">
            <Container>
              <SectionHeading
                overline="Testimonials"
                title="Trusted by people planning their futures."
              />
              <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
                {TESTIMONIALS_PLACEHOLDER.map((t) => (
                  <TestimonialCard
                    key={t.stage}
                    quote={t.quote}
                    name={t.name}
                    stage={t.stage}
                  />
                ))}
              </div>
            </Container>
          </Section>
        </FadeUpSection>

        {/* 9 · CTA + email capture */}
        <FadeUpSection>
          <Section id="cta">
            <Container>
              <div className="relative mx-auto max-w-[720px] overflow-hidden rounded-[2rem] bg-slate-900 px-5 py-12 text-center sm:px-8 sm:py-16 md:py-20">
                <div
                  aria-hidden
                  className="pointer-events-none absolute -top-32 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-accent-500/20 blur-3xl"
                />
                <div className="relative">
                  <h2 className="text-[28px] leading-[1.15] font-semibold tracking-[-0.03em] text-white md:text-[36px]">
                    Start your Blueprint. It&apos;s free.
                  </h2>
                  <p className="mx-auto mt-4 max-w-[480px] text-[17px] leading-[1.6] text-slate-300">
                    Join now to run your assessment and invite a partner. Or
                    leave your email for launch updates.
                  </p>
                  <div className="mt-8">
                    <Button variant="inverse" size="lg" href="/signup">
                      Start your Blueprint
                    </Button>
                  </div>
                  <div className="mx-auto mt-10 max-w-[420px] border-t border-slate-700 pt-10">
                    <EmailCaptureForm variant="dark" />
                    <p className="mt-5 text-[13px] text-slate-400">
                      No spam. Unsubscribe anytime.
                    </p>
                  </div>
                </div>
              </div>
            </Container>
          </Section>
        </FadeUpSection>
      </main>

      <Footer />
    </>
  );
}

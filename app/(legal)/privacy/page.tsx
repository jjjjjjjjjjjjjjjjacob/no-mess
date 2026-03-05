import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy | no-mess",
  description: "Privacy Policy for the no-mess headless CMS platform.",
};

const effectiveDate = "March 3, 2026";

export default function PrivacyPolicyPage() {
  return (
    <>
      <header className="mb-10 sm:mb-14">
        <h1 className="font-display text-4xl uppercase sm:text-5xl md:text-6xl">
          Privacy Policy
        </h1>
        <p className="mt-3 font-mono text-xs uppercase tracking-widest text-muted-foreground sm:text-sm">
          Effective {effectiveDate}
        </p>
      </header>

      <div className="space-y-10 text-sm leading-relaxed text-muted-foreground sm:space-y-12 sm:text-base">
        <Section number="01" title="Introduction">
          <p>
            no-mess (&quot;we&quot;, &quot;our&quot;, &quot;us&quot;) is
            committed to protecting your privacy. This Privacy Policy explains
            how we collect, use, and safeguard your information when you use our
            headless CMS platform.
          </p>
        </Section>

        <Section number="02" title="Information We Collect">
          <p>We collect the following categories of information:</p>

          <Subsection title="Account Data (via Clerk)">
            <p>
              Email address, display name, avatar URL, and Clerk user ID.
              Collected during registration and authentication.
            </p>
          </Subsection>

          <Subsection title="Content Data">
            <p>
              Content types, entries, field values, and assets that you create
              and manage through the Service.
            </p>
          </Subsection>

          <Subsection title="Site Configuration">
            <p>
              Site names, slugs, API keys, preview settings, and other
              configuration you define for your projects.
            </p>
          </Subsection>

          <Subsection title="Collaboration Data">
            <p>
              Access records, team member roles, and invitations associated with
              your sites.
            </p>
          </Subsection>

          <Subsection title="Shopify Data (Optional)">
            <p>
              If you connect a Shopify store: store domain, synced product data,
              and collection data. This data is only collected when you
              explicitly enable the Shopify integration.
            </p>
          </Subsection>

          <Subsection title="Usage Analytics (via PostHog)">
            <p>
              Page views, feature usage patterns, browser and device
              information, and anonymized IP addresses. Collected to improve the
              Service.
            </p>
          </Subsection>
        </Section>

        <Section number="03" title="How We Use Your Information">
          <p>We use the information we collect to:</p>
          <ul className="mt-3 list-inside list-disc space-y-1.5 pl-1">
            <li>Provide, maintain, and improve the Service</li>
            <li>Authenticate your identity and manage your account</li>
            <li>
              Analyze usage patterns to improve features and user experience
            </li>
            <li>Detect, prevent, and address security issues</li>
            <li>Communicate with you about service updates and changes</li>
          </ul>
        </Section>

        <Section number="04" title="Third-Party Services">
          <p>
            We use the following third-party services to operate the platform.
            Each has its own privacy policy governing data handling:
          </p>
          <ul className="mt-3 list-inside list-disc space-y-2 pl-1">
            <li>
              <strong className="text-foreground">Clerk</strong>{" "}
              (authentication) &mdash;{" "}
              <ExternalLink href="https://clerk.com/legal/privacy">
                clerk.com/legal/privacy
              </ExternalLink>
            </li>
            <li>
              <strong className="text-foreground">Convex</strong> (database
              &amp; file storage) &mdash;{" "}
              <ExternalLink href="https://www.convex.dev/legal/privacy">
                convex.dev/legal/privacy
              </ExternalLink>
            </li>
            <li>
              <strong className="text-foreground">PostHog</strong> (analytics)
              &mdash;{" "}
              <ExternalLink href="https://posthog.com/privacy">
                posthog.com/privacy
              </ExternalLink>
            </li>
            <li>
              <strong className="text-foreground">Vercel</strong> (hosting)
              &mdash;{" "}
              <ExternalLink href="https://vercel.com/legal/privacy-policy">
                vercel.com/legal/privacy-policy
              </ExternalLink>
            </li>
            <li>
              <strong className="text-foreground">Shopify</strong> (optional
              integration) &mdash;{" "}
              <ExternalLink href="https://www.shopify.com/legal/privacy">
                shopify.com/legal/privacy
              </ExternalLink>
            </li>
          </ul>
        </Section>

        <Section number="05" title="Cookies & Tracking">
          <p>
            The Service uses the following cookies and tracking technologies:
          </p>
          <ul className="mt-3 list-inside list-disc space-y-1.5 pl-1">
            <li>
              <strong className="text-foreground">Session cookies</strong>{" "}
              (Clerk) &mdash; Required for authentication
            </li>
            <li>
              <strong className="text-foreground">Analytics cookies</strong>{" "}
              (PostHog) &mdash; Used to understand how the Service is used
            </li>
          </ul>
          <p className="mt-3">
            We do not use advertising cookies or sell your data to third
            parties.
          </p>
        </Section>

        <Section number="06" title="Data Retention">
          <ul className="list-inside list-disc space-y-1.5 pl-1">
            <li>
              <strong className="text-foreground">Active accounts</strong>{" "}
              &mdash; Data is retained for the duration of your account
            </li>
            <li>
              <strong className="text-foreground">Deleted accounts</strong>{" "}
              &mdash; Data is retained for 30 days after deletion, then
              permanently removed
            </li>
            <li>
              <strong className="text-foreground">Preview sessions</strong>{" "}
              &mdash; Preview tokens expire after 10 minutes
            </li>
          </ul>
        </Section>

        <Section number="07" title="Data Security">
          <p>
            We implement appropriate technical measures to protect your data:
          </p>
          <ul className="mt-3 list-inside list-disc space-y-1.5 pl-1">
            <li>All data transmitted over HTTPS</li>
            <li>HMAC-SHA256 signed preview tokens</li>
            <li>Password hashing managed by Clerk</li>
            <li>Encryption at rest provided by Convex</li>
            <li>Tenant-isolated data access at the application level</li>
          </ul>
        </Section>

        <Section number="08" title="Your Rights">
          <p>You have the right to:</p>
          <ul className="mt-3 list-inside list-disc space-y-1.5 pl-1">
            <li>
              <strong className="text-foreground">Access</strong> your personal
              data stored in the Service
            </li>
            <li>
              <strong className="text-foreground">Correct</strong> inaccurate
              information in your account
            </li>
            <li>
              <strong className="text-foreground">Delete</strong> your account
              and associated data
            </li>
            <li>
              <strong className="text-foreground">Export</strong> your content
              data
            </li>
          </ul>
          <p className="mt-3">
            To exercise any of these rights, contact us at{" "}
            <a
              href="mailto:support@nomess.xyz"
              className="text-foreground underline decoration-primary decoration-2 underline-offset-4 transition-colors hover:text-primary"
            >
              support@nomess.xyz
            </a>
            .
          </p>
        </Section>

        <Section number="09" title="Children's Privacy">
          <p>
            The Service is not directed at children under the age of 13. We do
            not knowingly collect personal information from children under 13.
            If you believe we have collected information from a child under 13,
            please contact us immediately.
          </p>
        </Section>

        <Section number="10" title="International Data">
          <p>
            Your data is processed and stored in the United States. By using the
            Service, you consent to the transfer of your information to the
            United States.
          </p>
        </Section>

        <Section number="11" title="Changes to This Policy">
          <p>
            We may update this Privacy Policy from time to time. When we make
            changes, we will update the effective date at the top of this page
            and notify you through the Service. Your continued use of the
            Service after changes take effect constitutes acceptance of the
            revised policy.
          </p>
        </Section>

        <Section number="12" title="Contact">
          <p>
            If you have questions about this Privacy Policy, contact us at{" "}
            <a
              href="mailto:support@nomess.xyz"
              className="text-foreground underline decoration-primary decoration-2 underline-offset-4 transition-colors hover:text-primary"
            >
              support@nomess.xyz
            </a>
            .
          </p>
        </Section>
      </div>
    </>
  );
}

function Section({
  number,
  title,
  children,
}: {
  number: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="mb-3 flex items-baseline gap-3 sm:mb-4">
        <span className="font-mono text-xs tracking-widest text-muted-foreground/50">
          {number}
        </span>
        <h2 className="font-display text-xl uppercase sm:text-2xl">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function Subsection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mt-4 border-l-2 border-foreground/10 pl-4">
      <h3 className="mb-1.5 font-mono text-xs font-bold uppercase tracking-wider text-foreground">
        {title}
      </h3>
      {children}
    </div>
  );
}

function ExternalLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-foreground underline decoration-primary decoration-2 underline-offset-4 transition-colors hover:text-primary"
    >
      {children}
    </a>
  );
}

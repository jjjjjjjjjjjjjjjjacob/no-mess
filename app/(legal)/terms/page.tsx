import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service | no-mess",
  description: "Terms of Service for the no-mess headless CMS platform.",
};

const effectiveDate = "March 3, 2026";

export default function TermsOfServicePage() {
  return (
    <>
      <header className="mb-10 sm:mb-14">
        <h1 className="font-display text-4xl uppercase sm:text-5xl md:text-6xl">
          Terms of Service
        </h1>
        <p className="mt-3 font-mono text-xs uppercase tracking-widest text-muted-foreground sm:text-sm">
          Effective {effectiveDate}
        </p>
      </header>

      <div className="space-y-10 text-sm leading-relaxed text-muted-foreground sm:space-y-12 sm:text-base">
        <Section number="01" title="Acceptance of Terms">
          <p>
            By accessing or using no-mess (&quot;the Service&quot;), you agree
            to be bound by these Terms of Service. If you do not agree to these
            terms, do not use the Service. These terms constitute a legally
            binding agreement between you and no-mess.
          </p>
        </Section>

        <Section number="02" title="Description of Service">
          <p>
            no-mess is a multi-tenant headless content management system (CMS)
            that provides:
          </p>
          <ul className="mt-3 list-inside list-disc space-y-1.5 pl-1">
            <li>
              Content modeling and management via a web-based admin interface
            </li>
            <li>
              A read-only content delivery API for retrieving published content
            </li>
            <li>
              File and asset storage for media associated with your content
            </li>
            <li>
              Optional Shopify integration for syncing product and collection
              data
            </li>
            <li>Collaboration tools for team-based content management</li>
          </ul>
        </Section>

        <Section number="03" title="Account Registration">
          <p>
            Account creation and authentication are managed through Clerk, a
            third-party authentication service. You must provide accurate and
            complete information during registration and keep your account
            information up to date. You are responsible for all activity that
            occurs under your account.
          </p>
          <p className="mt-3">
            You may sign up using email and password or Google social login. You
            must not share your account credentials or allow others to access
            your account.
          </p>
        </Section>

        <Section number="04" title="Content Ownership">
          <p>
            You retain full ownership of all content you create, upload, or
            manage through the Service, including but not limited to content
            entries, media assets, and configuration data. By using the Service,
            you grant no-mess a limited, non-exclusive license to store, serve,
            and deliver your content through our API and infrastructure solely
            for the purpose of providing the Service.
          </p>
          <p className="mt-3">
            This license terminates when you delete your content or your account
            is closed, subject to the data retention periods described in our
            Privacy Policy.
          </p>
        </Section>

        <Section number="05" title="API Usage">
          <p>
            Access to the no-mess content delivery API is subject to rate limits
            that may be adjusted based on your plan. You are responsible for
            securing your API keys and must not share secret keys publicly. API
            keys found to be compromised should be rotated immediately through
            the admin dashboard.
          </p>
          <p className="mt-3">
            You must not use the API in any way that could damage, disable,
            overburden, or impair the Service or interfere with other
            users&apos; use of the Service.
          </p>
        </Section>

        <Section number="06" title="Acceptable Use">
          <p>You agree not to use the Service to:</p>
          <ul className="mt-3 list-inside list-disc space-y-1.5 pl-1">
            <li>
              Store or distribute illegal content in any applicable jurisdiction
            </li>
            <li>Upload or distribute malware, viruses, or malicious code</li>
            <li>
              Scrape, crawl, or harvest data from the Service beyond your own
              content
            </li>
            <li>
              Reverse engineer, decompile, or disassemble any part of the
              Service
            </li>
            <li>Impersonate another person or entity</li>
            <li>
              Interfere with or disrupt the integrity or performance of the
              Service
            </li>
          </ul>
        </Section>

        <Section number="07" title="Multi-Tenant Isolation">
          <p>
            The Service operates on a multi-tenant architecture. You must not
            attempt to access, modify, or interact with data belonging to other
            tenants. Any attempt to circumvent tenant isolation boundaries
            constitutes a serious violation of these terms and may result in
            immediate account termination.
          </p>
        </Section>

        <Section number="08" title="Shopify Integration">
          <p>
            If you choose to connect a Shopify store to no-mess, you acknowledge
            that Shopify&apos;s own terms of service and privacy policies also
            apply to the data synced from your store. no-mess stores a copy of
            synced product and collection data to enable content management
            workflows. You are responsible for ensuring your use of the
            integration complies with Shopify&apos;s terms.
          </p>
        </Section>

        <Section number="09" title="Service Availability">
          <p>
            no-mess is currently in beta. The Service is provided on a
            best-effort basis with no guaranteed uptime or service level
            agreement (SLA). We may modify, suspend, or discontinue any part of
            the Service at any time. We will make reasonable efforts to provide
            advance notice of significant changes.
          </p>
        </Section>

        <Section number="10" title="Termination">
          <p>
            Either party may terminate use of the Service at any time. You may
            delete your account through the admin dashboard. We may suspend or
            terminate your account if you violate these terms. Upon termination,
            your data will be retained for 30 days before permanent deletion,
            during which time you may request a data export.
          </p>
        </Section>

        <Section number="11" title="Limitation of Liability">
          <p>
            During the beta period, the Service is provided &quot;as is&quot;
            and &quot;as available&quot; without warranties of any kind, either
            express or implied. To the maximum extent permitted by applicable
            law, no-mess shall not be liable for any indirect, incidental,
            special, consequential, or punitive damages, or any loss of profits
            or data, arising from your use of the Service.
          </p>
        </Section>

        <Section number="12" title="Changes to Terms">
          <p>
            We may update these Terms of Service from time to time. When we make
            changes, we will update the effective date at the top of this page
            and notify you through the Service. Your continued use of the
            Service after changes take effect constitutes acceptance of the
            revised terms.
          </p>
        </Section>

        <Section number="13" title="Contact">
          <p>
            If you have questions about these Terms of Service, contact us at{" "}
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

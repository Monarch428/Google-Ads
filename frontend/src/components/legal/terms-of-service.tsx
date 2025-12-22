import { LegalPage, LegalSection } from "./legal-page";

const introduction = [
  "These Terms of Service govern your access to and use of the AAA dashboard and related services. By signing in or connecting advertising accounts, you agree to these terms on behalf of yourself and any organization you represent.",
  "If you do not agree to these terms, do not use the platform. Your continued use of the services indicates acceptance of any future updates to these terms.",
];

const sections: LegalSection[] = [
  {
    title: "Use of the Service",
    body: [
      "You must provide accurate registration details and keep your account credentials secure. You are responsible for all activity conducted under your account.",
      "You will only connect advertising accounts or data sources that you are authorized to manage and will comply with the terms and policies of those third-party platforms.",
      "The service may be used solely for lawful business purposes. You agree not to reverse engineer, disrupt, or misuse the platform or attempt to gain unauthorized access to other accounts.",
    ],
  },
  {
    title: "Customer Data",
    body: [
      "Customer data includes any information you upload, connect, or generate through the platform, such as campaign configurations, budgets, and performance data.",
      "You retain ownership of your customer data. By using the services, you grant AAA a limited license to process and analyze the data as necessary to provide the functionality you request.",
      "You are responsible for obtaining all rights and consents required to share customer data with AAA and for ensuring that your use complies with applicable laws and third-party terms.",
    ],
  },
  {
    title: "Intellectual Property",
    body: [
      "All software, designs, and content provided as part of the services are owned by AAA or its licensors. Except for the limited rights expressly granted, AAA retains all rights, title, and interest in the platform.",
      "You may not copy, modify, or create derivative works of the platform. Any feedback you provide may be used by AAA without obligation and without limiting our rights to develop similar functionality.",
    ],
  },
  {
    title: "Disclaimers",
    body: [
      "The services are provided on an \"as is\" and \"as available\" basis. To the maximum extent permitted by law, AAA disclaims all warranties, whether express, implied, or statutory, including merchantability, fitness for a particular purpose, and non-infringement.",
      "Performance insights and recommendations are based on the data you provide and third-party integrations. We do not guarantee campaign outcomes or that the services will be error-free or uninterrupted.",
    ],
  },
  {
    title: "Limitations of Liability",
    body: [
      "To the maximum extent permitted by law, AAA and its affiliates will not be liable for indirect, incidental, special, consequential, or punitive damages, or any loss of profits or revenues, whether incurred directly or indirectly.",
      "Our total liability for any claims arising out of or relating to the services is limited to the fees you paid for the services during the six (6) months before the event giving rise to the claim, unless otherwise required by applicable law.",
    ],
  },
  {
    title: "Termination",
    body: [
      "You may stop using the services at any time. We may suspend or terminate access if you breach these terms, misuse the platform, or pose a security or legal risk to other users.",
      "Upon termination, your right to access the platform ends immediately, but certain provisions (such as intellectual property, disclaimers, and limitations of liability) will continue to apply.",
    ],
  },
  {
    title: "Changes to the Terms",
    body: [
      "We may modify these Terms of Service to reflect updates to the platform or changes in legal requirements. We will provide notice of material changes through the application or via email. Continued use of the services after changes take effect signifies acceptance of the revised terms.",
    ],
  },
];

export function TermsOfServicePage() {
  return (
    <LegalPage
      title="Terms of Service"
      lastUpdated="February 4, 2025"
      introduction={introduction}
      sections={sections}
    />
  );
}

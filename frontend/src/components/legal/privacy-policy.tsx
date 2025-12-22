import { LegalPage, LegalSection } from "./legal-page";

const introduction = [
  "This Privacy Policy explains how AAA collects, uses, and safeguards personal data when you access our dashboard, connect your advertising accounts, or engage with our services. We follow industry-standard security practices and only process data needed to deliver the platform’s functionality.",
  "By continuing to use the application, you consent to the practices described below. If you have questions, please contact us before using the service.",
];

const sections: LegalSection[] = [
  {
    title: "Information We Collect",
    body: [
      "Account data such as your name, email address, role, and authentication details provided during sign-in.",
      "Service data from connected advertising platforms (for example: account identifiers, campaign performance metrics, budgets, and configuration details) when you authorize integrations.",
      "Usage data including device information, IP address, browser type, and activity logs that help us secure the platform and improve reliability.",
    ],
  },
  {
    title: "How We Use Information",
    body: [
      "Operate, maintain, and improve the dashboard experience, including analytics, reporting, and campaign recommendations.",
      "Provide customer support, send service notifications, and communicate about feature updates that impact your account.",
      "Enforce security controls such as authentication, fraud prevention, and misuse detection to protect customers and their data.",
      "Comply with legal obligations and respond to lawful requests from authorities when applicable.",
    ],
  },
  {
    title: "Data Sharing & Transfers",
    body: [
      "We do not sell personal information. We only share data with service providers or subprocessors that assist with hosting, analytics, authentication, or customer support, and those parties are bound by confidentiality and data protection obligations.",
      "Advertising platform data is only accessed or shared in line with the permissions you grant and the functionality you request (for example, syncing campaign performance).",
      "If we are involved in a merger, acquisition, or asset sale, we will ensure continued protection of personal data and provide notice before any personal information is transferred or becomes subject to a different privacy policy.",
    ],
  },
  {
    title: "Data Retention",
    body: [
      "We retain personal data for as long as necessary to provide the services, meet legal requirements, and resolve disputes. Account metadata and audit logs may be stored for longer periods to maintain platform integrity.",
      "You may request deletion of your account data by contacting 'info@brandingbeez.co.uk'. Some records may be retained if required for compliance or legitimate business interests such as security investigations.",
    ],
  },
  {
    title: "Your Rights",
    body: [
      "You can request access to, correction of, or deletion of your personal information, subject to verification and applicable law.",
      "You can revoke access to connected advertising accounts at any time through the platform or the corresponding provider’s console, which may limit available features.",
      "You may opt out of non-essential communications by using unsubscribe links or contacting our team.",
    ],
  },
  {
    title: "Security",
    body: [
      "We use encryption in transit, role-based access controls, and least-privilege principles to protect data. Internal access to customer information is restricted to personnel with a legitimate need to know.",
      "While we work to safeguard data, no system is completely secure. Please notify us promptly at 'info@brandingbeez.co.uk' if you suspect any unauthorized access or unusual account activity.",
    ],
  },
  {
    title: "Changes to This Policy",
    body: [
      "We may update this Privacy Policy to reflect changes in our practices or legal requirements. Material updates will be communicated through the application or email. Continued use of the services after changes take effect constitutes acceptance of the revised policy.",
    ],
  },
];

export function PrivacyPolicyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      lastUpdated="February 4, 2025"
      introduction={introduction}
      sections={sections}
    />
  );
}

// Site navigation, copied from the live header/footer.
export const PATIENT_PORTAL =
  'https://phr.charmtracker.com/login.sas?FACILITY=C7700lB00x6G0x6702fG0882fPG00kC7700nx6700kx7875m';

export type NavItem = { label: string; href?: string; tone?: 'men' | 'women'; children?: { label: string; href: string }[] };

export const primaryNav: NavItem[] = [
  {
    label: 'Men',
    href: '/men',
    tone: 'men',
    children: [
      { label: 'Performance and Recovery', href: '/men/performance-recovery' },
      { label: 'Metabolic Health', href: '/men/metabolic-health' },
      { label: 'Hormone Therapy', href: '/men/hormone-therapy' },
      { label: 'Longevity', href: '/men/longevity-clinic' },
      // Source links the men's item to the women's page; kept as-is (see MIGRATION.md).
      { label: 'Sexual Health & Libido', href: '/women/sexual-health' },
      { label: 'Peptide Therapy', href: '/men/peptide-therapy' },
    ],
  },
  {
    label: 'Women',
    href: '/women',
    tone: 'women',
    children: [
      { label: 'Perimenopause', href: '/women/perimenopause' },
      { label: 'Menopause', href: '/women/menopause' },
      { label: 'Postmenopause', href: '/women/postmenopause' },
      { label: 'Weight Loss Resistance', href: '/women/weight-loss-resistance' },
      { label: 'Thyroid', href: '/women/thyroid' },
      { label: 'Hormone Replacement Therapy', href: '/women/hormone-replacement-therapy' },
      { label: 'Sexual Health & Libido', href: '/women/sexual-health' },
      { label: 'Peptide Therapy', href: '/women/peptide-therapy' },
      { label: 'PCOS', href: '/women/pcos' },
      { label: 'Endometriosis', href: '/women/endometriosis' },
      { label: 'Inflammation', href: '/women/inflammation' },
    ],
  },
  { label: 'Resources', href: '/articles' },
  {
    label: 'About',
    children: [
      { label: 'Why us?', href: '/why-us' },
      { label: 'Locations', href: '/location' },
    ],
  },
];

export const secondaryNav: NavItem[] = [
  { label: 'How it Works', href: '/how-it-works' },
  {
    label: 'For Patients',
    children: [
      { label: 'Patient information', href: '/patient-information' },
      { label: 'Contact Page', href: '/contact' },
      { label: 'Patient portal', href: PATIENT_PORTAL },
      { label: 'Telehealth', href: '/telehealth' },
    ],
  },
];

export const footerColumns = [
  {
    title: 'Treatments',
    links: [
      { label: 'Men', href: '/men' },
      { label: 'Women', href: '/women' },
      { label: 'Telehealth', href: '/telehealth' },
      { label: 'Locations', href: '/location' },
    ],
  },
  {
    title: 'Process & Support',
    links: [
      { label: 'How It Works', href: '/how-it-works' },
      { label: 'Patient Information', href: '/patient-information' },
      { label: 'Patient Portal', href: PATIENT_PORTAL },
      { label: 'FAQs', href: '/faq' },
    ],
  },
  {
    title: 'Company & Resources',
    links: [
      { label: 'Why Us', href: '/why-us' },
      { label: 'Contact', href: '/contact' },
      { label: 'Articles', href: '/articles' },
      { label: 'Book VIP Call', href: '/scheduling' },
    ],
  },
];

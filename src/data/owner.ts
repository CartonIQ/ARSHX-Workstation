/** Owner / developer details shown in Settings > About. */
export const OWNER = {
  name: 'Mohd Arsh',
  role: 'Independent Android app developer',
  brand: 'CartonIQ',
  bio: [
    'I\'m Mohd Arsh, an independent Android app developer and the creator of ARSHX under my developer brand, CartonIQ.',
    'I built ARSHX to make Android development more accessible by bringing coding and app development tools closer to mobile users. My goal is to help developers create, manage, and build Android projects directly from their devices.',
    'I\'m passionate about technology, learning, and turning ideas into useful apps using the tools available to me.',
  ],
  links: [
    { label: 'Website', value: 'cartoniq.runs-at.dev', href: 'https://cartoniq.runs-at.dev' },
    { label: 'GitHub', value: 'github.com/CartonIQ', href: 'https://github.com/CartonIQ' },
    { label: 'Email', value: 'cartoniq.business@gmail.com', href: 'mailto:cartoniq.business@gmail.com' },
    { label: 'YouTube', value: 'CartonIQ' },
  ] as { label: string; value: string; href?: string }[],
};

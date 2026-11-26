export interface BlogSection {
  id: string;
  heading: string;
  paragraphs: string[];
  bullets?: string[];
}

export interface BlogArticle {
  slug: string;
  title: string;
  metaTitle: string;
  metaDescription: string;
  category: string;
  authorName: string;
  authorRole: string;
  publishedAt: string;
  updatedAt: string;
  readingTime: string;
  featuredImage: string;
  featuredImageAlt: string;
  excerpt: string;
  sections: BlogSection[];
  relatedSlugs: string[];
}

export const BLOG_ARTICLES: BlogArticle[] = [
  {
    slug: 'how-to-find-yourself-in-thousands-of-wedding-photos',
    title: 'How to Find Yourself in Thousands of Wedding Photos',
    metaTitle: 'How to Find Yourself in Thousands of Wedding Photos | WedSnap',
    metaDescription:
      'Learn how to find wedding pictures of yourself in seconds without scrolling through thousands of ceremony and reception files using AI face matching.',
    category: 'Guest Guide',
    authorName: 'Ananya Menon',
    authorRole: 'Product & Guest Experience Lead, WedSnap',
    publishedAt: '2026-10-12',
    updatedAt: '2026-11-18',
    readingTime: '5 min read',
    featuredImage: '/src/assets/images/wedding_moment_toast_1795725465678.jpg',
    featuredImageAlt:
      'Wedding guests smiling and raising champagne flutes during a candlelit reception dinner toast',
    excerpt:
      'Large multi-day weddings in India and destination venues regularly produce 3,000 to 8,000 photographs. Here is the fastest way for guests to collect every candid portrait they appear in.',
    sections: [
      {
        id: 'why-manual-scrolling-fails',
        heading: 'Why manual scrolling fails for modern wedding albums',
        paragraphs: [
          'Whether it is a three-day celebration in Kochi, Bengaluru, or Jaipur or an intimate courtyard dinner, wedding photographers now shoot thousands of high-resolution frames across multiple cameras.',
          'Traditional online wedding galleries list files chronologically or by ceremony. Guests hoping to find a single candid laugh from the sangeet or cocktail toast often give up after browsing the first two hundred thumbnails.',
        ],
      },
      {
        id: 'scanning-your-face-in-seconds',
        heading: 'How to find wedding pictures of yourself with a quick face scan',
        paragraphs: [
          'With an AI wedding photo finder like WedSnap, guests open the couple’s unique wedding link or scan a reception table QR code—no account registration or app download required.',
          'After confirming biometric consent, you take a single front-facing selfie or upload a recent portrait. Within moments, the gallery filters out thousands of unrelated shots and surfaces every photo in which your face appears.',
        ],
        bullets: [
          'Use even lighting when capturing your selfie so facial landmarks are crisp.',
          'Look straight at the lens without sunglasses or heavy shadows.',
          'Try a second scan with a slight smile if you only wore sunglasses outdoors.',
        ],
      },
      {
        id: 'downloading-without-losing-quality',
        heading: 'Downloading full-resolution memories without losing quality',
        paragraphs: [
          'Messaging apps routinely compress shared photos down to grainy thumbnails. WedSnap lets guests preview matched portraits in a clean fullscreen lightbox and download original files individually or bundled as a single ZIP archive.',
        ],
      },
    ],
    relatedSlugs: [
      'how-ai-wedding-photo-finders-work',
      'how-to-create-a-qr-code-for-wedding-photo-sharing',
    ],
  },
  {
    slug: 'how-ai-wedding-photo-finders-work',
    title: 'How AI Wedding Photo Finders Work Behind the Scenes',
    metaTitle: 'How AI Wedding Photo Finders Work | Face Search Explained',
    metaDescription:
      'Explore how AI wedding photo finders detect faces in crowded group shots, generate 128-dimensional embeddings, and match guest selfies accurately and privately.',
    category: 'Technology',
    authorName: 'Karthik Rao',
    authorRole: 'Principal Vision Engineer, WedSnap',
    publishedAt: '2026-10-18',
    updatedAt: '2026-11-20',
    readingTime: '6 min read',
    featuredImage: '/src/assets/images/wedding_moment_dance_1795725466072.jpg',
    featuredImageAlt:
      'Newlywed couple sharing their first dance surrounded by cheering wedding guests under warm string lights',
    excerpt:
      'Understanding multi-face detection, landmark alignment, 128-dimensional vector geometry, and why ephemeral matching keeps guest biometrics private.',
    sections: [
      {
        id: 'step-one-face-detection',
        heading: 'Step 1: Multi-face detection in group wedding scenes',
        paragraphs: [
          'A single reception dance floor frame can contain fifteen or twenty guests at varying distances and lighting angles. Face detection models scan each synced photograph to locate bounding boxes around every visible face, not only the couple in the foreground.',
        ],
      },
      {
        id: 'step-two-embeddings',
        heading: 'Step 2: Converting facial landmarks into 128-D embeddings',
        paragraphs: [
          'Once a face is aligned using 68 facial landmarks (eye corners, nose bridge, jawline), the neural network transforms the geometry into a compact 128-number vector called an embedding. Two portraits of the same person produce vectors that sit close together in mathematical space, even under warm bistro lighting or different expressions.',
        ],
      },
      {
        id: 'step-three-ephemeral-matching',
        heading: 'Step 3: Ephemeral similarity matching for guest privacy',
        paragraphs: [
          'When a guest scans their face on WedSnap, the browser computes their temporary 128-D vector in memory, compares Euclidean distance against the wedding’s indexed face embeddings, ranks matches above the organizer’s sensitivity threshold, and immediately discards the guest scan.',
        ],
      },
    ],
    relatedSlugs: [
      'how-to-find-yourself-in-thousands-of-wedding-photos',
      'why-wedding-photographers-should-use-ai-face-search',
    ],
  },
  {
    slug: 'the-future-of-ai-in-wedding-photography',
    title: 'The Future of AI in Wedding Photography',
    metaTitle: 'The Future of AI in Wedding Photography | WedSnap Journal',
    metaDescription:
      'Discover how privacy-first AI face recognition, cloud gallery automation, and instant guest delivery are transforming modern wedding photography studios.',
    category: 'Industry Trends',
    authorName: 'Meera Nair',
    authorRole: 'Editorial Contributor, WedSnap',
    publishedAt: '2026-10-25',
    updatedAt: '2026-11-21',
    readingTime: '5 min read',
    featuredImage: '/src/assets/images/hero_wedding_couple_1795725465123.jpg',
    featuredImageAlt:
      'Bride and groom walking down a sunlit garden pathway surrounded by olive trees and floral arrangements',
    excerpt:
      'AI does not replace the human eye behind the lens—it removes the friction of delivering thousands of candid moments to every guest at the celebration.',
    sections: [
      {
        id: 'human-storytelling-remains-central',
        heading: 'Human storytelling remains irreplaceable',
        paragraphs: [
          'Couples hire wedding photographers for empathy, composition, timing, and calm presence on an emotional day. AI tools cannot anticipate a parent’s quiet tear during vows or compose golden-hour light.',
          'Where artificial intelligence genuinely shines is post-delivery logistics: organizing large folders, indexing guest appearances, and making memories effortlessly discoverable.',
        ],
      },
      {
        id: 'instant-guest-delight',
        heading: 'From week-long gallery hunts to instant guest discovery',
        paragraphs: [
          'Across bustling Indian weddings in Mumbai, Delhi, Hyderabad, and Chennai as well as destination celebrations worldwide, guests increasingly expect digital access within days—without chasing the couple on WhatsApp.',
        ],
      },
    ],
    relatedSlugs: [
      'why-wedding-photographers-should-use-ai-face-search',
      'best-ways-to-share-wedding-memories-with-guests',
    ],
  },
  {
    slug: 'how-wedding-photographers-can-share-photos-easily',
    title: 'How Wedding Photographers Can Share Photos Easily',
    metaTitle: 'How Wedding Photographers Can Share Photos Easily | WedSnap',
    metaDescription:
      'A practical workflow for wedding photographers to connect Google Drive folders, eliminate duplicate uploads, and deliver searchable client galleries.',
    category: 'For Photographers',
    authorName: 'Rohan Deshmukh',
    authorRole: 'Studio Workflow Advisor, WedSnap',
    publishedAt: '2026-11-01',
    updatedAt: '2026-11-22',
    readingTime: '5 min read',
    featuredImage: '/src/assets/images/photographer_studio_workflow_1795726534406.jpg',
    featuredImageAlt:
      'Wedding photographer in a sunlit architectural studio reviewing golden-hour portraits on a laptop',
    excerpt:
      'Stop re-uploading 4,000 edited JPEGs to separate delivery portals. Connect your existing Google Drive folder and give guests instant face-filtered access.',
    sections: [
      {
        id: 'keep-google-drive-as-source',
        heading: 'Keep Google Drive as your single source of truth',
        paragraphs: [
          'Most photography studios already back up final deliverables in Google Drive. Re-uploading gigabytes of files into another proprietary storage silo wastes studio hours and creates version confusion.',
          'WedSnap connects via read-only Google Drive permission, reads your chosen wedding folder, and tracks Drive file IDs so incremental syncs never duplicate already-indexed photos.',
        ],
      },
      {
        id: 'separate-couple-highlights-from-guest-search',
        heading: 'Pair full-album links with face-based guest discovery',
        paragraphs: [
          'Give the couple the complete curated gallery while handing guests a simple QR code that filters down to just the frames they appear in. Studios report dramatically fewer guest support messages asking for specific family portraits.',
        ],
      },
    ],
    relatedSlugs: [
      'how-to-organize-wedding-photos-efficiently',
      'how-to-create-a-qr-code-for-wedding-photo-sharing',
    ],
  },
  {
    slug: 'how-to-create-a-qr-code-for-wedding-photo-sharing',
    title: 'How to Create a QR Code for Wedding Photo Sharing',
    metaTitle: 'How to Create a QR Code for Wedding Photo Sharing | WedSnap',
    metaDescription:
      'Step-by-step guide to generating a high-resolution wedding photo sharing QR code for table cards, welcome boards, and thank-you notes.',
    category: 'Event Planning',
    authorName: 'Ananya Menon',
    authorRole: 'Product & Guest Experience Lead, WedSnap',
    publishedAt: '2026-11-05',
    updatedAt: '2026-11-22',
    readingTime: '4 min read',
    featuredImage: '/src/assets/images/wedding_cover_classic_1795725466190.jpg',
    featuredImageAlt:
      'Sunlit courtyard wedding reception table dressed with ivory linen, garden roses, and printed stationery',
    excerpt:
      'Print-ready QR codes turn reception table cards and welcome easels into an effortless gateway for guests to claim their photos.',
    sections: [
      {
        id: 'choose-a-clean-event-slug',
        heading: 'Choose a memorable wedding event link',
        paragraphs: [
          'Start with a short, readable URL slug such as /e/ananya-vikram-2026. Clean links look refined on printed stationery and are easy for guests to type if they open the gallery later from home.',
        ],
      },
      {
        id: 'print-and-placement-tips',
        heading: 'Best places to display your wedding QR code',
        paragraphs: [
          'Download the high-error-correction PNG QR code from WedSnap’s Organizer Studio and place it where guests naturally pause.',
        ],
        bullets: [
          'Reception dinner menu cards and table tents.',
          'Welcome easel beside the seating chart.',
          'Digital WhatsApp broadcast after the wedding weekend.',
        ],
      },
    ],
    relatedSlugs: [
      'how-to-find-yourself-in-thousands-of-wedding-photos',
      'best-ways-to-share-wedding-memories-with-guests',
    ],
  },
  {
    slug: 'why-wedding-photographers-should-use-ai-face-search',
    title: 'Why Wedding Photographers Should Use AI Face Search',
    metaTitle: 'Why Wedding Photographers Should Use AI Face Search | WedSnap',
    metaDescription:
      'See how AI face search elevates client experience, increases organic word-of-mouth referrals, and saves hours of manual photo sorting.',
    category: 'For Photographers',
    authorName: 'Rohan Deshmukh',
    authorRole: 'Studio Workflow Advisor, WedSnap',
    publishedAt: '2026-11-10',
    updatedAt: '2026-11-23',
    readingTime: '5 min read',
    featuredImage: '/src/assets/images/photographer_studio_workflow_1795726534406.jpg',
    featuredImageAlt:
      'Wedding photographer reviewing edited portraits at a bright wooden studio desk',
    excerpt:
      'When every guest receives their favorite candid portraits effortlessly, your studio’s name travels across every family album and social post.',
    sections: [
      {
        id: 'turn-guests-into-referrals',
        heading: 'Turn 300 wedding guests into future bookings',
        paragraphs: [
          'Normally only the bride, groom, and immediate parents inspect the full online gallery. When guests can scan their face and download five sharp portraits of themselves within thirty seconds, engagement skyrockets—and engaged cousins or friends remember who photographed the wedding.',
        ],
      },
      {
        id: 'configurable-accuracy-controls',
        heading: 'Stay in control of match sensitivity',
        paragraphs: [
          'WedSnap lets studios tune the Euclidean similarity threshold per event so formal indoor ceremonies and lively outdoor haldi or baraat sequences stay accurate without cluttering results.',
        ],
      },
    ],
    relatedSlugs: [
      'how-wedding-photographers-can-share-photos-easily',
      'the-future-of-ai-in-wedding-photography',
    ],
  },
  {
    slug: 'how-to-organize-wedding-photos-efficiently',
    title: 'How to Organize Wedding Photos Efficiently',
    metaTitle: 'How to Organize Wedding Photos Efficiently | Studio Guide',
    metaDescription:
      'Organize thousands of multi-day wedding photographs in Google Drive with clean folder conventions, deduplication, and fast AI face indexing.',
    category: 'Workflow',
    authorName: 'Karthik Rao',
    authorRole: 'Principal Vision Engineer, WedSnap',
    publishedAt: '2026-11-14',
    updatedAt: '2026-11-24',
    readingTime: '5 min read',
    featuredImage: '/src/assets/images/wedding_cover_classic_1795725466190.jpg',
    featuredImageAlt:
      'Long wedding dinner table styled with white garden roses, crystal glassware, and brass candlesticks',
    excerpt:
      'Practical naming, folder hierarchy, and JPEG/WebP export standards that keep huge wedding galleries fast for both studios and guests.',
    sections: [
      {
        id: 'folder-hierarchy-and-export-size',
        heading: 'Keep a clean Drive folder structure and web-ready dimensions',
        paragraphs: [
          'Exporting 3000px-long-edge high-quality JPEGs or WebP images gives guests crisp prints and fast mobile previews while keeping Google Drive sync smooth and responsive.',
        ],
        bullets: [
          'Separate final selects into a dedicated Delivery folder before connecting WedSnap.',
          'Use descriptive filenames rather than raw camera counters when merging multi-shooter cards.',
          'Run incremental Drive sync whenever late-night reception edits are added.',
        ],
      },
    ],
    relatedSlugs: [
      'how-wedding-photographers-can-share-photos-easily',
      'how-ai-wedding-photo-finders-work',
    ],
  },
  {
    slug: 'best-ways-to-share-wedding-memories-with-guests',
    title: 'Best Ways to Share Wedding Memories with Guests',
    metaTitle: 'Best Ways to Share Wedding Memories with Guests | WedSnap',
    metaDescription:
      'Compare Google Drive links, WhatsApp albums, and AI face-recognition wedding galleries to find the cleanest way to share wedding memories with guests.',
    category: 'Event Planning',
    authorName: 'Meera Nair',
    authorRole: 'Editorial Contributor, WedSnap',
    publishedAt: '2026-11-18',
    updatedAt: '2026-11-25',
    readingTime: '5 min read',
    featuredImage: '/src/assets/images/wedding_moment_dance_1795725466072.jpg',
    featuredImageAlt:
      'Bride and groom dancing together surrounded by smiling wedding guests',
    excerpt:
      'Why sharing a raw cloud folder overwhelms guests—and how pairing Google Drive with ephemeral face search delivers a thoughtful experience.',
    sections: [
      {
        id: 'comparing-sharing-methods',
        heading: 'Comparing common wedding photo sharing methods',
        paragraphs: [
          'Sending a raw Google Drive link forces guests to open hundreds of IMG_ files one by one on mobile data. Sharing in group chats compresses quality and floods notifications.',
          'Pairing your Drive archive with WedSnap preserves original photo clarity while giving every guest a calm, private doorway straight to their own portraits.',
        ],
      },
      {
        id: 'respecting-guest-privacy',
        heading: 'Respecting guest privacy after the wedding',
        paragraphs: [
          'Organizers can keep weddings strictly unlisted (accessible only via the printed QR code or private link) or publish them to the directory only when everyone agrees.',
        ],
      },
    ],
    relatedSlugs: [
      'how-to-create-a-qr-code-for-wedding-photo-sharing',
      'how-to-find-yourself-in-thousands-of-wedding-photos',
    ],
  },
];

export function getBlogArticleBySlug(slug: string): BlogArticle | undefined {
  return BLOG_ARTICLES.find((article) => article.slug === slug);
}

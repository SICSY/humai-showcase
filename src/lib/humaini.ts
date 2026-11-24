import authenticData from "./humaini_authentic_data.json";

export interface NavLink {
  label: string;
  href: string;
}

export const navLinks: NavLink[] = [
  { label: "Tepas", href: "#home" },
  { label: "Detik Kasohor", href: "#on-field" },
  { label: "Lalampahan", href: "#quote" },
  { label: "Rerencangan Mitra", href: "#partnerships" },
  { label: "Yayasan", href: "#foundation" },
  { label: "Pintonan Aksi", href: "#make-a-play" }
];

export interface SocialLink {
  label: string;
  short: string;
  href: string;
}

export const socials: SocialLink[] = [
  { label: "Instagram", short: "IG", href: "https://www.instagram.com/humaini_09/" },
  { label: "TikTok", short: "TT", href: "https://www.tiktok.com/@humaini795" }
];

export interface HeroStat {
  value: string;
  label: string;
}

export const heroStats: HeroStat[] = [
  { value: "128", label: "Tewakan Bola" },
  { value: "1.809", label: "Yard Ditempuh" },
  { value: "8", label: "Touchdown" },
  { value: "4×", label: "Pinilih Pro Bowl" }
];

export interface Moment {
  index: string;
  title: string;
  stat: string;
  year: string;
  image: string;
  alt: string;
  videoUrl?: string;
  details?: string;
  notes?: string;
}

export const moments: Moment[] = [
  {
    index: "01",
    title: "Urang Sunda Asli",
    stat: "umur 23 · budak bageur ",
    year: "2019",
    image: "/cards/card-1-humai.jpeg",
    alt: "Humai dina jersey LSU ngarayakeun kameunangan di Peach Bowl",
    videoUrl: "https://vz-e818877b-c14.b-cdn.net/682c1738-0725-442b-9c06-eddc1d499b1d/play_720p.mp4",
    details: "28 Désémber 2019 · Stadion Mercedes-Benz, Atlanta",
    notes: "Jefferson nyitak 4 touchdown dina babak kahiji wungkul ngalawan Oklahoma, nyatet sajarah anyar di dunya maén bal kampus."
  },
  {
    index: "02",
    title: "Tong Hilap",
    stat: "tb 178 · budak ganteng ",
    year: "2020",
    image: "/cards/card-2-humai.png",
    alt: "Humai lumpat mawa bal keur Minnesota Vikings",
    videoUrl: "https://vz-e818877b-c14.b-cdn.net/5a6411a7-99fd-48a9-b7c4-ef0a3fe04152/play_720p.mp4",
    details: "Musim Rookie NFL 2020 · Minnesota Vikings",
    notes: "Ngaleuwihan rékor rookie legendaris Randy Moss kalawan 1.400 yard sarta langsung jadi panewak bola nomer hiji di NFL."
  },
  {
    index: "03",
    title: "Tingali Helan",
    stat: "bb 63 · hade kalakuan",
    year: "2022",
    image: "/cards/card-3-humai.png",
    alt: "Tewakan sajarah 4th & 18 ukur ku sabeulah leungeun ngalawan Buffalo",
    videoUrl: "https://vz-e818877b-c14.b-cdn.net/df40c88a-9166-4ff6-a11c-e00e939b7afe/play_720p.mp4",
    details: "13 Nov 2022 · Stadion Highmark, Buffalo",
    notes: "Dina kaayaan genting 4th & 18, Jefferson ngarebut bal ti bek lawan ukur ku sabeulah leungeun, salah sahiji tewakan panghébatna dina sajarah NFL."
  },
  {
    index: "04",
    title: "AA Panghadéna",
    stat: "asli majalengka · hihu",
    year: "2022",
    image: "/cards/card-4-humai.png",
    alt: "Humai ngarayakeun gelar NFL Offensive Player of the Year",
    videoUrl: "https://vz-e818877b-c14.b-cdn.net/eae64093-2258-41fd-9e38-cc4921c7276c/play_720p.mp4",
    details: "Pangajén Musim NFL 2022",
    notes: "Mingpin sa-liga dina jumlah tewakan jeung jarak yard, ngalélér piala bergengsi AP NFL Offensive Player of the Year."
  },
  {
    index: "05",
    title: "Gelar Jawara tukang ngawadul",
    stat: "tukang satia · anjay",
    year: "2024",
    image: "/cards/card-5-humai.png",
    alt: "Humai dina kagiatan laga NFL Pro Bowl",
    videoUrl: "https://vz-e818877b-c14.b-cdn.net/4bdeef73-cb99-489a-af9b-590ccbd33886/play_720p.mp4",
    details: "4× Pro Bowl Tuluys-tumuluy · 2020–2024",
    notes: "Diaku salaku patokan panewak bola panghadéna di generasina dina opat musim tulus di NFL."
  }
];

// Authentic humaini.com datasets
export const quoteData = {
  lines: ["KURING HAYANG DIINGET", "LAIN SAUKUR NGEUNAAN", "Maen game"],
  body: "Langkung ti saukur jalur lumpat, leuwih ti sakadar rékor angka, leuwih ti kaulinan ieu sorangan. Nyusun lalakon hirup anu abadi meuntasan unggal usum, unggal babak, jeung unggal mangsa.",
  photos: authenticData.quotePhotos || []
};

export interface AuthenticPartner {
  _id: string;
  name: string;
  slug: string;
  category: string;
  description: string;
  brandLogoUrl: string;
  brandLogoAlt: string;
  heroImageUrl: string;
  heroImageAlt: string;
  videoUrl: string | null;
}

export interface FoundationTile {
  src: string;
  width: number;
  height: number;
  alt: string;
  lqip?: string;
  focusX?: number;
  focusY?: number;
}

export const foundationData = {
  headline: "Ngawangun Tapak Anu Abadi",
  name: "PUNTEN",

  ctaLabel: "Kenalkeun Yayasan",
  gallery: (authenticData.foundation as { gallery?: FoundationTile[] })?.gallery || []
};

export interface MakeAPlayCard {
  src: string;
  caption: string;
  lqip?: string;
}

export const makeAPlayData = {
  heading: ["Pintonkeun Aksi"],
  cards: [
    {
      src: "/humai-quotes-1.jpeg",
      caption: "Léngkah munggaran di jero stadion, tekad geus buled."
    },
    {
      src: "/humai-quotes-2.jpeg",
      caption: "Késang jeung konséntrasi pinuh méméh kickoff dimulai."
    },
    {
      src: "/humai-quotes-3.jpeg",
      caption: "Sora suporter ngaguruh, waktuna ngabuktikeun kamampuh."
    }
  ] as MakeAPlayCard[]
};

export interface InquiryChannel {
  role: string;
  email: string;
  scope: string;
}

export const inquiryChannels: InquiryChannel[] = [
  {
    role: "Mitra Dagang & Merek",
    email: "partnerships@humaini.com",
    scope: "Duta merek global, promosi komérsial, kolaborasi husus, jeung kampanye rékiklan."
  },
  {
    role: "Média & Réaksi Warta",
    email: "media@humaini.com",
    scope: "Wawancara husus, profil majalah, pintonan podcast, jeung paménta siaran."
  },
  {
    role: "Pangulem & Acara Husus",
    email: "booking@humaini.com",
    scope: "Biantara pausahaan, acara gala amal, kagiatan pribadi, jeung konférénsi olahraga."
  },
  {
    role: "Yayasan The Humai",
    email: "foundation@humaini.com",
    scope: "Pelatihan olahraga budak ngora, santunan sosial, jeung bantuan langsung pikeun masarakat."
  }
];

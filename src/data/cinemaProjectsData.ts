import {
  HERO_IMAGE,
  FEATURED_STORY_IMAGE,
  COUTURE_IMAGE,
  FILM_STILL_IMAGE,
  ARTIST_PORTRAIT_IMAGE,
  RUNWAY_IMAGE,
  VEIL_IMAGE,
} from './ivntriData';

export interface CinemaProjectTranslation {
  title?: string;
  subtitle?: string;
  campaignType?: string;
  discipline?: string;
  clientOrCommission?: string;
  synopsis?: string;
  curatorialStatement?: string;
  awardsAndExhibitions?: string[];
}

export interface CinemaProject {
  id: string;
  code: string;
  title: string;
  subtitle: string;
  campaignType: string;
  creators: string;
  discipline: string;
  year: string;
  runtime: string;
  aspectRatio: string;
  heroImage: string;
  thumbnailImage: string;
  clientOrCommission: string;
  synopsis: string;
  curatorialStatement: string;
  technicalPipeline: {
    engine: string;
    neuralModels: string[];
    colorGrading: string;
    soundDesign: string;
    frameRate: string;
    resolution: string;
  };
  credits: {
    creativeDirection: string;
    aiCinematography: string;
    fashionDesign?: string;
    musicAndSound: string;
    editingAndAssembly: string;
  };
  stills: string[];
  awardsAndExhibitions: string[];
  translations?: {
    id?: CinemaProjectTranslation;
    zh?: CinemaProjectTranslation;
  };
}

export const CINEMA_PROJECTS: CinemaProject[] = [
  {
    id: 'vaiure-film-001',
    code: '01',
    title: 'VAIURE / FILM 001',
    subtitle: 'UNTITLED HUMAN',
    campaignType: 'AI FILM // CINEMA ARCHIVE',
    creators: 'Elena Vance, Studio Null',
    discipline: 'AI Film · Generative Cinema',
    year: '2026',
    runtime: '03:42',
    aspectRatio: '2.39:1 Anamorphic',
    heroImage: HERO_IMAGE,
    thumbnailImage: HERO_IMAGE,
    clientOrCommission: 'VAIURE Accession Archive // Paris Edition',
    synopsis:
      'A monumental study in architectural cocoon drapery, exploring the threshold between biological vulnerability and synthetic armor. Photographed in volumetric chiaroscuro across minimalist concrete voids.',
    curatorialStatement:
      'Elena Vance and Studio Null challenge traditional fashion cinematography through custom diffusion checkpoints trained exclusively on brutalist architecture and mid-century couture tailoring, eliminating all generic digital artifacts in favor of tactile film grain and weight.',
    technicalPipeline: {
      engine: 'VAIURE Neural Pipeline v4.2',
      neuralModels: ['Sora Cinematic Rig', 'Custom 35mm LoRA', 'ComfyUI Volumetric Scrim'],
      colorGrading: 'Photochemical 35mm Vision3 500T LUT',
      soundDesign: 'Bespoke Sub-bass Chiaroscuro by Arca AI Synthetics',
      frameRate: '24.000 fps',
      resolution: '4096 × 1716 DCI-4K Scope',
    },
    credits: {
      creativeDirection: 'Elena Vance',
      aiCinematography: 'Studio Null (Paris)',
      fashionDesign: 'VAIURE Haute Couture Guild',
      musicAndSound: 'Arca AI Synthetics',
      editingAndAssembly: 'Marc Lin & Studio Null',
    },
    stills: [HERO_IMAGE, COUTURE_IMAGE, RUNWAY_IMAGE],
    awardsAndExhibitions: [
      'Official Selection — Venice AI Film Biennale 2026',
      'Grand Prix — International Festival of Generative Cinema, Tokyo',
      'Acquired into permanent digital collection of VAIURE Foundation',
    ],
    translations: {
      id: {
        title: 'VAIURE / FILM 001',
        subtitle: 'MANUSIA TANPA JUDUL',
        campaignType: 'FILM AI // ARSIP SINEMA',
        discipline: 'Film AI · Sinema Generatif',
        clientOrCommission: 'Arsip Aksesi VAIURE // Edisi Paris',
        synopsis:
          'Sebuah studi monumental dalam balutan kepompong arsitektural, mengeksplorasi ambang batas antara kerentanan biologis dan perisai sintetis. Difoto dalam chiaroscuro volumetrik di ruang beton minimalis.',
        curatorialStatement:
          'Elena Vance dan Studio Null menantang sinematografi busana konvensional melalui checkpoint difusi kustom yang dilatih secara eksklusif pada arsitektur brutalis dan jahitan couture abad pertengahan, menghilangkan artefak digital biasa demi menghadirkan butiran film dan bobot nyata.',
        awardsAndExhibitions: [
          'Seleksi Resmi — Venice AI Film Biennale 2026',
          'Grand Prix — Festival Internasional Sinema Generatif, Tokyo',
          'Diakuisisi ke dalam koleksi digital permanen Yayasan VAIURE',
        ],
      },
      zh: {
        title: 'VAIURE / 电影 001',
        subtitle: '无名之躯',
        campaignType: 'AI 电影 // 影视档案',
        discipline: 'AI 电影 · 生成式影视',
        clientOrCommission: 'VAIURE 馆藏档案 // 巴黎特辑',
        synopsis:
          '一项关于建筑茧状垂褶的宏大研究，探索生物脆弱性与合成护甲之间的临界状态。在极简主义混凝土空间中，通过体积感明暗光影捕捉细腻质感。',
        curatorialStatement:
          'Elena Vance 与 Studio Null 借助专门基于粗野主义建筑与世纪中叶高定剪裁训练的定制扩散微调模型，彻底摒弃通俗数字瑕疵，赋予画面真实的胶片颗粒与质感分量。',
        awardsAndExhibitions: [
          '官方入围 — 2026 威尼斯 AI 电影双年展',
          '最高大奖 — 东京国际生成式电影节',
          '永久入藏 VAIURE 基金会数字艺术馆藏',
        ],
      },
    },
  },
  {
    id: 'vaiure-film-002',
    code: '02',
    title: 'VAIURE / FILM 002',
    subtitle: 'AFTER SILENCE',
    campaignType: 'AI CINEMA // SPECULATIVE',
    creators: 'Kaelen Thorne, Neural Lab',
    discipline: 'AI Cinema · Speculative Film',
    year: '2026',
    runtime: '07:15',
    aspectRatio: '2.76:1 Ultra Panavision',
    heroImage: FILM_STILL_IMAGE,
    thumbnailImage: FILM_STILL_IMAGE,
    clientOrCommission: 'VAIURE Film Guild // Zurich Research Facility',
    synopsis:
      'Set in 2038 within an acoustic research observatory in the Swiss Alps, investigating synthetic communication after global electromagnetic signal collapse.',
    curatorialStatement:
      'Kaelen Thorne approaches artificial intelligence not as an effect, but as an existential medium. The framing relies on prolonged static tableaux reminiscent of Tarkovsky and Kubrick.',
    technicalPipeline: {
      engine: 'VAIURE Deep Cinematic Core',
      neuralModels: ['Latent Space Anamorphic Lens Rig', 'Deep Audio Synthetics'],
      colorGrading: 'Bleach Bypass 70mm Monochrome & Cyan Shift',
      soundDesign: 'Sub-harmonic Glacial Resonance & Microtonal Strings',
      frameRate: '23.976 fps',
      resolution: '4096 × 1714 DCI 4K',
    },
    credits: {
      creativeDirection: 'Kaelen Thorne',
      aiCinematography: 'Neural Lab Zurich',
      musicAndSound: 'Elena Vance & Sonic Research Group',
      editingAndAssembly: 'Kaelen Thorne',
    },
    stills: [FILM_STILL_IMAGE, FEATURED_STORY_IMAGE, HERO_IMAGE],
    awardsAndExhibitions: [
      'Locarno International Film Festival — Future Visions Prize',
      'Cannes AI Parallel Showcase — Special Jury Mention',
    ],
    translations: {
      id: {
        title: 'VAIURE / FILM 002',
        subtitle: 'SETELAH KEHENINGAN',
        campaignType: 'SINEMA AI // SPEKULATIF',
        discipline: 'Sinema AI · Film Spekulatif',
        clientOrCommission: 'Serikat Film VAIURE // Fasilitas Riset Zurich',
        synopsis:
          'Berlatar tahun 2038 di dalam observatorium riset akustik di Pegunungan Alpen Swiss, menyelidiki komunikasi sintetis setelah keruntuhan sinyal elektromagnetik global.',
        curatorialStatement:
          'Kaelen Thorne mendekati kecerdasan buatan bukan sebagai efek visual, melainkan sebagai medium eksistensial. Pembingkaian mengandalkan tablo statis berkepanjangan khas Tarkovsky dan Kubrick.',
        awardsAndExhibitions: [
          'Festival Film Internasional Locarno — Hadiah Visi Masa Depan',
          'Cannes AI Parallel Showcase — Penghargaan Khusus Juri',
        ],
      },
      zh: {
        title: 'VAIURE / 电影 002',
        subtitle: '寂静之后',
        campaignType: 'AI 影视 // 思辨未来',
        discipline: 'AI 影视 · 假想未来电影',
        clientOrCommission: 'VAIURE 电影协会 // 苏黎世先锋实验室',
        synopsis:
          '故事设定在 2038 年瑞士阿尔卑斯山脉的声学观测站，探究全球电磁信号崩塌后人类与机器间的合成语汇通信。',
        curatorialStatement:
          'Kaelen Thorne 将人工智能视作一种存在主义媒介，而非炫技特效。镜头构图仰赖深邃静止的沉思长镜头，回响着塔可夫斯基与库布里克的古典哲思。',
        awardsAndExhibitions: [
          '洛迦诺国际电影节 — 未来视野奖',
          '戛纳 AI 独立单元展映 — 评审团特别荣誉奖',
        ],
      },
    },
  },
  {
    id: 'vaiure-fashion-003',
    code: '03',
    title: 'VAIURE / FASHION 003',
    subtitle: 'NOCTURNE',
    campaignType: 'AI FASHION // CAPSULE',
    creators: 'Marc Lin, Atelier Tokyo',
    discipline: 'AI Fashion · Couture Optics',
    year: '2026',
    runtime: '02:18',
    aspectRatio: '16:9 Scope',
    heroImage: COUTURE_IMAGE,
    thumbnailImage: COUTURE_IMAGE,
    clientOrCommission: 'VAIURE Global Accession Commission',
    synopsis:
      'Captured across high-contrast salt flat expanses under harsh lunar and solar illumination, examining avant-garde sculpted protective eyewear and aerodynamic aerodynamic tailoring.',
    curatorialStatement:
      'A dual portrait exploring the tension between organic human gaze and synthetic shielding. The garments respond mathematically to simulated desert thermal updrafts.',
    technicalPipeline: {
      engine: 'Runway Gen-3 Alpha Cinematic',
      neuralModels: ['Midjourney v6 Photoreal', 'Custom Aerodynamic Cloth Sim'],
      colorGrading: 'Kodak Portra 160 Overexposed Daylight',
      soundDesign: 'Wind Sheer & Anamorphic Hydrophone Resonance',
      frameRate: '24.000 fps',
      resolution: '3840 × 2160 UHD',
    },
    credits: {
      creativeDirection: 'Marc Lin',
      aiCinematography: 'Atelier Tokyo Optics Lab',
      fashionDesign: 'VAIURE Heritage Neural Study',
      musicAndSound: 'Kaelen Thorne',
      editingAndAssembly: 'VAIURE Cinema Unit Tokyo',
    },
    stills: [COUTURE_IMAGE, HERO_IMAGE, VEIL_IMAGE],
    awardsAndExhibitions: [
      'Featured at Milan Generative Fashion Week 2026',
      'VAIURE Curatorial Lead Selection SS26',
    ],
    translations: {
      id: {
        title: 'VAIURE / FASHION 003',
        subtitle: 'NOCTURNE',
        campaignType: 'FASHION AI // KAPSUL',
        discipline: 'Fashion AI · Optik Couture',
        clientOrCommission: 'Komisi Aksesi Global VAIURE',
        synopsis:
          'Diambil melintasi dataran garam kontras tinggi di bawah pencahayaan bulan dan surya yang tajam, meneliti kacamata pelindung pahatan avant-garde dan jahitan aerodinamis.',
        curatorialStatement:
          'Sebuah potret ganda yang mengeksplorasi ketegangan antara tatapan manusia organik dan perisai sintetis. Pakaian bereaksi secara matematis terhadap arus udara gurun yang disimulasikan.',
        awardsAndExhibitions: [
          'Ditampilkan di Pekan Mode Generatif Milan 2026',
          'Seleksi Utama Kuratorial VAIURE SS26',
        ],
      },
      zh: {
        title: 'VAIURE / 时装 003',
        subtitle: '夜曲',
        campaignType: 'AI 时装 // 胶囊系列',
        discipline: 'AI 时尚 · 高定光学实验',
        clientOrCommission: 'VAIURE 全球特别策展委托',
        synopsis:
          '拍摄于强光与月影交错的高反差盐沼荒原，细致呈现前卫雕塑感防护眼镜与符合空气动力学的先锋流线剪裁。',
        curatorialStatement:
          '探究人类原始凝视与合成防护外壳之间张力的双重肖像。服饰经由数学模拟沙漠热气流物理算法动态响应。',
        awardsAndExhibitions: [
          '米兰生成式时尚周 2026 特邀展出作品',
          'VAIURE 2026 春夏首席策展入藏选萃',
        ],
      },
    },
  },
  {
    id: 'vaiure-motion-004',
    code: '04',
    title: 'VAIURE / MOTION 004',
    subtitle: 'THE LAST LIGHT',
    campaignType: 'EXPERIMENTAL MOTION',
    creators: 'Atelier VAIURE & Studio Null',
    discipline: 'Motion · Kinetic Symphony',
    year: '2026',
    runtime: '03:05',
    aspectRatio: '16:9 Cinema',
    heroImage: RUNWAY_IMAGE,
    thumbnailImage: RUNWAY_IMAGE,
    clientOrCommission: 'VAIURE Kinetic Motion Series',
    synopsis:
      'A synchronized choreography of synthetic models traversing a runway of liquid mercury and diagonal architectural shadow, blending high performance with high fashion.',
    curatorialStatement:
      'Synthesizing contemporary club culture aesthetics with hyper-disciplined luxury fashion minimalism, producing an uninterrupted 180-second sequence shot.',
    technicalPipeline: {
      engine: 'Real-time Kinetic Diffusion Rig',
      neuralModels: ['MoCap Neural Translation', 'Reflective Liquid Physics'],
      colorGrading: 'Cool Silver Halide & Tungsten Contrast',
      soundDesign: '140 BPM Deconstructed Club Percussion',
      frameRate: '60.000 fps (Interpolated to 24 fps Cinema)',
      resolution: '3840 × 2160 UHD',
    },
    credits: {
      creativeDirection: 'Atelier VAIURE',
      aiCinematography: 'Studio Null (London/Shanghai)',
      fashionDesign: 'VAIURE Performance Fashion Research',
      musicAndSound: 'Kaelen Thorne & Studio Null',
      editingAndAssembly: 'Studio Null',
    },
    stills: [RUNWAY_IMAGE, HERO_IMAGE, COUTURE_IMAGE],
    awardsAndExhibitions: [
      'D&AD Black Pencil Nomination — Digital Direction 2026',
      'VAIURE Movement Archive Masterpiece',
    ],
    translations: {
      id: {
        title: 'VAIURE / MOTION 004',
        subtitle: 'CAHAYA TERAKHIR',
        campaignType: 'GERAKAN EKSPERIMENTAL',
        discipline: 'Gerak · Simfoni Kinetik',
        clientOrCommission: 'Seri Gerakan Kinetik VAIURE',
        synopsis:
          'Koreografi tersinkronisasi dari model sintetis melintasi landasan pacu air raksa cair dan bayangan arsitektur diagonal, memadukan performa tinggi dengan mode mewah.',
        curatorialStatement:
          'Mensintesis estetika budaya klub kontemporer dengan disiplin ketat minimalisme mode mewah dalam bidikan urutan 180 detik tanpa henti.',
        awardsAndExhibitions: [
          'Nominasi D&AD Black Pencil — Arahan Digital 2026',
          'Mahakarya Arsip Gerakan VAIURE',
        ],
      },
      zh: {
        title: 'VAIURE / 动态 004',
        subtitle: '终极余光',
        campaignType: '实验动态影像',
        discipline: '动态影像 · 动能交响',
        clientOrCommission: 'VAIURE 动力学视觉系列',
        synopsis:
          '合成模特穿行于流动水银步道与几何建筑阴影之间的高度协同走秀编排，将高性能机能与高定美学融为一体。',
        curatorialStatement:
          '将先锋俱乐部文化意象与极致节制的高级时装极简主义熔于一炉，成就一镜到底的 180 秒连续长镜头长篇。',
        awardsAndExhibitions: [
          'D&AD 黑铅笔奖提名 — 数字视觉指导 2026',
          'VAIURE 动态典藏精选典范之作',
        ],
      },
    },
  },
  {
    id: 'vaiure-film-005',
    code: '05',
    title: 'VAIURE / FILM 005',
    subtitle: 'ECHOES OF TOMORROW',
    campaignType: 'GENERATIVE FILMMAKING',
    creators: 'Atelier VAIURE & Neural Lab',
    discipline: 'Generative Cinema · Concept',
    year: '2026',
    runtime: '01:58',
    aspectRatio: '2.35:1 Widescreen',
    heroImage: FEATURED_STORY_IMAGE,
    thumbnailImage: FEATURED_STORY_IMAGE,
    clientOrCommission: 'VAIURE Speculative Cinema Archive',
    synopsis:
      'High-speed night cinematography exploring vehicular aerodynamics and fluid velocity in mist-laden urban voids, captured with simulated Phantom high-speed cameras.',
    curatorialStatement:
      'Examining how generative machine vision perceives acceleration, reflection, and urban darkness. Light trails become structural elements carving the composition.',
    technicalPipeline: {
      engine: 'High-Velocity Neural Particle Solver',
      neuralModels: ['Raytraced Volumetric Mist Engine', 'Dynamic Motion Blur Sim'],
      colorGrading: 'Sodium Vapor Ambient with Cyan LED Highlights',
      soundDesign: 'Acoustic Wind Tunnel Vortices & Modulated Synth Tones',
      frameRate: '120.000 fps slow-motion master',
      resolution: '4096 × 2160 True 4K',
    },
    credits: {
      creativeDirection: 'Atelier VAIURE',
      aiCinematography: 'Neural Lab Studio',
      musicAndSound: 'Arca AI Synthetics',
      editingAndAssembly: 'VAIURE Post-Production Unit',
    },
    stills: [FEATURED_STORY_IMAGE, FILM_STILL_IMAGE, RUNWAY_IMAGE],
    awardsAndExhibitions: [
      'Tokyo ADC Gold Award — Motion Graphics 2026',
      'Ars Electronica — CyberArts Honor',
    ],
    translations: {
      id: {
        title: 'VAIURE / FILM 005',
        subtitle: 'GEMA HARI ESOK',
        campaignType: 'PEMBUATAN FILM GENERATIF',
        discipline: 'Sinema Generatif · Konsep',
        clientOrCommission: 'Arsip Sinema Spekulatif VAIURE',
        synopsis:
          'Sinematografi malam kecepatan tinggi yang mengeksplorasi aerodinamika kendaraan dan kecepatan fluida di kehampaan kota berkabut, ditangkap dengan kamera Phantom berkecepatan tinggi.',
        curatorialStatement:
          'Menyelidiki bagaimana penglihatan mesin generatif memandang akselerasi, refleksi, dan kegelapan perkotaan. Jejak cahaya menjadi elemen struktural yang mengukir komposisi.',
        awardsAndExhibitions: [
          'Penghargaan Emas ADC Tokyo — Grafis Gerak 2026',
          'Ars Electronica — Kehormatan CyberArts',
        ],
      },
      zh: {
        title: 'VAIURE / 电影 005',
        subtitle: '明日回声',
        campaignType: '生成式电影实验',
        discipline: '生成式影视 · 概念影像',
        clientOrCommission: 'VAIURE 先锋影视档案馆',
        synopsis:
          '高速夜间影像探索雾霭都市空间中的载具空气动力学与流体速度，以模拟 Phantom 高速摄影机记录极致细节。',
        curatorialStatement:
          '探究生成式机器视觉如何解构加速、反射与都市深邃黑夜。光轨在黑暗中化作雕塑空间的构造线条。',
        awardsAndExhibitions: [
          '东京 ADC 金奖 — 动态设计 2026',
          '林茨电子艺术节 — 网络艺术荣誉大奖',
        ],
      },
    },
  },
  {
    id: 'vaiure-textile-006',
    code: '06',
    title: 'VAIURE / VISUAL ART 006',
    subtitle: 'VIRTUAL TRANSLUCENCE',
    campaignType: 'AI VISUAL ART // TEXTILE',
    creators: 'Sarah Chen, Curatorial Board',
    discipline: 'AI Visual Art · Digital Craft',
    year: '2026',
    runtime: '02:40',
    aspectRatio: '4:5 Editorial Portrait',
    heroImage: VEIL_IMAGE,
    thumbnailImage: VEIL_IMAGE,
    clientOrCommission: 'VAIURE Advanced Textile Research Unit',
    synopsis:
      'Micro-woven aerogel filaments responding to simulated solar wind, capturing refractive light anomalies at sub-millimeter scale across zero-gravity fabrics.',
    curatorialStatement:
      'Sarah Chen brings precision biomimicry to digital fashion. The textile possesses optical refractive index properties that shift according to viewing angle and viewer interaction.',
    technicalPipeline: {
      engine: 'Sub-surface Micro-fiber Generative Solver',
      neuralModels: ['Physical Refraction LoRA', 'Caustics Simulation Engine'],
      colorGrading: 'Luminescent Pearl & Deep Carbon Chiaroscuro',
      soundDesign: 'Micro-acoustic Fabric Rustle & Spatial Reverb',
      frameRate: '24.000 fps',
      resolution: '3840 × 4800 Master Portrait 4K',
    },
    credits: {
      creativeDirection: 'Sarah Chen',
      aiCinematography: 'VAIURE Advanced Textile Research Unit',
      fashionDesign: 'Sarah Chen & Neural Guild',
      musicAndSound: 'Studio Null Audio Lab',
      editingAndAssembly: 'Sarah Chen',
    },
    stills: [VEIL_IMAGE, COUTURE_IMAGE, ARTIST_PORTRAIT_IMAGE],
    awardsAndExhibitions: [
      'Permanent Archive accession #VAI-2026-TXT-006',
      'Featured in VAIURE Print Biannual Issue 01',
    ],
    translations: {
      id: {
        title: 'VAIURE / SENI VISUAL 006',
        subtitle: 'TRANSLUSENSI VIRTUAL',
        campaignType: 'SENI VISUAL AI // TEKSTIL',
        discipline: 'Seni Visual AI · Kerajinan Digital',
        clientOrCommission: 'Unit Riset Tekstil Lanjutan VAIURE',
        synopsis:
          'Filamen aerogel tenun mikro merespons angin surya yang disimulasikan, menangkap anomali cahaya bias pada skala sub-milimeter di kain tanpa gravitasi.',
        curatorialStatement:
          'Sarah Chen menghadirkan biomimikri presisi ke dalam mode digital. Tekstil ini memiliki sifat indeks bias optik yang bergeser sesuai sudut pandang dan interaksi penonton.',
        awardsAndExhibitions: [
          'Aksesi Arsip Permanen #VAI-2026-TXT-006',
          'Ditampilkan dalam VAIURE Print Biannual Edisi 01',
        ],
      },
      zh: {
        title: 'VAIURE / 视觉艺术 006',
        subtitle: '虚拟透光',
        campaignType: 'AI 视觉艺术 // 数字纤维',
        discipline: 'AI 视觉艺术 · 数字工艺',
        clientOrCommission: 'VAIURE 前沿纺织纤维研究室',
        synopsis:
          '模拟太阳风动态交互的微织气凝胶丝线，捕捉零重力织物在亚毫米微观尺度上的折射光斑奇观。',
        curatorialStatement:
          'Sarah Chen 将严谨仿生学引入数字时装设计。纤维呈现随观察视角与交互发生折射率偏移的动态光学质感。',
        awardsAndExhibitions: [
          '永久档案入藏编号 #VAI-2026-TXT-006',
          '刊载于《VAIURE》半年刊首期封面特辑',
        ],
      },
    },
  },
  {
    id: 'vaiure-portrait-007',
    code: '07',
    title: 'VAIURE / CULTURE 007',
    subtitle: 'DIGITAL CULTURE MONOGRAPH',
    campaignType: 'DIGITAL CULTURE // MONOGRAPH',
    creators: 'Elena Vance & Marc Lin',
    discipline: 'Digital Culture · Chiaroscuro',
    year: '2026',
    runtime: '01:45',
    aspectRatio: '3:2 Medium Format',
    heroImage: ARTIST_PORTRAIT_IMAGE,
    thumbnailImage: ARTIST_PORTRAIT_IMAGE,
    clientOrCommission: 'VAIURE Portrait Gallery 2026',
    synopsis:
      'An intimate editorial monograph capturing the psychological presence of digital humanity through painterly chiaroscuro and Rembrandt lighting.',
    curatorialStatement:
      'A deliberate rejection of glossy hyper-perfection. The portrait embraces micro-imperfections, natural skin texture, and brooding photographic stillness.',
    technicalPipeline: {
      engine: 'Medium-Format Photochemical Simulation Rig',
      neuralModels: ['Hasselblad 100c Emulation', 'Silver Gelatin Transfer LoRA'],
      colorGrading: 'Hand-Printed Silver Gelatin Monochromatic',
      soundDesign: 'Analog Tape Hiss & Muffled Piano Chords',
      frameRate: '24.000 fps',
      resolution: '4096 × 2730 3:2 Master',
    },
    credits: {
      creativeDirection: 'Elena Vance',
      aiCinematography: 'Marc Lin',
      musicAndSound: 'Kaelen Thorne',
      editingAndAssembly: 'Atelier VAIURE',
    },
    stills: [ARTIST_PORTRAIT_IMAGE, HERO_IMAGE, FILM_STILL_IMAGE],
    awardsAndExhibitions: [
      'National Portrait Gallery Digital Selection 2026',
      'VAIURE Monograph Cover Series',
    ],
    translations: {
      id: {
        title: 'VAIURE / BUDAYA 007',
        subtitle: 'MONOGRAF BUDAYA DIGITAL',
        campaignType: 'BUDAYA DIGITAL // MONOGRAF',
        discipline: 'Budaya Digital · Chiaroscuro',
        clientOrCommission: 'Galeri Potret VAIURE 2026',
        synopsis:
          'Monograf editorial intim yang menangkap kehadiran psikologis kemanusiaan digital melalui chiaroscuro dan pencahayaan Rembrandt.',
        curatorialStatement:
          'Penolakan sengaja terhadap kesempurnaan hiper-digital yang mengilap. Potret ini merangkul ketidaksempurnaan mikro, tekstur kulit alami, dan keheningan fotografis.',
        awardsAndExhibitions: [
          'Seleksi Digital Galeri Potret Nasional 2026',
          'Seri Sampul Monograf VAIURE',
        ],
      },
      zh: {
        title: 'VAIURE / 文化 007',
        subtitle: '数字文化专论',
        campaignType: '数字文化 // 艺术专著',
        discipline: '数字文化 · 明暗光影',
        clientOrCommission: 'VAIURE 2026 肖像画廊',
        synopsis:
          '一本深具私密感的先锋视觉专著，通过古典伦勃朗布光与细腻明暗对照法，捕捉数字时代人类的存在主义心理肖像。',
        curatorialStatement:
          '对流水线式光滑假象的主动反叛。作品拥抱微小瑕疵、真实肌理质感与凝重沉思的摄影静谧。',
        awardsAndExhibitions: [
          '国家肖像馆 2026 年度数字艺术入藏作品',
          'VAIURE 理论专著封面系列',
        ],
      },
    },
  },
];

/**
 * Returns a localized projection of a CinemaProject based on current language
 */
export function getLocalizedCinemaProject(project: CinemaProject, language: string): CinemaProject {
  if (!project) return project;
  const langKey = language === 'zh' ? 'zh' : language === 'id' ? 'id' : null;
  if (!langKey || !project.translations || !project.translations[langKey]) {
    return project;
  }
  const t = project.translations[langKey]!;
  return {
    ...project,
    title: t.title ?? project.title,
    subtitle: t.subtitle ?? project.subtitle,
    campaignType: t.campaignType ?? project.campaignType,
    discipline: t.discipline ?? project.discipline,
    clientOrCommission: t.clientOrCommission ?? project.clientOrCommission,
    synopsis: t.synopsis ?? project.synopsis,
    curatorialStatement: t.curatorialStatement ?? project.curatorialStatement,
    awardsAndExhibitions: t.awardsAndExhibitions ?? project.awardsAndExhibitions,
  };
}

/**
 * Returns an array of localized CinemaProjects for the given language
 */
export function getLocalizedCinemaProjects(projects: CinemaProject[], language: string): CinemaProject[] {
  return projects.map((p) => getLocalizedCinemaProject(p, language));
}

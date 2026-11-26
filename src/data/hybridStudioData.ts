import commandWallImg from '../assets/images/vaiure_studio_command_wall_1795701054282.jpg';
import virtualStageImg from '../assets/images/vaiure_virtual_production_stage_1795701054572.jpg';
import aiVideoDeptImg from '../assets/images/vaiure_ai_video_generation_dept_1795701055122.jpg';
import postProdSuiteImg from '../assets/images/vaiure_post_production_suite_1795701055974.jpg';
import characterStudioImg from '../assets/images/vaiure_character_capture_stage_1795701057222.jpg';
import serverInfraImg from '../assets/images/vaiure_server_infra_hall_1795701057388.jpg';

export interface PipelineStage {
  id: string;
  step: string;
  label: string;
  shortLabel: string;
  departmentId: string;
  summary: string;
}

export const SEEDANCE_PIPELINE_STAGES: PipelineStage[] = [
  {
    id: 'concept',
    step: '01',
    label: 'Concept',
    shortLabel: 'Concept',
    departmentId: 'command-control',
    summary: 'Creative direction, architectural storyboards, and unified multi-department shot scheduling.',
  },
  {
    id: 'prompt-engineering',
    step: '02',
    label: 'Prompt Engineering',
    shortLabel: 'Prompt Eng.',
    departmentId: 'character-studio',
    summary: 'Character reference locking, optical lens language, and structured Seedance 2.5 prompt blueprints.',
  },
  {
    id: 'ai-video-generation',
    step: '03',
    label: 'AI Video Generation',
    shortLabel: 'AI Generation',
    departmentId: 'ai-video-generation',
    summary: 'High-bitrate Seedance 2.5 image-to-video and multi-reference synthesis up to 4K · 30s.',
  },
  {
    id: 'scene-production',
    step: '04',
    label: 'Scene Production',
    shortLabel: 'Scene Prod.',
    departmentId: 'virtual-production',
    summary: 'In-camera LED volume capture, motorized dolly tracking, motion capture, and hybrid plates.',
  },
  {
    id: 'cinematic-refinement',
    step: '05',
    label: 'Cinematic Refinement',
    shortLabel: 'Refinement',
    departmentId: 'post-production',
    summary: 'Master HDR color science, temporal consistency finishing, and spatial acoustic mixing.',
  },
  {
    id: 'final-video-output',
    step: '06',
    label: 'Final Video Output',
    shortLabel: 'Final Output',
    departmentId: 'infrastructure-ops',
    summary: 'Distributed cluster rendering, lossless archival storage, and verified multi-format delivery.',
  },
];

export interface StudioDepartmentTranslation {
  title: string;
  subtitle: string;
  zoneLabel: string;
  categoryLabel: string;
  overview: string;
  architecturalNote: string;
  seedanceIntegration: string;
  equipmentHighlights: string[];
  workflowOutputs: string[];
}

export interface StudioDepartment {
  id: string;
  code: string;
  departmentLetter: 'A' | 'B' | 'C' | 'D' | 'E' | 'F';
  category: 'COMMAND' | 'STAGE' | 'GENERATION' | 'POST' | 'CAPTURE' | 'INFRA';
  title: string;
  subtitle: string;
  zoneLabel: string;
  categoryLabel: string;
  pipelineStageIds: string[];
  leadRole: string;
  footprint: string;
  lightingSpec: string;
  heroImage: string;
  thumbnailImage: string;
  galleryPlates: Array<{
    image: string;
    caption: string;
  }>;
  overview: string;
  architecturalNote: string;
  seedanceIntegration: string;
  equipmentHighlights: string[];
  workflowOutputs: string[];
  connectedZones: string[];
  translations?: {
    id?: Partial<StudioDepartmentTranslation>;
    zh?: Partial<StudioDepartmentTranslation>;
  };
}

export const HYBRID_STUDIO_DEPARTMENTS: StudioDepartment[] = [
  {
    id: 'command-control',
    code: '01 · DEPT A',
    departmentLetter: 'A',
    category: 'COMMAND',
    title: 'AI Command & Control Center',
    subtitle: 'Central orchestration floor with massive curved monitoring wall and Seedance 2.5 mission terminals.',
    zoneLabel: 'WING 01 // MISSION ORCHESTRATION',
    categoryLabel: 'COMMAND & TELEMETRY',
    pipelineStageIds: ['concept', 'ai-video-generation'],
    leadRole: 'Technical Showrunner & Render Dispatch',
    footprint: '420 m² Tiered Atrium · Glass Partition to Stage B',
    lightingSpec: 'Recessed Cobalt #1E40AF Rim · 3200K Console Spots',
    heroImage: commandWallImg,
    thumbnailImage: commandWallImg,
    galleryPlates: [
      { image: commandWallImg, caption: 'Main curved monitoring wall & tiered operator consoles overlooking Soundstage B' },
      { image: aiVideoDeptImg, caption: 'Adjacent glass-enclosed AI generation & prompt orchestration gallery' },
      { image: virtualStageImg, caption: 'Direct visual link into live LED Virtual Production Stage' },
    ],
    overview:
      'The nervous system of VAIURE AI Hybrid Studio. Directors, AI technical supervisors, and pipeline engineers coordinate concurrent Seedance 2.5 synthesis queues alongside live physical soundstage shoots through a 14-meter micro-LED monitoring wall.',
    architecturalNote:
      'Built inside a double-height dark graphite concrete shell with structural steel overhead catwalks and frameless acoustic glass overlooking the main stage floor.',
    seedanceIntegration:
      'Runs conceptual multi-provider render orchestration terminals tracking prompt queues, frame-by-frame Seedance 2.5 generation progress, and real-time stage-to-model synchronization.',
    equipmentHighlights: [
      '14m Curved Fine-Pitch Micro-LED Production Wall',
      '12 Dual-Display Seedance 2.5 Orchestration Terminals',
      'Real-Time Multi-Zone Telemetry & Queue Matrix',
      'Acoustically Isolated Glass Stage Observation Gallery',
    ],
    workflowOutputs: [
      'Master Shot Schedules & Scene Allocation',
      'Synchronized AI + Camera Cue Lists',
      'Cross-Department Render Priority Routing',
    ],
    connectedZones: ['virtual-production', 'ai-video-generation', 'infrastructure-ops'],
    translations: {
      id: {
        title: 'Pusat Komando & Kontrol AI',
        subtitle: 'Lantai orkestrasi pusat dengan dinding monitor lengkung masif dan terminal produksi Seedance 2.5.',
        zoneLabel: 'SAYAP 01 // ORKESTRASI MISI',
        categoryLabel: 'KOMANDO & TELEMETRI',
        overview:
          'Pusat kendali VAIURE AI Hybrid Studio tempat sutradara dan engineer mengoordinasikan antrean sintesis Seedance 2.5 secara paralel dengan syuting panggung virtual.',
      },
      zh: {
        title: 'AI 指挥与控制中心',
        subtitle: '配备巨幅曲面监控幕墙与 Seedance 2.5 调度终端的核心制片中枢。',
        zoneLabel: '01 区 // 全局制片调度',
        categoryLabel: '指挥调度中心',
        overview:
          'VAIURE AI 混合制片工作室的神经中枢。导演、AI 技术总监与管线工程师通过 14 米微间距曲面幕墙同步调度 Seedance 2.5 生成队列与实体虚拟摄影棚拍摄。',
      },
    },
  },
  {
    id: 'virtual-production',
    code: '02 · DEPT B',
    departmentLetter: 'B',
    category: 'STAGE',
    title: 'Virtual Production Stage',
    subtitle: 'Curved LED volume soundstage, motorized cinema crane, motion capture, and chroma-key wing.',
    zoneLabel: 'WING 02 // VOLUME SOUNDSTAGE',
    categoryLabel: 'LED VOLUME & MOCAP',
    pipelineStageIds: ['scene-production'],
    leadRole: 'Virtual DP & Stage Motion Supervisor',
    footprint: '680 m² Clear-Span Stage · 11m Ceiling Truss Grid',
    lightingSpec: 'DMX Overhead Fresnel Rig · Recessed Stage Floor Guide',
    heroImage: virtualStageImg,
    thumbnailImage: virtualStageImg,
    galleryPlates: [
      { image: virtualStageImg, caption: 'Curved LED volume displaying Seedance-generated alpine plate with cinema dolly crane' },
      { image: commandWallImg, caption: 'Soundstage floor synchronized live with Command Center telemetry' },
      { image: characterStudioImg, caption: 'Connected reference capture bay for performer lighting matching' },
    ],
    overview:
      'A full-scale Hollywood-grade soundstage blending physical cinema optics with generative AI environments. Seedance 2.5 plates drive the curved LED background wall in real time while foreground talent and practical set pieces are captured in-camera.',
    architecturalNote:
      'Engineered with matte black epoxy soundstage flooring, suspended motorized steel lighting trusses, optical motion-capture camera rings, and a glass-divided chroma-key staging bay.',
    seedanceIntegration:
      'Feeds Seedance 2.5 synthetic environment plates directly onto the curved LED volume and captures camera tracking metadata back into AI shot refinement.',
    equipmentHighlights: [
      '270° Curved High-Brightness Cinema LED Volume',
      'Large-Format Digital Cinema Camera on Motorized Crane Dolly',
      '36-Camera Perimeter Optical Motion-Capture Array',
      'Glass-Enclosed Chroma-Key & Practical Effects Wing',
    ],
    workflowOutputs: [
      'In-Camera VFX Plates with Physical Lens Parallax',
      'Synchronized Motion Capture Skeletons & Camera Paths',
      'Hybrid Live-Action + AI Background Master Takes',
    ],
    connectedZones: ['command-control', 'ai-video-generation', 'post-production'],
    translations: {
      id: {
        title: 'Panggung Produksi Virtual',
        subtitle: 'Soundstage LED volume lengkung, kamera sinema bermotor, motion capture, dan ruang chroma-key.',
        zoneLabel: 'SAYAP 02 // PANGGUNG VOLUME LED',
        categoryLabel: 'VOLUME LED & MOCAP',
        overview:
          'Panggung produksi berstandar sinema yang menggabungkan kamera fisik dan dinding LED volume berlatar lingkungan generatif Seedance 2.5.',
      },
      zh: {
        title: '虚拟制片摄影棚',
        subtitle: '大型弧形 LED 虚拟背景墙、电动摇臂电影机位、动作捕捉矩阵与绿幕合成翼区。',
        zoneLabel: '02 区 // LED 虚拟摄影棚',
        categoryLabel: '虚拟制片与动捕',
        overview:
          '将物理电影光学与生成式 AI 环境融为一体的好莱坞级摄影棚。Seedance 2.5 生成的环境场景实时驱动弧形 LED 背景墙，实现所见即所得的机内实拍。',
      },
    },
  },
  {
    id: 'ai-video-generation',
    code: '03 · DEPT C',
    departmentLetter: 'C',
    category: 'GENERATION',
    title: 'AI Video Generation Dept.',
    subtitle: 'Dedicated Seedance 2.5 synthesis bays, prompt engineering desks, and preview monitoring suites.',
    zoneLabel: 'WING 03 // SEEDANCE 2.5 SYNTHESIS',
    categoryLabel: 'AI VIDEO & PROMPT LAB',
    pipelineStageIds: ['prompt-engineering', 'ai-video-generation'],
    leadRole: 'Lead Prompt Architect & Synthesis Directors',
    footprint: '260 m² Glass Acoustic Pavilion · 16 Workstations',
    lightingSpec: '6500K D65 Bias Monitor Backlighting · Cobalt Floor Edge',
    heroImage: aiVideoDeptImg,
    thumbnailImage: aiVideoDeptImg,
    galleryPlates: [
      { image: aiVideoDeptImg, caption: 'Symmetrical Seedance 2.5 prompt engineering and multi-view video synthesis desks' },
      { image: postProdSuiteImg, caption: 'Direct glass corridor routing finalized generations to Color Grading' },
      { image: commandWallImg, caption: 'Real-time dispatch visibility on main Command Wall' },
    ],
    overview:
      'Glass-enclosed synthesis laboratories dedicated exclusively to Seedance 2.5 image-to-video direction, multi-reference continuity framing, and camera-motion prompt engineering up to 4K · 30s master durations.',
    architecturalNote:
      'Constructed with dark anodized acoustic wall felt, full-height tempered glass partitions, and calibrated dual-display workstations eliminating screen glare.',
    seedanceIntegration:
      'Core creative interface for Seedance 2.5 production: prompt engineering stations craft lens trajectories, physics constraints, and keyframe anchors before dispatching renders.',
    equipmentHighlights: [
      '16 Calibrated Dual-Screen Seedance 2.5 Authoring Desks',
      'Clean Conceptual Timeline & Multi-Shot Continuity Terminals',
      'Dedicated Reference Keyframe & Motion Prompt Consoles',
      'Instant Preview Wall for Multi-Seed Director Review',
    ],
    workflowOutputs: [
      '4K / 1080p Seedance 2.5 Master Video Generations (5s–30s)',
      'Keyframe-Locked Shot Sequences & Camera Trajectories',
      'Multi-Provider Parity Benchmarks (ByteDance & MUAPI)',
    ],
    connectedZones: ['command-control', 'character-studio', 'post-production'],
    translations: {
      id: {
        title: 'Departemen Generasi Video AI',
        subtitle: 'Ruang sintesis khusus Seedance 2.5, stasiun rekayasa prompt, dan monitor pratinjau produksi.',
        zoneLabel: 'SAYAP 03 // SINTESIS SEEDANCE 2.5',
        categoryLabel: 'LAB VIDEO AI & PROMPT',
        overview:
          'Laboratorium sintesis berdinding kaca untuk pengarahan video Seedance 2.5, rekayasa prompt kamera, dan pratinjau resolusi hingga 4K · 30 detik.',
      },
      zh: {
        title: 'AI 视频生成部门',
        subtitle: '专属 Seedance 2.5 生成工作站、提示词工程台与实时合成预览终端区。',
        zoneLabel: '03 区 // SEEDANCE 2.5 合成部门',
        categoryLabel: 'AI 生成与提示词工坊',
        overview:
          '全玻璃声学隔离合成实验室，专注于 Seedance 2.5 图生视频导演控制、多参考图连贯构图以及最高 4K · 30 秒母带级镜头提示词工程。',
      },
    },
  },
  {
    id: 'post-production',
    code: '04 · DEPT D',
    departmentLetter: 'D',
    category: 'POST',
    title: 'Cinematic Post-Production',
    subtitle: 'Master OLED HDR color grading suites, finishing timelines, and spatial audio synchronization.',
    zoneLabel: 'WING 04 // GRADING & FINISHING',
    categoryLabel: 'COLOR & SOUND FINISHING',
    pipelineStageIds: ['cinematic-refinement'],
    leadRole: 'Senior Colorist & Acoustic Mastering Lead',
    footprint: '190 m² Acoustically Tuned Finishing Suites',
    lightingSpec: 'Calibrated D65 Surround Bias · Matte Obsidian Slats',
    heroImage: postProdSuiteImg,
    thumbnailImage: postProdSuiteImg,
    galleryPlates: [
      { image: postProdSuiteImg, caption: 'Master HDR grading theater with motorized tactile console and acoustic slat walls' },
      { image: aiVideoDeptImg, caption: 'Seamless raw EXR/ProRes handoff from AI Generation bays' },
      { image: serverInfraImg, caption: 'High-speed fiber SAN link to central finishing storage' },
    ],
    overview:
      'Where synthetic Seedance 2.5 outputs and live LED volume plates unify into theatrical cinema. Every frame undergoes halation modeling, film-grain matching, color-science grading, and spatial sound design.',
    architecturalNote:
      'Timber-graphite acoustic slat treatment wraps a reference grading theater built around a frameless glass bridge into the central dark atrium.',
    seedanceIntegration:
      'Takes raw Seedance 2.5 sequences and blends them seamlessly alongside optical cinema camera footage under unified ACES color management.',
    equipmentHighlights: [
      '4K Reference OLED Mastering Display (1000-Nit Peak)',
      'Custom Tactile Color Grading & Editorial Fader Console',
      'Coaxial Active Studio Reference Spatial Monitoring',
      'Optical Film-Grain & Temporal De-Flicker Finishing Node',
    ],
    workflowOutputs: [
      'ACEScct Color-Graded Theatrical & Brand Masters',
      'Audio-Synchronized Final Picture Locks',
      'DCI-4K & Broadcast HDR Deliverable Packages',
    ],
    connectedZones: ['ai-video-generation', 'virtual-production', 'infrastructure-ops'],
    translations: {
      id: {
        title: 'Departemen Pasca-Produksi Sinematik',
        subtitle: 'Ruang grading warna HDR master, penyuntingan akhir, dan sinkronisasi audio spasial.',
        zoneLabel: 'SAYAP 04 // TATA WARNA & FINISHING',
        categoryLabel: 'GRADING & AUDIO MASTER',
        overview:
          'Tempat hasil generasi Seedance 2.5 dan rekaman panggung virtual disatukan lewat ilmu warna ACES, tekstur film, dan tata suara spasial.',
      },
      zh: {
        title: '电影级后期制作中心',
        subtitle: 'HDR 参考级调色影厅、精剪合成工位与空间声画同步母带室。',
        zoneLabel: '04 区 // 调色与声画精修',
        categoryLabel: '调色与声音后期',
        overview:
          '将 Seedance 2.5 生成画面与虚拟摄影棚实拍素材统一融合为电影级成片的核心后期部门，完成 ACES 色彩科学管理、胶片质感匹配与空间声景混音。',
      },
    },
  },
  {
    id: 'character-studio',
    code: '05 · DEPT E',
    departmentLetter: 'E',
    category: 'CAPTURE',
    title: 'AI Performance & Character',
    subtitle: 'Controlled photogrammetry capture rig, digital human development, and character reference bay.',
    zoneLabel: 'WING 05 // CHARACTER & REFERENCE',
    categoryLabel: 'DIGITAL HUMAN CAPTURE',
    pipelineStageIds: ['prompt-engineering'],
    leadRole: 'Character Technical Director & Capture Lead',
    footprint: '310 m² Controlled Cyclorama & Rig Bay',
    lightingSpec: 'Precision Strobe & Parabolic Diffusers · Cobalt Edge',
    heroImage: characterStudioImg,
    thumbnailImage: characterStudioImg,
    galleryPlates: [
      { image: characterStudioImg, caption: 'Semicircular multi-camera photogrammetry array and precision turntable stage' },
      { image: aiVideoDeptImg, caption: 'Character reference plates routed to Seedance 2.5 prompt desks' },
      { image: virtualStageImg, caption: 'Digital double integration into Virtual Production stage' },
    ],
    overview:
      'Dedicated to producing ultra-clean, physically accurate character sheets, garment textiles, and facial reference libraries that anchor identity consistency across long-form Seedance 2.5 productions.',
    architecturalNote:
      'Features a darkened anti-reflective cyclorama floor surrounding a calibrated turntable ring, parabolic strobe booms, and a glassed observation booth.',
    seedanceIntegration:
      'Captures distortion-free multi-angle character & product reference plates fed directly into Seedance 2.5 image-to-video and multi-reference conditioning.',
    equipmentHighlights: [
      '48-Camera Synchronized Semicircular Reference Array',
      'Calibrated Matte Obsidian Turntable & Laser Alignment Grid',
      'Diffused Parabolic Studio Strobe & Bi-Color LED Rig',
      'Glass-Walled Character Look-Dev Observation Booth',
    ],
    workflowOutputs: [
      'Identity-Consistent Character Reference Sheets',
      'Micro-Texture Textile & Lighting Calibration Plates',
      'Digital Human Groom, Expression & Wardrobe Assets',
    ],
    connectedZones: ['ai-video-generation', 'virtual-production'],
    translations: {
      id: {
        title: 'Studio Performa & Karakter AI',
        subtitle: 'Rig penangkapan fotogrametri terkontrol, pengembangan manusia digital, dan referensi karakter.',
        zoneLabel: 'SAYAP 05 // STUDIO KARAKTER AI',
        categoryLabel: 'REFERENSI & MANUSIA DIGITAL',
        overview:
          'Memproduksi lembar referensi karakter dan tekstil berpresisi tinggi guna menjaga konsistensi identitas lintas adegan dalam Seedance 2.5.',
      },
      zh: {
        title: 'AI 表演与数字角色棚',
        subtitle: '可控摄影测量参考阵列、数字人资产研发与角色一致性采集棚。',
        zoneLabel: '05 区 // 角色与数字人采集',
        categoryLabel: '角色参考与采集',
        overview:
          '专注于拍摄高保真人物、服装织物与多角度参考资产，为 Seedance 2.5 长篇连续镜头提供稳定精准的角色与物理光影锚点。',
      },
    },
  },
  {
    id: 'infrastructure-ops',
    code: '06 · DEPT F',
    departmentLetter: 'F',
    category: 'INFRA',
    title: 'Infrastructure & Tech Ops',
    subtitle: 'High-density liquid-cooled compute racks, fiber storage fabrics, and secure render nodes.',
    zoneLabel: 'WING 06 // COMPUTE & STORAGE HALL',
    categoryLabel: 'SERVER & RENDER CLUSTER',
    pipelineStageIds: ['final-video-output'],
    leadRole: 'Principal Systems & Pipeline Architect',
    footprint: '340 m² Cold-Aisle Contained Compute Hall',
    lightingSpec: 'Cold-Aisle Cobalt Linear Strips · Concrete Gallery',
    heroImage: serverInfraImg,
    thumbnailImage: serverInfraImg,
    galleryPlates: [
      { image: serverInfraImg, caption: 'Symmetrical liquid-cooled compute aisles viewed behind acoustic glass' },
      { image: commandWallImg, caption: 'Cluster telemetry mirrored live onto Command Center dashboards' },
      { image: postProdSuiteImg, caption: 'Zero-latency NVMe fabric serving 4K HDR finishing rooms' },
    ],
    overview:
      'Industrial backbone powering VAIURE multi-provider dispatch, encrypted asset storage, and high-throughput rendering across ByteDance, MUAPI, and local pre-visualization clusters.',
    architecturalNote:
      'Visible from the main facility corridor through full-height acoustic glass: symmetrical matte obsidian server cabinets framed in brushed titanium beneath overhead fiber trays.',
    seedanceIntegration:
      'Executes authenticated server-side API orchestration, telemetry monitoring, encrypted master media caching, and deterministic archival vaulting.',
    equipmentHighlights: [
      'Liquid-Cooled Multi-Node AI Inference & Cache Racks',
      '400GbE Overhead Fiber-Optic Studio Fabric',
      'Petabyte-Scale All-Flash NVMe Production SAN',
      'Zero-Trust Credential Vault & Provider Dispatch Proxy',
    ],
    workflowOutputs: [
      'Sub-Second 4K Proxy Streaming Across All 6 Departments',
      'Verified Provider API Orchestration & Cost Telemetry',
      'Immutable Master Video Archival & Client Vaults',
    ],
    connectedZones: ['command-control', 'ai-video-generation', 'post-production'],
    translations: {
      id: {
        title: 'Infrastruktur & Operasi Teknis',
        subtitle: 'Rak komputasi berpendingin cair kepadatan tinggi, jaringan penyimpanan fiber, dan cluster render.',
        zoneLabel: 'SAYAP 06 // KOMPUTASI & INFRASTRUKTUR',
        categoryLabel: 'SERVER & CLUSTER RENDER',
        overview:
          'Tulang punggung komputasi dan penyimpanan berkecepatan tinggi yang melayani orkestrasi multi-provider AI dan distribusi media 4K seluruh studio.',
      },
      zh: {
        title: '基础设施与技术运维中心',
        subtitle: '高密度液冷算力机柜阵列、全闪存高速光纤网络与安全渲染集群。',
        zoneLabel: '06 区 // 算力与存储机房',
        categoryLabel: '算力与集群运维',
        overview:
          '支撑 VAIURE 多供应商视频调度、高并发资产缓存、加密媒资存储与全工作室 4K 无损媒体分发的工业级底层基础设施。',
      },
    },
  },
];

export function getLocalizedStudioDepartment(
  dept: StudioDepartment,
  language: string
): StudioDepartment {
  if (language !== 'id' && language !== 'zh') return dept;
  const tr = dept.translations?.[language];
  if (!tr) return dept;
  return {
    ...dept,
    title: tr.title ?? dept.title,
    subtitle: tr.subtitle ?? dept.subtitle,
    zoneLabel: tr.zoneLabel ?? dept.zoneLabel,
    categoryLabel: tr.categoryLabel ?? dept.categoryLabel,
    overview: tr.overview ?? dept.overview,
    architecturalNote: tr.architecturalNote ?? dept.architecturalNote,
    seedanceIntegration: tr.seedanceIntegration ?? dept.seedanceIntegration,
    equipmentHighlights: tr.equipmentHighlights ?? dept.equipmentHighlights,
    workflowOutputs: tr.workflowOutputs ?? dept.workflowOutputs,
  };
}

export function getLocalizedStudioDepartments(
  departments: StudioDepartment[],
  language: string
): StudioDepartment[] {
  return departments.map((dept) => getLocalizedStudioDepartment(dept, language));
}

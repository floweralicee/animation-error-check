export type Locale = 'en' | 'zh';

export const locales: Locale[] = ['en', 'zh'];

export const defaultLocale: Locale = 'en';

export const localeNames: Record<Locale, string> = {
  en: 'English',
  zh: '中文',
};

export const pageTitles: Record<Locale, string> = {
  en: 'Hana — Your Animation Helper',
  zh: 'Hana — 你的动画小助手',
};

export const pageDescriptions: Record<Locale, string> = {
  en: 'Upload animation clips and get frame-by-frame feedback on the 12 principles of animation.',
  zh: '上传动画片段，获取基于动画十二法则的逐帧反馈。',
};

export const translations = {
  en: {
    // Hero
    heroSubhead: 'Your trusted animation helper.',
    heroTagline:
      'Upload a clip, get frame-by-frame feedback on the 12 principles — so you know exactly what to fix next.',
    featureCheckShot: 'Check your shot',
    featureSpotIssues: 'Spot possible issues',
    featureUnderstandFix: 'Understand what to fix first',
    featurePrepareCritique: 'Prepare before critique',
    featureBuildHabits: 'Build better animation habits',

    // Upload form
    animationClip: 'Animation Clip',
    exerciseType: 'Exercise Type',
    analyze: 'Analyze',
    analyzing: 'Analyzing...',
    selected: 'Selected',

    // Exercise types
    exerciseAuto: 'Auto-detect',
    exerciseBouncingBall: 'Bouncing Ball',
    exerciseWalkCycle: 'Walk Cycle',
    exerciseJump: 'Jump',
    exerciseActing: 'Acting / Performance',

    // Loading & errors
    loadingMessage:
      'Analyzing — extracting frames, computing motion vectors, evaluating 12 principles...',
    errorLabel: 'Error:',
    connectionError:
      'Connection failed. Make sure the dev server is running (npm run dev) and try again.',
    somethingWentWrong: 'Something went wrong',
    serverError: 'Server error',

    // Results
    overallScore: 'Overall Animation Score',
    summary: 'Summary',
    shotReview: 'Shot Review',
    playback: 'Playback',
    topPriorities: 'Top Priorities',
    videoMetadata: 'Video Metadata',
    fps: 'FPS',
    duration: 'Duration',
    secondsUnit: 's',
    resolution: 'Resolution',
    frames: 'Frames',
    sampled: 'Sampled',
    motionFrames: 'Motion Frames',
    bodyZoneMotion: 'Body Zone Motion',
    avg: 'Avg',
    peak: 'Peak',
    motion: 'Motion',
    twelvePrinciples: '12 Principles of Animation',
    pixelLevelIssues: 'Pixel-Level Issues',
    framesLabel: 'Frames',
    motionProfile: 'Motion Profile',
    motionProfileDesc:
      'Displacement magnitude per frame. Taller bars = more motion.',
    frame: 'Frame',
    frameShort: 'F',
    tooltipPeak: 'peak',
    analysisConfidence: 'Analysis confidence',

    // Issue categories (pixel-level)
    categoryLowMotion: 'low motion',
    categoryEvenMotion: 'even motion',
    categoryAbruptTransition: 'abrupt transition',
    categoryBrightnessShift: 'brightness shift',
    categoryPossibleHold: 'possible hold',
    keyframePreviews: 'Keyframe Previews',
    keyframePreviewsDesc:
      'I-frames extracted from the video codec. These are reference points, not necessarily the most important animation frames.',
    keyframe: 'Keyframe',

    // Principle card
    issues: 'issues',
    issue: 'issue',
    hide: 'Hide',
    show: 'Show',
    toolSuggestions: 'tool suggestions',
    animBotTools: 'animBot tools',
    howToFix: 'How to fix:',
    showMeasuredData: 'Show measured data',
    hideMeasuredData: 'Hide measured data',

    // Severity
    severityHigh: 'high',
    severityMedium: 'medium',
    severityLow: 'low',

    // Issue timeline
    issuesDetected: 'issues detected',
    high: 'high',
    medium: 'medium',
    goToIssueStart: 'Go to issue start',
    goToIssueEnd: 'Go to issue end',

    // Video player
    previousFrame: 'Previous frame',
    nextFrame: 'Next frame',

    // Zone labels
    zoneWholeBody: '🦴 Whole Body',
    zoneHead: '🔵 Head / Nose',
    zoneChest: '🟢 Chest / Shoulders',
    zoneLeftArm: '🟡 Left Arm',
    zoneRightArm: '🟠 Right Arm',
    zoneCore: '🟣 Core / Hips',
    zoneLeftLeg: '🔴 Left Leg',
    zoneRightLeg: '🟤 Right Leg',
    zoneHeadShort: '🔵 Head',
    zoneChestShort: '🟢 Chest',
    zoneLeftArmShort: '🟡 L. Arm',
    zoneRightArmShort: '🟠 R. Arm',
    zoneCoreShort: '🟣 Core',
    zoneLeftLegShort: '🔴 L. Leg',
    zoneRightLegShort: '🟤 R. Leg',

    // Principle names (from API)
    principleSquashStretch: 'Squash & Stretch',
    principleTiming: 'Timing',
    principleAnticipation: 'Anticipation',
    principleFollowThrough: 'Follow Through & Overlapping Action',
    principleArcs: 'Arcs',
    principleSlowInSlowOut: 'Slow In / Slow Out',
    principleStaging: 'Staging',
    principleSecondaryAction: 'Secondary Action',
    principleExaggeration: 'Exaggeration',
    principleSolidDrawing: 'Solid Drawing',
    principleAppeal: 'Appeal',
    principleStraightAheadPoseToPose: 'Straight Ahead / Pose to Pose',

    // Footer
    madeBy: 'Made by Alice Chen',
  },
  zh: {
    // Hero
    heroSubhead: '你的动画小助手。',
    heroTagline:
      '传个片段上来，我们逐帧帮你看看 —— 哪里能更好，一眼就懂。',
    featureCheckShot: '检查你的镜头',
    featureSpotIssues: '发现潜在问题',
    featureUnderstandFix: '明确优先修复项',
    featurePrepareCritique: '评片前做好准备',
    featureBuildHabits: '养成更好的动画习惯',

    // Upload form
    animationClip: '动画片段',
    exerciseType: '练习类型',
    analyze: '分析',
    analyzing: '分析中...',
    selected: '已选择',

    // Exercise types
    exerciseAuto: '自动检测',
    exerciseBouncingBall: '弹跳球',
    exerciseWalkCycle: '走路循环',
    exerciseJump: '跳跃',
    exerciseActing: '表演 / 动作',

    // Loading & errors
    loadingMessage:
      '分析中 —— 提取帧、计算运动矢量、评估十二法则...',
    errorLabel: '错误：',
    connectionError:
      '连接失败。请确保开发服务器已启动（npm run dev）后重试。',
    somethingWentWrong: '出了点问题',
    serverError: '服务器错误',

    // Results
    overallScore: '动画综合评分',
    summary: '总结',
    shotReview: '镜头评审',
    playback: '播放',
    topPriorities: '优先改进项',
    videoMetadata: '视频元数据',
    fps: '帧率',
    duration: '时长',
    secondsUnit: '秒',
    resolution: '分辨率',
    frames: '帧数',
    sampled: '采样',
    motionFrames: '运动帧',
    bodyZoneMotion: '身体区域运动',
    avg: '平均',
    peak: '峰值',
    motion: '运动',
    twelvePrinciples: '动画十二法则',
    pixelLevelIssues: '像素级问题',
    framesLabel: '帧',
    motionProfile: '运动曲线',
    motionProfileDesc:
      '每帧位移幅度。柱越高表示运动越多。',
    frame: '帧',
    frameShort: '帧',
    tooltipPeak: '峰值',
    analysisConfidence: '分析置信度',

    // Issue categories (pixel-level)
    categoryLowMotion: '运动过少',
    categoryEvenMotion: '运动过于均匀',
    categoryAbruptTransition: '过渡突兀',
    categoryBrightnessShift: '亮度突变',
    categoryPossibleHold: '可能为静止帧',
    keyframePreviews: '关键帧预览',
    keyframePreviewsDesc:
      '从视频编解码器提取的 I 帧。这些是参考点，不一定是动画中最重要的帧。',
    keyframe: '关键帧',

    // Principle card
    issues: '个问题',
    issue: '个问题',
    hide: '收起',
    show: '展开',
    toolSuggestions: '工具建议',
    animBotTools: 'animBot 工具',
    howToFix: '如何修复：',
    showMeasuredData: '显示测量数据',
    hideMeasuredData: '收起测量数据',

    // Severity
    severityHigh: '高',
    severityMedium: '中',
    severityLow: '低',

    // Issue timeline
    issuesDetected: '个问题已检测',
    high: '高',
    medium: '中',
    goToIssueStart: '跳至问题起始',
    goToIssueEnd: '跳至问题结束',

    // Video player
    previousFrame: '上一帧',
    nextFrame: '下一帧',

    // Zone labels
    zoneWholeBody: '🦴 全身',
    zoneHead: '🔵 头部 / 鼻子',
    zoneChest: '🟢 胸部 / 肩膀',
    zoneLeftArm: '🟡 左臂',
    zoneRightArm: '🟠 右臂',
    zoneCore: '🟣 躯干 / 髋部',
    zoneLeftLeg: '🔴 左腿',
    zoneRightLeg: '🟤 右腿',
    zoneHeadShort: '🔵 头',
    zoneChestShort: '🟢 胸',
    zoneLeftArmShort: '🟡 左臂',
    zoneRightArmShort: '🟠 右臂',
    zoneCoreShort: '🟣 躯干',
    zoneLeftLegShort: '🔴 左腿',
    zoneRightLegShort: '🟤 右腿',

    // Principle names (from API)
    principleSquashStretch: '挤压与拉伸',
    principleTiming: '时间节奏',
    principleAnticipation: '预备动作',
    principleFollowThrough: '跟随与重叠动作',
    principleArcs: '弧线运动',
    principleSlowInSlowOut: '慢入慢出',
    principleStaging: '演出布局',
    principleSecondaryAction: '次要动作',
    principleExaggeration: '夸张',
    principleSolidDrawing: '扎实的描绘',
    principleAppeal: '吸引力',
    principleStraightAheadPoseToPose: '逐格绘制 / 关键帧绘制',

    // Footer
    madeBy: '由 Alice Chen 制作',
  },
} as const;

export type TranslationKeys = keyof (typeof translations)['en'];

/** Map severity keys to translation keys */
export const SEVERITY_KEYS: Record<string, TranslationKeys> = {
  high: 'severityHigh',
  medium: 'severityMedium',
  low: 'severityLow',
};

/** Map API issue category keys to translation keys */
export const CATEGORY_KEYS: Record<string, TranslationKeys> = {
  low_motion: 'categoryLowMotion',
  even_motion: 'categoryEvenMotion',
  abrupt_transition: 'categoryAbruptTransition',
  brightness_shift: 'categoryBrightnessShift',
  possible_hold: 'categoryPossibleHold',
};

/** Map zone keys to translation keys for display names */
export const ZONE_DISPLAY_KEYS: Record<string, TranslationKeys> = {
  whole_body: 'zoneWholeBody',
  head: 'zoneHead',
  chest: 'zoneChest',
  left_arm: 'zoneLeftArm',
  right_arm: 'zoneRightArm',
  core: 'zoneCore',
  left_leg: 'zoneLeftLeg',
  right_leg: 'zoneRightLeg',
};

/** Map API principle keys to translation keys for display names */
export const PRINCIPLE_DISPLAY_KEYS: Record<string, TranslationKeys> = {
  squash_stretch: 'principleSquashStretch',
  timing: 'principleTiming',
  anticipation: 'principleAnticipation',
  follow_through: 'principleFollowThrough',
  arcs: 'principleArcs',
  slow_in_slow_out: 'principleSlowInSlowOut',
  staging: 'principleStaging',
  secondary_action: 'principleSecondaryAction',
  exaggeration: 'principleExaggeration',
  solid_drawing: 'principleSolidDrawing',
  appeal: 'principleAppeal',
  straight_ahead_pose_to_pose: 'principleStraightAheadPoseToPose',
};

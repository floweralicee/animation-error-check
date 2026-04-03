export type Locale = 'en' | 'zh';

export const locales: Locale[] = ['en', 'zh'];

export const defaultLocale: Locale = 'en';

export const localeNames: Record<Locale, string> = {
  en: 'English',
  zh: '中文',
};

export const pageTitles: Record<Locale, string> = {
  en: 'Hana — Your 24/7 Animation Mentor',
  zh: 'Hana — 你的24/7动画导师',
};

export const pageDescriptions: Record<Locale, string> = {
  en: 'Upload animation clips and get frame-by-frame feedback on the 12 principles of animation.',
  zh: '上传动画片段，获取基于动画十二法则的逐帧反馈。',
};

export const translations = {
  en: {
    // Hero
    heroSubhead: 'Your 24/7 animation mentor.',
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
    email: "Email (we'll send you a copy of your analysis)",
    emailPlaceholder: 'harrypotter@Hogwarts.com',
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
    emailRequired: 'Email is required',
    emailInvalid: 'Invalid email format',
    asyncAnalysisUnavailable:
      'Async analysis is not configured. Ask the admin to set Supabase and Inngest, or turn off async mode.',
    analysisPollingTimeout:
      'Analysis is taking longer than expected. If you enabled email, check your inbox for a summary.',
    serverError: 'Server error',

    analyzedAtLabel: 'Analyzed',
    videoReplayUnavailable:
      'Video replay is only available on the device where you uploaded this clip. Charts and scores below still reflect your analysis.',
    jobNotFound: 'This analysis link is invalid or has expired.',
    jobResultUnavailable:
      'This analysis is marked complete but no saved result was found. Please run the analysis again.',
    jobDeepLinkUnavailable:
      'Saved results are unavailable (server not configured). Open Hana from the device where you ran the analysis.',
    jobLoadFailed: 'Could not load this analysis.',
    jobStillProcessing: 'This analysis is still running. Please wait…',
    emailSentHint: '(Email sent)',
    emailFailedHint: '(Email could not be sent)',
    emailSkippedHint: '(Summary email not sent — email not configured)',

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
    motionCurve: 'Motion Curve',
    motionCurveDesc:
      'Displacement curve over time. Line color = motion intensity. Dashed overlay = detected easing type. Click to seek.',
    motionIntensity: 'Intensity',
    motionHold: 'Hold',
    motionSlow: 'Slow',
    motionNormal: 'Normal',
    motionFast: 'Fast',
    motionPeak: 'Peak',
    easingRef: 'Easing',
    easingLinear: 'Linear',
    easingEaseIn: 'Ease In',
    easingEaseOut: 'Ease Out',
    easingEaseInOut: 'Ease In-Out',
    easingSpring: 'Spring',
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
    trailsOn: '◎ Trails On',
    trailsOff: '○ Trails Off',
    trailsShowMotionTrails: 'Show motion trails',
    trailsHideMotionTrails: 'Hide motion trails',
    trailsNewFeatureTesting: '(new feature testing)',

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
    footerQuestions:
      'If you have questions, reach me here.',

    // Event invite popup
    eventInviteTitle: '你好呀！',
    eventInviteBody:
      '你今天真的是太幸运啦！找到了这个软件里的小彩蛋，只有5%的用户才有哦。动画导师咕噜给你准备了一个动画公开课《像玩"找不同"一样做动画》，欢迎来参加。',
    eventInviteCta: '好',
    eventInviteClose: '关闭',
    eventInviteDismiss: '不再显示',
    eventInviteFabLabel: '打开活动邀请',
  },
  zh: {
    // Hero
    heroSubhead: '你的24/7动画导师。',
    heroTagline:
      '传个片段上来，我们逐帧帮你分析根据动画的 12 个原则。之后怎么改，一眼就懂。',
    featureCheckShot: '检查你的镜头',
    featureSpotIssues: '发现潜在问题',
    featureUnderstandFix: '明确优先修复项',
    featurePrepareCritique: '评片前做好准备',
    featureBuildHabits: '养成更好的动画习惯',

    // Upload form
    animationClip: '动画片段',
    exerciseType: '练习类型',
    email: '邮箱（我们会把分析结果副本发到你邮箱）',
    emailPlaceholder: 'harrypotter@Hogwarts.com',
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
    emailRequired: '请填写邮箱',
    emailInvalid: '邮箱格式不正确',
    asyncAnalysisUnavailable:
      '异步分析未配置。请让管理员配置 Supabase 与 Inngest，或关闭异步模式。',
    analysisPollingTimeout: '分析耗时过长。若已开启邮件，请查收邮箱中的摘要。',
    serverError: '服务器错误',

    analyzedAtLabel: '分析时间',
    videoReplayUnavailable:
      '视频回放仅在上传该片段的设备上可用。下方图表与分数仍对应当次分析。',
    jobNotFound: '该分析链接无效或已失效。',
    jobResultUnavailable:
      '该分析显示已完成，但未找到保存的结果。请重新运行分析。',
    jobDeepLinkUnavailable:
      '无法加载已保存的结果（服务器未配置）。请在上传分析的设备上打开 Hana。',
    jobLoadFailed: '无法加载该分析。',
    jobStillProcessing: '分析仍在进行中，请稍候…',
    emailSentHint: '（邮件已发送）',
    emailFailedHint: '（邮件未能发送）',
    emailSkippedHint: '（未发送摘要邮件 — 邮件未配置）',

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
    motionProfile: '运动柱状图',
    motionProfileDesc:
      '每帧位移幅度。柱越高表示运动越多。',
    motionCurve: '运动曲线',
    motionCurveDesc:
      '随时间变化的位移曲线。线条颜色代表运动强度，虚线叠加显示检测到的缓动类型。点击可跳转到对应帧。',
    motionIntensity: '强度',
    motionHold: '静止',
    motionSlow: '缓慢',
    motionNormal: '正常',
    motionFast: '快速',
    motionPeak: '峰值',
    easingRef: '缓动',
    easingLinear: '线性',
    easingEaseIn: '缓入',
    easingEaseOut: '缓出',
    easingEaseInOut: '缓入缓出',
    easingSpring: '弹簧',
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
    trailsOn: '◎ 轨迹开',
    trailsOff: '○ 轨迹关',
    trailsShowMotionTrails: '显示运动轨迹',
    trailsHideMotionTrails: '隐藏运动轨迹',
    trailsNewFeatureTesting: '（新功能测试中）',

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
    madeBy: '由 Alice 制作',
    footerQuestions:
      '如有问题，欢迎在这里联系我。',

    // Event invite popup
    eventInviteTitle: '你好呀！',
    eventInviteBody:
      '你今天真的是太幸运啦！找到了这个软件里的小彩蛋，只有5%的用户才有哦。动画导师咕噜给你准备了一个动画公开课《像玩"找不同"一样做动画》，欢迎来参加。',
    eventInviteCta: '好',
    eventInviteClose: '关闭',
    eventInviteDismiss: '不再显示',
    eventInviteFabLabel: '打开活动邀请',
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

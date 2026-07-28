"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { ReactNode } from "react";

type Phase = "cover" | "investigation" | "finale" | "ending";
type EndingId = "complete" | "clean" | "sealed";
type VoiceId = "qiao" | "tang" | "chen" | "child" | "listener";

type VoiceCue = {
  speaker: string;
  tone: string;
  text: string;
  danger?: boolean;
};

type PlaybackSelection = {
  stage: number;
  option: string;
};

type AudioPlaybackResult = {
  duration: number;
  started: boolean;
  reason?: "sound-off" | "blocked";
};

type SaveState = {
  started: boolean;
  phase: Phase;
  currentChapter: number;
  completed: number[];
  soundEnabled: boolean;
  textAssist: boolean;
  hintLevels: number[];
  failureCounts: number[];
  ending: EndingId | null;
};

type Chapter = {
  id: number;
  number: string;
  title: string;
  file: string;
  objective: string;
  input: string;
  artifact: string;
  nextUse: string;
  threadClue: string;
  horror: string;
  fact: string;
  monologue: string;
  transcript: string[];
  duration: string;
};

const STORAGE_KEY = "the-seventh-code-save-v3";

const DEFAULT_SAVE: SaveState = {
  started: false,
  phase: "cover",
  currentChapter: 0,
  completed: [],
  soundEnabled: true,
  textAssist: false,
  hintLevels: Array(8).fill(0),
  failureCounts: Array(8).fill(0),
  ending: null,
};

const CHAPTERS: Chapter[] = [
  {
    id: 0,
    number: "01",
    title: "被修准的孩子",
    file: "事故母带 / PASS 01",
    objective: "比较乔岚保留的练习、修正版与正式混音，找出童年陈默没有被修音前的回应特征。",
    input: "乔岚练习带 + 后期修正版 + 正式混音",
    artifact: "线索 1/7 · 声纹锚：先吸气，晚 0.7 秒，结尾偏低",
    nextUse: "不用辨认音高；下一章只寻找同样的吸气、延迟与下降轮廓。",
    threadClue: "那不是唱错，而是乔岚故意保留的身份暗号。",
    horror: "本地刚写入声纹锚，远端便把相同位置重新标成“呼吸噪声”。",
    fact: "童年陈默的第七码有三个稳定特征：先吸气、晚 0.7 秒、结尾偏低；正式混音删除了整段回应。",
    monologue:
      "她从没让我把它唱准。那一点迟疑和偏低，原来不是错误，是她给我的名字。可我刚把名字写回来，另一个人就认出了它。",
    transcript: [
      "乔岚：小默，你又把最后一个音唱低了。",
      "陈默（童声）：要重来吗？",
      "乔岚：不重来。错得这么认真，删掉多可惜。",
    ],
    duration: "00:18.042",
  },
  {
    id: 1,
    number: "02",
    title: "回答来自门外",
    file: "事故母带 / PASS 02",
    objective: "把声纹锚分别套进 B 棚、控制室与走廊话筒，确认事故当晚是谁回应、回应发生在哪里。",
    input: "PASS 01：陈默声纹锚",
    artifact: "线索 2/7 · 方位钉：童声回应来自 B 棚外的走廊",
    nextUse: "下一章以走廊回应为时间钉，判断其前后哪句话不可能成立。",
    threadClue: "记忆里我没有回答；母带却说，我已经站在门外回答过。",
    horror: "远端立即把走廊话筒改名为“空轨”，像是在等你找到它。",
    fact: "六次门后敲击之后，童年陈默确实唱回了第七码；声音来自 B 棚外的走廊。",
    monologue:
      "我一直记得自己没有回答。可那口吸气、迟到的半拍和向下落的尾音都在走廊里。母带比我更确定我当时站在哪里。",
    transcript: [
      "［B 棚内：六次敲击，回应为空］",
      "［控制室：机架低频，没有童声］",
      "［走廊：吸气；0.7 秒后出现偏低回应］",
    ],
    duration: "00:31.800",
  },
  {
    id: 2,
    number: "03",
    title: "回答之后的谎话",
    file: "事故母带 / PASS 03",
    objective: "以走廊回应为时间钉，恢复被音乐覆盖的四段声音，找出谁在回应之后仍假装孩子不在现场。",
    input: "PASS 02：走廊回应的方位与声纹",
    artifact: "线索 3/7 · 时间钉：童声先回应，陈渡随后说“她还在里面”",
    nextUse: "下一章检查官方听证为何把回应、孩子名字和这句话之间的边界一起切走。",
    threadClue: "陈渡听见了门外的回答，却在正式记录里从未承认孩子到过现场。",
    horror: "四句话复原后，监听者 02 第一次发来一句完整批注：“那个孩子，没有登记。”",
    fact: "顺序是开门要求、六分钟拖延、童声回应、陈渡反驳；陈渡当时知道陈默就在门外。",
    monologue:
      "父亲不是听不见我。他听见以后，才喊她还在里面。那句话救不了乔岚，却证明他知道门外还有一个不该出现的孩子。",
    transcript: [
      "声音 A：把 B 棚打开，母带归我。",
      "声音 B：先别开门，导出还差六分钟。",
      "陈默（童声）：一、二、三、四、五、六……［偏低回应］",
      "陈渡：她还在里面！",
    ],
    duration: "01:06.214",
  },
  {
    id: 3,
    number: "04",
    title: "每一次都删掉小默",
    file: "事故母带 / PASS 04",
    objective: "把事故原轨与听证副本逐窗比对，判断剪辑者反复删除的究竟是噪声、责任，还是同一个孩子。",
    input: "PASS 03：回应—反驳时间钉",
    artifact: "线索 4/7 · 删除规则：童声、名字与第七码被同窗切除",
    nextUse: "用这组三联删除痕迹，检查发行作品里是否反而保留了被删素材。",
    threadClue: "官方记录不是剪掉一段事故，而是在所有位置系统性删掉“陈默存在过”。",
    horror: "放大第三个剪口时，远端游标先于你 0.7 秒停在同一位置。",
    fact: "官方听证副本连续三次删掉陈默：吸气与回应、陈渡喊出的“小默”、走廊脚步。",
    monologue:
      "这不是替谁调换一句话。剪辑者在每个能证明我来过的地方都下了一刀。父亲留下真相时，先把自己的孩子从真相里拿走了。",
    transcript: [
      "听证副本：［童声窗口已平滑］",
      "听证副本：［“小默”所在窗口已平滑］",
      "听证副本：［走廊脚步窗口已平滑］",
      "事故原轨：别听。小默，跟爸爸出去。",
    ],
    duration: "00:44.920",
  },
  {
    id: 4,
    number: "05",
    title: "获奖作品里的火场",
    file: "事故母带 / PASS 05",
    objective: "按声纹锚还原获奖作品，再检查尾部六次打击；确认唐肃使用的是重演素材还是事故原轨。",
    input: "PASS 01 声纹锚 + PASS 02 走廊方位 + PASS 04 删除规则",
    artifact: "线索 5/7 · 母带持有者：唐肃把回应与门后敲击做进作品",
    nextUse: "作品需要六分钟导出；下一章用这个动机回查警报为何提前安静。",
    threadClue: "在公开记录里被删掉的孩子，却被留在唐肃最著名的作品里。",
    horror: "第六下门板摩擦声在发行版中被循环了四十四次，掌声正好盖住原始求救。",
    fact: "获奖作品直接使用事故母带：乔岚旋律、陈默的偏低回应和红门后的六次敲击都在其中。",
    monologue:
      "他没有把求救误听成节拍。他先听懂，才知道怎样把它放进歌里。那些年所有人跟着鼓点点头，没人知道每一下都来自同一扇打不开的门。",
    transcript: [
      "乔岚工作备注：第七码保留小默的音高。不要修，不要替换。",
      "监听者 02：这是节拍，不是求救。",
    ],
    duration: "00:52.470",
  },
  {
    id: 5,
    number: "06",
    title: "父亲制造的两次静音",
    file: "事故母带 / PASS 06",
    objective: "沿作品导出的六分钟窗口回查控制轨，再比较父亲留下的完整口述与远端清理版，区分两次静音。",
    input: "PASS 05：事故母带正在进行六分钟导出",
    artifact: "线索 6/7 · 双重责任：陈渡先关警报，事后又删去孩子",
    nextUse: "下一章把两次删除手法与当前远端操作比较，寻找同一把编辑密钥。",
    threadClue: "父亲救出了我，也亲手制造了让火灾无人察觉、让我从记录消失的两次安静。",
    horror: "远端清理版只保留父亲救人的声音；它正在邀请你替他完成第二次删除。",
    fact: "22:50 陈渡旁路警报；事故后他又删除陈默声轨。他救了孩子，却不能因此删除自己的责任。",
    monologue:
      "父亲第一次按下静音，是因为服从；第二次，是因为害怕。救我是真的，关掉警报也是真的。任何一个更干净的版本，都只是在替他再按一次。",
    transcript: [
      "陈渡：唐老师说只关四十分钟。",
      "陈渡：我知道流程不允许。我还是按了。",
      "陈渡：我把小默那一轨删了。因为他当时也在现场。",
      "远端文件：06_CLEAN_FATHER.wav",
    ],
    duration: "00:40.000",
  },
  {
    id: 6,
    number: "07",
    title: "正在重复的删除",
    file: "事故母带 / PASS 07",
    objective: "用前六条线索恢复事故链，再比对本次会话的七次远端删改，确定监听者 02 掌握了什么。",
    input: "PASS 01—06：六条童声与删除证据",
    artifact: "线索 7/7 · 当前威胁：监听者 02 持有 TS_MASTER 并重复旧删除规则",
    nextUse: "终章回答三件事：谁回答过、谁删过、谁现在仍在删除。",
    threadClue: "十四年前删掉我的人，或继承其密钥的人，此刻一直和我同时听。",
    horror: "第七段恢复后，远端不再覆盖文件，只在第七码位置留下一个等待输入的空游标。",
    fact: "事故链与当前删改完全对应；监听者 02 使用唐肃的旧主密钥，正在按历史顺序再次删除证据。",
    monologue:
      "我不是在独自修复旧录音。我每找回一部分，对方就准确地删同一部分。那不是鬼知道真相，是有人从十四年前开始，就从未停止监听。",
    transcript: [
      "唐肃：锁上 B 棚。她拿不到母带，就签不了。",
      "陈渡：机架冒烟了，断总闸！",
      "唐肃：文件没写完。谁都别动电源。",
      "［B 棚红门传来六次敲击］",
      "陈默（童声）：最后一下该我唱。［走廊偏低回应］",
      "陈渡：别听。跟爸爸出去。",
      "［23:16:01，陈渡返回；远处安全门关闭］",
      "［当前会话：TS_MASTER 在每次恢复后 0.7 秒写入］",
    ],
    duration: "02:17.700",
  },
];

const HINTS: string[][] = [
  [
    "不要猜哪个音更好听；找乔岚明确要求“不要修”的那个版本。",
    "原始回应有三项同时出现的特征：先吸气、比前六拍晚 0.7 秒、尾音向下。",
    "正确操作：选择“吸气后迟到、结尾偏低”的声纹卡。",
  ],
  [
    "三个话筒都会听见六次敲击，但只有一个位置会出现上一章的三项声纹特征。",
    "B 棚话筒只剩门板声，控制室没有童声；走廊话筒在 0.7 秒后出现吸气和下降尾音。",
    "正确位置：B 棚外的走廊话筒。",
  ],
  [
    "把走廊里的童声回应当作不能移动的时间钉，其余句子按问答关系放到它前后。",
    "乔岚先要求开门，唐肃用六分钟拒绝；六次敲击与童声回应之后，陈渡才喊“她还在里面”。",
    "正确顺序：开门要求 → 六分钟拖延 → 敲击与童声回应 → 陈渡反驳。",
  ],
  [
    "三个剪口不在替某个成年人换身份；检查每个剪口之后共同少了什么。",
    "原轨保留童声吸气与低音、陈渡喊“小默”、走廊脚步；听证副本三处都没有。",
    "正确判断：剪辑者系统性删除孩子的声纹、名字与行动痕迹。",
  ],
  [
    "先让发行版回到原始速度和高度，再使用第一章声纹锚与第二章门板尾声确认来源。",
    "0.82×、-3 半音时双重起音消失；只有 B 棚红门样本具有相同六次间距和第六下拖擦。",
    "正确操作：0.82×、-3 半音、B 棚红门。",
  ],
  [
    "第一种静音在控制轨上：找规律继电器第一次缺席。第二种静音在口述里：找清理版删除了什么。",
    "22:49 仍有三次轻响，22:50 第一次全空；完整口述保留陈渡承认旁路与删除孩子的责任。",
    "正确答案：22:50，并保留完整记录。",
  ],
  [
    "先按前六章的因果约束恢复事故链，再看当前七次远端操作是否精准命中同样的证据。",
    "锁门 → 断电要求 → 阻止断电 → 六次敲击 → 童声回应 → 带离孩子 → 安全门关闭；远端操作签名为 TS_MASTER。",
    "正确链为 1→7；当前监听者应选择“持有唐肃旧主密钥的人”。",
  ],
  [
    "终章不要求辨认音高，只需复用第一章建立的三项声纹锚。",
    "原始版本同时保留吸气、0.7 秒延迟和下降尾音。",
    "正确答案：选择“先吸气、晚 0.7 秒、尾音偏低”。",
  ],
];

const SYNC_EVENTS = [
  {
    title: "旧同步节点已连接",
    detail: "监听者 02：未命名",
    tone: "warning",
  },
  {
    title: "声纹标记遭覆盖",
    detail: "CHILD_ANCHOR → BREATH_NOISE",
    tone: "danger",
  },
  {
    title: "走廊轨遭重命名",
    detail: "CORRIDOR_L → EMPTY / 空轨",
    tone: "danger",
  },
  {
    title: "童声时间钉被移动",
    detail: "RESPONSE +00.7 → UNPLACED",
    tone: "danger",
  },
  {
    title: "三道剪口被关闭",
    detail: "编辑签名：TS_MASTER",
    tone: "danger",
  },
  {
    title: "母带来源被改标",
    detail: "“这是重演，不是现场。”",
    tone: "danger",
  },
  {
    title: "双重责任被清理",
    detail: "上传：06_CLEAN_FATHER.wav",
    tone: "danger",
  },
  {
    title: "删除指纹完全匹配",
    detail: "当前会话与 2012 编辑签名：7 / 7",
    tone: "danger",
  },
];

const REMOTE_ALERTS = [
  {
    level: "low",
    label: "声纹被重标",
    detail: "你刚恢复的三项特征被远端标记为“呼吸噪声”。",
  },
  {
    level: "low",
    label: "走廊轨改名",
    detail: "CORRIDOR_L 正在被改成 EMPTY；写入发生在你试听后 0.7 秒。",
  },
  {
    level: "medium",
    label: "童声时间钉被移动",
    detail: "回应位置被远端拖出事故时间线；本地锁保留了原点。",
  },
  {
    level: "medium",
    label: "剪口正在关闭",
    detail: "你放大的三个孩子窗口被同一游标逐一抹平。",
  },
  {
    level: "medium",
    label: "来源被改写",
    detail: "发行版中的门板尾声被强制标记为“棚内重演”。",
  },
  {
    level: "high",
    label: "清理版本覆盖",
    detail: "远端版本同时删除警报旁路和陈渡承认删除孩子的口述。",
  },
  {
    level: "high",
    label: "旧主密钥在线",
    detail: "当前七次删改全部由 TS_MASTER 签名；本地写入锁已阻止覆盖。",
  },
] as const;

const VOICE_PROFILES: Record<
  VoiceId,
  {
    label: string;
    tone: string;
  }
> = {
  qiao: {
    label: "乔岚",
    tone: "克制、带一点笑意",
  },
  tang: {
    label: "唐肃",
    tone: "冷静，刻意压住急促",
  },
  chen: {
    label: "陈渡",
    tone: "疲惫，呼吸不稳",
  },
  child: {
    label: "陈默（童声）",
    tone: "迟疑，句首先吸气",
  },
  listener: {
    label: "监听者 02",
    tone: "贴近耳边，没有起伏",
  },
};

const VOICE_CLIPS: Record<
  string,
  { id: string; duration: number }
> = {
  "chen|十四年前，乔岚在门后敲了六下。你一直说自己没有回答。我把事故母带拆成七层，因为完整的一份还会被同一把密钥删掉。不要先相信记忆。先找回那个被我们一起拿走的第七码。": {
    id: "father-note",
    duration: 18504,
  },
  "listener|你不记得这个音。为什么还要把它放回去？": {
    id: "listener-01",
    duration: 5856,
  },
  "listener|房间会留下回声。记忆不会。": {
    id: "listener-02",
    duration: 4776,
  },
  "listener|那个孩子，没有登记。": {
    id: "listener-03",
    duration: 3744,
  },
  "listener|名字放错了而已。你已经得到想要的答案。": {
    id: "listener-04",
    duration: 5808,
  },
  "listener|这是节拍。不是求救。": {
    id: "listener-05",
    duration: 3960,
  },
  "listener|你真的要保留，他做错的那一部分？": {
    id: "listener-06",
    duration: 4896,
  },
  "listener|最后一段，不要播放。": {
    id: "listener-07",
    duration: 3504,
  },
  "listener|你确定，要让他们听见全部吗，陈默？": {
    id: "listener-final",
    duration: 5664,
  },
  "listener|七拍都在。你确定，听见的人只有他们吗？": {
    id: "ending-complete",
    duration: 6192,
  },
  "child|爸爸……为什么又把我删掉了？": {
    id: "ending-clean",
    duration: 3576,
  },
  "listener|你没有发布。没关系。我已经替你保存了。": {
    id: "ending-sealed",
    duration: 6624,
  },
  "qiao|小默，你又把最后一个音唱低了。": {
    id: "qiao-low-note",
    duration: 3480,
  },
  "child|要重来吗？": { id: "child-retry", duration: 1992 },
  "qiao|不重来。错得这么认真，删掉多可惜。": {
    id: "qiao-keep-mistake",
    duration: 4824,
  },
  "qiao|再来一次。最后一下，等你唱。": {
    id: "qiao-wait-song",
    duration: 4104,
  },
  "qiao|隔着玻璃听不见。我敲前六下。": {
    id: "qiao-six-knocks",
    duration: 4008,
  },
  "child|最后一下，我唱吗？": {
    id: "child-last-note",
    duration: 2904,
  },
  "qiao|对。这样我就知道，你还听得见。": {
    id: "qiao-still-hear",
    duration: 4080,
  },
  "qiao|把 B 棚打开，母带归我。": {
    id: "qiao-open-studio",
    duration: 3048,
  },
  "tang|先别开门。导出，还差六分钟。": {
    id: "tang-wait-export",
    duration: 4368,
  },
  "qiao|先别开门。导出，还差六分钟。": {
    id: "qiao-wait-export",
    duration: 4368,
  },
  "chen|先别开门。导出，还差六分钟。": {
    id: "chen-wait-export",
    duration: 4512,
  },
  "chen|她还在里面！": { id: "chen-she-inside", duration: 1896 },
  "child|一、二、三、四、五、六……": {
    id: "child-count-six",
    duration: 4968,
  },
  "qiao|第七码，保留小默原来的音高。不要修。": {
    id: "qiao-keep-pitch",
    duration: 4944,
  },
  "listener|唐肃锁住了门。其他内容，与事故无关。": {
    id: "listener-clean-story",
    duration: 6240,
  },
  "chen|唐老师说，只关四十分钟。": {
    id: "chen-forty-minutes",
    duration: 3504,
  },
  "chen|我知道流程不允许……我还是按了。": {
    id: "chen-bypass",
    duration: 4032,
  },
  "chen|我把小默那一轨删了。不是为了唐肃……是因为他当时也在现场。": {
    id: "chen-erased-child",
    duration: 6480,
  },
  "tang|锁上 B 棚。她拿不到母带，就会签。": {
    id: "tang-lock-studio",
    duration: 4776,
  },
  "chen|机架冒烟了！断总闸！": {
    id: "chen-cut-power",
    duration: 3528,
  },
  "tang|文件没写完。谁都别动电源。": {
    id: "tang-do-not-cut",
    duration: 4056,
  },
  "child|最后一下……该我唱。": {
    id: "child-my-turn",
    duration: 2952,
  },
  "chen|别听。小默，跟爸爸出去。": {
    id: "chen-follow-dad",
    duration: 4152,
  },
  "chen|别回头。": { id: "chen-dont-look", duration: 1752 },
  "qiao|小默，这个音低了一点。别重唱。": {
    id: "qiao-dont-retake",
    duration: 4368,
  },
  "qiao|七拍都在，我们就知道，对方还听得见。": {
    id: "qiao-seven-present",
    duration: 4320,
  },
};

function getVoiceClip(voice: VoiceId, text: string) {
  return VOICE_CLIPS[`${voice}|${text}`];
}

function getPlaybackVoiceClipIds(stage: number, option: string) {
  const clips: Array<[VoiceId, string]> = [];
  const add = (...entries: Array<[VoiceId, string]>) => clips.push(...entries);

  if (option === "father-note") {
    add([
      "chen",
      "十四年前，乔岚在门后敲了六下。你一直说自己没有回答。我把事故母带拆成七层，因为完整的一份还会被同一把密钥删掉。不要先相信记忆。先找回那个被我们一起拿走的第七码。",
    ]);
  } else if (option.startsWith("listener:")) {
    const chapter = Number(option.slice(9));
    add([
      "listener",
      LISTENER_VOICE_LINES[chapter] ?? "你不该继续听。",
    ]);
  } else if (option === "listener-final") {
    add(["listener", "你确定，要让他们听见全部吗，陈默？"]);
  } else if (option.startsWith("ending:")) {
    const ending = option.slice(7) as EndingId;
    if (ending === "complete") {
      add(["listener", "七拍都在。你确定，听见的人只有他们吗？"]);
    } else if (ending === "clean") {
      add(["child", "爸爸……为什么又把我删掉了？"]);
    } else {
      add(["listener", "你没有发布。没关系。我已经替你保存了。"]);
    }
  } else if (option === "story") {
    if (stage === 0) {
      add(
        ["qiao", "小默，你又把最后一个音唱低了。"],
        ["child", "要重来吗？"],
        ["qiao", "不重来。错得这么认真，删掉多可惜。"],
        ["qiao", "再来一次。最后一下，等你唱。"],
      );
    } else if (stage === 1) {
      add(
        ["qiao", "隔着玻璃听不见。我敲前六下。"],
        ["child", "最后一下，我唱吗？"],
        ["qiao", "对。这样我就知道，你还听得见。"],
      );
    } else if (stage === 4) {
      add(
        ["qiao", "第七码，保留小默原来的音高。不要修。"],
        ["listener", "这是节拍。不是求救。"],
      );
    }
  } else if (stage === 2 && option === "right") {
    add(
      ["qiao", "把 B 棚打开，母带归我。"],
      ["tang", "先别开门。导出，还差六分钟。"],
      ["child", "一、二、三、四、五、六……"],
      ["chen", "她还在里面！"],
    );
  } else if (stage === 3) {
    if (option === "raw:tang") {
      add(["tang", "先别开门。导出，还差六分钟。"]);
    } else if (option === "raw:chen") {
      add(["chen", "别听。小默，跟爸爸出去。"]);
    } else {
      add(
        ["tang", "先别开门。导出，还差六分钟。"],
        ["chen", "她还在里面！"],
      );
    }
  } else if (stage === 5 && option === "record:clean") {
    add(["listener", "唐肃锁住了门。其他内容，与事故无关。"]);
  } else if (stage === 5 && !parseRelayPlayback(option)) {
    add(
      ["chen", "唐老师说，只关四十分钟。"],
      ["chen", "我知道流程不允许……我还是按了。"],
      [
        "chen",
        "我把小默那一轨删了。不是为了唐肃……是因为他当时也在现场。",
      ],
    );
  } else if (stage === 6 && option.startsWith("fragment:")) {
    const fragmentVoices: Record<number, [VoiceId, string]> = {
      1: ["tang", "锁上 B 棚。她拿不到母带，就会签。"],
      2: ["chen", "机架冒烟了！断总闸！"],
      3: ["tang", "文件没写完。谁都别动电源。"],
      5: ["child", "最后一下……该我唱。"],
      6: ["chen", "别听。小默，跟爸爸出去。"],
      7: ["chen", "别回头。"],
    };
    if (fragmentVoices[Number(option.slice(9))]) {
      add(fragmentVoices[Number(option.slice(9))]);
    }
  } else if (stage === 6 && option !== "phase:off") {
    add(["child", "最后一下……该我唱。"]);
  } else if (stage === 7 && !option.startsWith("note:")) {
    add(
      ["qiao", "小默，这个音低了一点。别重唱。"],
      ["qiao", "七拍都在，我们就知道，对方还听得见。"],
    );
  }

  return clips.flatMap(([voice, text]) => {
    const clip = getVoiceClip(voice, text);
    return clip ? [clip.id] : [];
  });
}

const LISTENER_VOICE_LINES = [
  "你不记得这个音。为什么还要把它放回去？",
  "房间会留下回声。记忆不会。",
  "那个孩子，没有登记。",
  "名字放错了而已。你已经得到想要的答案。",
  "这是节拍。不是求救。",
  "你真的要保留，他做错的那一部分？",
  "最后一段，不要播放。",
];

const FINAL_CHAIN_STEPS = [
  {
    id: "child",
    label: "01 / 谁回答过",
    question: "十四年前缺失的第七码，究竟有没有被唱出来？",
    source: "PASS 01—04 · 声纹锚 + 走廊方位 + 回应时间钉 + 三联删除",
    evidence:
      "相同的吸气、0.7 秒延迟和下降尾音只出现在走廊话筒；它发生在六次敲击后、陈渡反驳前，并在听证副本中与“小默”和脚步一起被删除。",
    wrong:
      "缺失只存在于官方副本。事故原轨、走廊方位和三联剪口共同证明回应真实发生过。",
    choices: [
      {
        id: "child",
        text: "陈默在 B 棚外回答过；后来被删掉的是记录和记忆中的证据",
        correct: true,
      },
      {
        id: "silent",
        text: "陈默当晚没有回答，走廊声音只是后期串轨",
        correct: false,
      },
    ],
  },
  {
    id: "responsibility",
    label: "02 / 谁删过",
    question: "唐肃与陈渡分别制造了哪一部分灾难？",
    source: "PASS 05—07 · 事故母带入歌 + 两次静音 + 完整事故链",
    evidence:
      "唐肃为夺取母带锁门并阻止断电；陈渡没有锁人，还救出陈默，但他先旁路警报，事后又删除孩子声轨并沉默十四年。",
    wrong:
      "救人、旁路、删轨与锁门分别由不同证据支持；不能用一个善意结果抵消此前和此后的具体行为。",
    choices: [
      {
        id: "responsibility",
        text: "唐肃负直接责任；陈渡不是主谋，但对警报旁路与事后删轨负责",
        correct: true,
      },
      {
        id: "single",
        text: "所有责任都属于唐肃，陈渡救人后应从记录中完全删除",
        correct: false,
      },
    ],
  },
  {
    id: "listener",
    label: "03 / 谁仍在删除",
    question: "监听者 02 与十四年前的剪辑者有什么关系？",
    source: "PASS 01—07 · 七次实时覆写 + 删除指纹 + TS_MASTER",
    evidence:
      "当前会话每次都在关键线索恢复后 0.7 秒命中同一位置，删改目标与历史剪口 7/7 对应；签名来自唐肃旧主密钥 TS_MASTER。",
    wrong:
      "普通降噪不知道孩子名字、走廊方位和旧剪口顺序。能够精准重复删除的人至少继承了唐肃的编辑权限。",
    choices: [
      {
        id: "listener",
        text: "对方持有唐肃旧主密钥；身份未知，但当前删改是有目的的继续掩盖",
        correct: true,
      },
      {
        id: "ghost",
        text: "监听者只是系统自动恢复出来的无意识残响",
        correct: false,
      },
    ],
  },
] as const;

const ENDINGS: Record<
  EndingId,
  {
    label: string;
    kicker: string;
    body: string[];
    final: string;
    anomaly: {
      code: string;
      title: string;
      detail: string;
      action: string;
      transcript: string;
    };
  }
> = {
  complete: {
    label: "完整母带",
    kicker: "公开全部工程，包括父亲关闭警报的操作。",
    body: [
      "公开校验副本已经生成。六次敲击、走廊回应、乔岚署名与事故母带被放回同一份记录。",
      "陈渡不再承担唯一责任，也没有被塑造成英雄。警报旁路与事后删除孩子的口述均被保留。",
      "监听者 02 已断开。0.7 秒后，TS_MASTER 再次读取童声回应；节点仍拒绝显示名称。",
    ],
    final:
      "我以为公开意味着结束。可真正可怕的不是终于有人听见，而是十四年前就有人知道每一拍，却一直在等我亲手把门重新打开。",
    anomaly: {
      code: "UNREGISTERED READ / TS_MASTER",
      title: "已断开的监听者仍在读取 07_ROOM。",
      detail:
        "读取位置停在第六次敲击之后，没有继续播放第七拍。对方像是在等待你完成暗号。",
      action: "试听读取节点留下的人声",
      transcript: "七拍都在。你确定，听见的人只有他们吗？",
    },
  },
  clean: {
    label: "干净版本",
    kicker: "删除警报旁路记录，只公开唐肃锁门的证据。",
    body: [
      "陈渡在新的叙述里获得彻底平反。警报旁路、事后删轨与童声回应一起从导出版本删除。",
      "监听者 02 接受了这个版本，并把同步冲突改成“已解决”。发布波形恢复整齐。",
      "校验完成后，导出文件尾部仍多出 1.8 秒儿童声纹；它不在你选择保留的任何轨道上。",
    ],
    final:
      "我终于得到了想要的父亲。然后我听见童年的自己问，为什么每个大人都能用“保护”这个词，把同一个孩子删掉两次。",
    anomaly: {
      code: "CLEAN EXPORT / +00:01.800",
      title: "干净版本里仍有一个被删除的孩子。",
      detail:
        "声纹与第 03 章的儿童声音一致。系统无法判断它来自缓存、记忆回放，还是一次未提交的恢复。",
      action: "试听导出尾部的 1.8 秒",
      transcript: "爸爸……为什么又把我删掉了？",
    },
  },
  sealed: {
    label: "未发布工程",
    kicker: "保留完整副本，但不向公众发布。",
    body: [
      "乔岚的家属收到私人校验副本。公开发布队列已经取消，外部记录没有变化。",
      "工程切换为只读封存。系统询问：听见以后保持沉默，和从未听见一样吗？",
      "封存锁落下前 0.2 秒，TS_MASTER 完成了一次完整下载。接收者仍显示“监听者 02”。",
    ],
    final:
      "父亲把决定留给我，是因为他不敢做。我把决定留给以后。可工程里从来不只有我一个人在决定，沉默也从来不是把门关上。",
    anomaly: {
      code: "SEALED SESSION / REMOTE COPY COMPLETE",
      title: "你没有发布，但完整工程已经离开封存区。",
      detail:
        "远端副本包含七段录音、事实链和你的发布选择。节点只留下了一句未写入工程的口述。",
      action: "试听远端节点最后的口述",
      transcript: "你没有发布。没关系。我已经替你保存了。",
    },
  },
};

const RELAY_TRACK_LABELS: Record<string, string> = {
  room: "ROOM 房间轨",
  piano: "PIANO 钢琴轨",
  control: "CONTROL 控制轨",
};

const STORY_TRACKS: Record<
  number,
  { label: string; detail: string }
> = {
  0: {
    label: "童年练习对白",
    detail: "乔岚与童年陈默的对话已从三次演奏中分离。",
  },
  1: {
    label: "玻璃后的约定",
    detail: "六次敲击保留在证据轨，对话改为独立播放。",
  },
  4: {
    label: "草稿备注与监听者",
    detail: "工作备注和监听者干扰均不再混入旋律比对。",
  },
};

function parseRelayPlayback(option: string) {
  const tracked = option.match(
    /^time:(room|piano|control)@(\d{2}:\d{2})$/,
  );
  if (tracked) {
    return { track: tracked[1], time: tracked[2] };
  }
  const legacy = option.match(/^time:(\d{2}:\d{2})$/);
  return legacy ? { track: "control", time: legacy[1] } : null;
}

function describePlayback(stage: number, option = "default") {
  if (option === "story") {
    return `独立对白：${STORY_TRACKS[stage]?.label ?? "本章剧情"}`;
  }
  if (stage === 0) {
    return {
      "take-a": "原始练习：吸气后迟到 0.7 秒的偏低回应",
      "take-b": "后期修正版：回应被拉到准点并修平",
      final: "正式混音：整段回应被删除",
    }[option] ?? "正式混音：整段回应被删除";
  }
  if (stage === 1) {
    return {
      "room:booth": "B 棚室内：六次近距离敲击，回应为空",
      "room:control": "控制室：远距离敲击与机架低频",
      "room:corridor": "走廊：六次敲击后出现陈默声纹锚",
    }[option] ?? "事故母带：三话筒方位比对";
  }
  if (stage === 2) {
    return {
      mix: "中央混音：音乐覆盖了对话",
      left: "左声道：旋律与机房低频",
      right: "右声道：四句被隐藏的固定修复对白",
    }[option] ?? "中央混音：音乐覆盖了对话";
  }
  if (stage === 3) {
    if (option === "seam") return "剪口监听：童声、名字与走廊动作三窗缺席";
    if (option === "raw:tang") return "剪口前语境：成年人对白完整保留";
    if (option === "raw:chen") return "事故原轨：补回童声、“小默”与脚步";
    if (option.startsWith("speaker:")) {
      return `说话人参考：${option.slice(8).toUpperCase()}`;
    }
    return "官方听证副本：孩子存在过的痕迹被连续切除";
  }
  if (stage === 4) {
    if (option === "source") return "乔岚草稿：原始七音短句";
    if (option === "released") return "发行版本：加速升调，并混入门板敲击";
    if (option.startsWith("sample:")) {
      return `瞬态参考：${option.slice(7).toUpperCase()}`;
    }
    return "双轨对齐试听：左为草稿，右为当前修复参数";
  }
  if (stage === 5) {
    const relayPlayback = parseRelayPlayback(option);
    if (relayPlayback) {
      return `${RELAY_TRACK_LABELS[relayPlayback.track]}：${relayPlayback.time} 时间窗`;
    }
    return option === "record:clean"
      ? "清理版本：父亲的旁路操作被删除"
      : "完整记录：保留旁路操作与陈渡证词";
  }
  if (stage === 6) {
    if (option.startsWith("fragment:")) {
      const segment = Number(option.slice(9));
      return `房间声：${FRAGMENT_META[segment]?.label ?? "未知片段"}`;
    }
    return option === "phase:off"
      ? "反相关闭：表面音乐仍覆盖房间声"
      : "反相开启：只剩敲击、低频与儿童声音";
  }
  return option.startsWith("note:")
    ? `第七码候选：${option.slice(5).toUpperCase()}`
    : "完整七音已恢复";
}

function getReviewPlaybackOption(stage: number) {
  return [
    "take-a",
    "room:corridor",
    "right",
    "seam",
    "compare:0.82:-3",
    "record:full",
    "phase:on",
  ][stage] ?? "default";
}

function getPlaybackWaveformSeed(stage: number, option: string) {
  let hash = stage * 97 + 17;
  for (let index = 0; index < option.length; index += 1) {
    hash = (hash * 31 + option.charCodeAt(index)) % 9973;
  }
  return hash;
}

function describePlaybackKind(stage: number, option = "default") {
  if (option === "story") return "独立剧情对白";
  if (
    option === "father-note" ||
    option === "listener-final" ||
    option.startsWith("listener:") ||
    option.startsWith("ending:") ||
    option.startsWith("speaker:") ||
    option.startsWith("raw:") ||
    option === "seam" ||
    option.startsWith("record:") ||
    (stage === 2 && option === "right") ||
    (stage === 6 &&
      option.startsWith("fragment:") &&
      option !== "fragment:4")
  ) {
    return "人物对白";
  }
  if (
    option.startsWith("room:") ||
    option.startsWith("sample:") ||
    option.startsWith("time:")
  ) {
    return "环境样本";
  }
  if (
    option.startsWith("compare:") ||
    option.startsWith("phase:") ||
    option.startsWith("note:")
  ) {
    return "处理预听";
  }
  return "证据音轨";
}

const GUIDE_CONTENT = [
  {
    question: "童年陈默没有被修音前，回应有什么稳定特征？",
    plain:
      "比较原始练习、修正版和正式混音。你要保存的是可重复寻找的声纹特征，不是判断哪个音更标准。",
    term: "声纹锚：由吸气、延迟和声音轮廓共同组成；后面只做匹配，不要求辨认绝对音高。",
    steps: [
      "试听乔岚保留的原始练习",
      "试听后期修准的版本",
      "试听正式混音的空白位置",
      "选择原始回应的三项组合特征",
      "提交声纹锚",
    ],
  },
  {
    question: "事故当晚，谁在什么位置唱回了第七码？",
    plain:
      "同一组六次敲击被三个话筒收进母带。逐一试听，只找上一章的吸气、0.7 秒延迟和下降尾音。",
    term: "方位差：同一声音进入不同话筒时远近、回声和左右位置会不同；文字辅助提供等价描述。",
    steps: [
      "试听 B 棚室内话筒",
      "试听控制室话筒",
      "试听走廊话筒",
      "选择出现陈默声纹锚的位置",
      "提交回应方位",
    ],
  },
  {
    question: "童声回应发生前后，哪句话暴露了父亲知道孩子在场？",
    plain:
      "先分离被音乐覆盖的右声道，再把走廊回应固定成时间钉。其余三句只能按命令、拒绝和反驳排列。",
    term: "时间钉：已由上一章确认、不能再任意移动的声音事件；其他残句必须围绕它恢复。",
    steps: [
      "试听中央混音",
      "试听左声道",
      "试听右声道",
      "按承接关系排列四段声音",
      "提交回答前后的完整顺序",
    ],
  },
  {
    question: "官方听证副本的三道剪口，共同删除了什么？",
    plain:
      "先试听听证副本，再放大三道剪口。原始片段会补回被删的童声、名字和走廊动作，你要判断剪辑规则。",
    term: "定向删除：多个剪口反复拿走同一对象的不同痕迹，说明目的不是缩短录音，而是让对象消失。",
    steps: [
      "试听官方听证副本",
      "放大三道剪口",
      "试听剪口前保留的事故语境",
      "试听原轨补回的孩子痕迹",
      "选择三道剪口共同针对的对象",
      "提交删除规则",
    ],
  },
  {
    question: "唐肃的获奖作品为什么能证明他持有事故原始母带？",
    plain:
      "先把发行版还原到事故母带的速度和高度，再同时检查陈默声纹锚与 B 棚门板第六下的拖擦尾声。",
    term: "双重来源钉：旋律可能被重演；只有人物声纹和现场门板尾声同时一致，才能证明使用原始母带。",
    steps: [
      "试听事故母带中的七拍原轨",
      "试听发行版本",
      "选择一个速度并听双轨对比",
      "选择一个移调值并再次对比",
      "选择与发行版六次打击同源的现场材料",
      "提交母带来源判断",
    ],
  },
  {
    question: "父亲制造的两次静音，分别隐藏了什么？",
    plain:
      "先借六分钟导出窗口找到警报第一次缺席的时刻，再比较完整口述与远端清理版。两次静音都必须保留。",
    term: "双重责任：救人不抵消先前的违规操作；保护孩子也不能成为删除记录的理由。",
    steps: [
      "试听 23:11，确认事故对话中警报已经缺席",
      "回查 22:49，建立此前的正常规律",
      "试听 22:50，找到第一次缺席",
      "选择继电器开始消失的时间",
      "试听包含两次静音责任的完整口述",
      "试听只保留救人结果的远端清理版",
      "选择能同时保留救人与责任的版本",
      "提交双重责任判断",
    ],
  },
  {
    question: "为什么监听者 02 能精准删除你刚恢复的每一条线索？",
    plain:
      "先用前六章成果恢复事故链，再比对本次会话的七次远端删改。只有持有旧主密钥的人知道全部剪口。",
    term: "删除指纹：删改目标、顺序与时间都一致时，比显示名称更能证明两个会话来自同一套权限。",
    steps: [
      "试听仍被发行音乐覆盖的事故原轨",
      "抵消发行音乐，恢复七段现场声",
      "逐个试听七段现场声及其前章约束",
      "按因果关系写入完整事故链",
      "检查当前删改与历史剪口的对应关系",
      "选择监听者 02 掌握的权限",
      "提交事故链与当前威胁",
    ],
  },
];

type ObservationRole = "primary" | "support" | "observation";

type Observation = {
  id: string;
  title: string;
  detail: string;
  role: ObservationRole;
};

const FRAGMENT_META: Record<
  number,
  {
    label: string;
    transcript: string;
    sound: string;
    constraint: string;
  }
> = {
  1: {
    label: "锁门命令",
    transcript: "锁上 B 棚。她拿不到母带，就会签。",
    sound: "门禁落锁",
    constraint: "PASS 05：盗用动机解释为什么先锁门夺取母带",
  },
  2: {
    label: "断电要求",
    transcript: "机架冒烟了！断总闸！",
    sound: "机架电流声变尖",
    constraint: "PASS 06：警报已缺席，机架过热后只能主动断电",
  },
  3: {
    label: "导出阻止",
    transcript: "文件没写完。谁都别动电源。",
    sound: "回应上一句断电要求",
    constraint: "PASS 03：六分钟导出尚未完成，因此回应断电要求",
  },
  4: {
    label: "六次敲击",
    transcript: "［门后传来六次敲击］",
    sound: "第六下后留下 0.7 秒回应窗",
    constraint: "PASS 02：走廊话筒证明回应来自门外",
  },
  5: {
    label: "走廊回应",
    transcript: "最后一下……该我唱。［偏低回应］",
    sound: "先吸气，迟到 0.7 秒，尾音下降",
    constraint: "PASS 01—03：陈默声纹锚与回应时间钉同时命中",
  },
  6: {
    label: "带离孩子",
    transcript: "别听。小默，跟爸爸出去。",
    sound: "脚步转向走廊",
    constraint: "PASS 03—04：陈渡知道孩子在场，随后把他带离",
  },
  7: {
    label: "安全门关闭",
    transcript: "别回头。",
    sound: "安全门随后关闭",
    constraint: "声音后果：脚步进入走廊后，安全门才会关闭",
  },
};

const OBSERVATION_LIBRARY: Array<
  Record<string, Omit<Observation, "id">>
> = [
  {
    "take-a": {
      title: "原始练习 / 未修声纹",
      detail: "第七码前有短促吸气，比前六拍的间隔晚 0.7 秒，尾音向下。",
      role: "primary",
    },
    "take-b": {
      title: "后期修正版 / 三项变化",
      detail: "吸气被抹除，回应被拉到准点，尾音被修成平直；人物特征同时消失。",
      role: "support",
    },
    final: {
      title: "正式混音 / 整窗删除",
      detail: "从吸气开始到尾音结束的整段被静音，不是单独删掉一个音符。",
      role: "observation",
    },
    "signature:anchor": {
      title: "陈默声纹锚 / 三项同时成立",
      detail: "先吸气、晚 0.7 秒、尾音向下；后续必须同时匹配三项，不能只凭音色猜人。",
      role: "primary",
    },
  },
  {
    "room:booth": {
      title: "B 棚室内话筒",
      detail: "六次门板声很近；回应位置只有门体余振，没有童声吸气。",
      role: "observation",
    },
    "room:control": {
      title: "控制室话筒",
      detail: "敲击在远处，回应位置只有机架低频；没有下降的儿童尾音。",
      role: "support",
    },
    "room:corridor": {
      title: "走廊话筒 / 声纹命中",
      detail: "第六下后先出现近距离吸气，0.7 秒后进入偏低回应；声音位于 B 棚门外左侧。",
      role: "primary",
    },
    "location:corridor": {
      title: "方位结论 / 孩子已经在门外",
      detail: "事故当晚的第七码由走廊中的陈默回答；这与他“没有回答”的记忆冲突。",
      role: "primary",
    },
  },
  {
    mix: {
      title: "中央混音 / 内容检测",
      detail: "旋律能量占 88%；人声清晰度仅 12%，无法形成连续句子。",
      role: "observation",
    },
    left: {
      title: "左声道 / 内容检测",
      detail: "检测到旋律与机房低频；完整人声片段数量为 0。",
      role: "support",
    },
    right: {
      title: "右声道 / 四段时间关系",
      detail: "开门要求后接六分钟拖延；六次敲击与童声回应发生后，陈渡才喊“她还在里面”。",
      role: "primary",
    },
  },
  {
    default: {
      title: "听证副本 / 三次平滑",
      detail: "成年人对白连续，但童声回应、名字“小默”和走廊脚步所在的三个窗口都异常平直。",
      role: "observation",
    },
    seam: {
      title: "放大剪口 / 三个共同缺口",
      detail: "三个缺口分别覆盖童声声纹、孩子名字和走廊行动声；边缘使用相同的静音包络。",
      role: "primary",
    },
    "raw:tang": {
      title: "剪口前语境 / 成年人保留",
      detail: "唐肃的六分钟拖延与陈渡的反驳仍可辨；剪辑目标不是单纯缩短争吵。",
      role: "observation",
    },
    "raw:chen": {
      title: "事故原轨 / 孩子痕迹补回",
      detail: "原轨连续出现童声偏低回应、陈渡喊“小默”和走廊脚步；官方副本全部缺席。",
      role: "support",
    },
    "erasure:child-erasure": {
      title: "删除规则 / 对象是陈默",
      detail: "三道独立剪口共同删除一个孩子的声纹、名字与行动位置，构成系统性抹除。",
      role: "primary",
    },
    "erasure:adult-shortening": {
      title: "候选解释 / 压缩争吵",
      detail: "成年人主要对白仍被保留，无法解释三个孩子痕迹为何分别消失。",
      role: "observation",
    },
    "erasure:noise-cleaning": {
      title: "候选解释 / 普通降噪",
      detail: "降噪不会跨越三个不同窗口，精准删掉名字、声纹和脚步。",
      role: "observation",
    },
  },
  {
    source: {
      title: "乔岚草稿 / 七次起音",
      detail: "七个音的高低走向与童年暗号一致；最后一个音故意偏低。",
      role: "observation",
    },
    released: {
      title: "发行版本 / 被加速的轮廓",
      detail: "仍有七次起音，但整体更快、更高；尾部加入六次木质打击。",
      role: "observation",
    },
    "sample:new": {
      title: "重新演奏木鱼",
      detail: "六次间距略有变化；第六下干净结束，没有门板拖擦声。",
      role: "observation",
    },
    "sample:door": {
      title: "B 棚红门",
      detail: "六次间距与发行版一致；第六下之后都留下短促的门板拖擦声。",
      role: "support",
    },
    "sample:relay": {
      title: "机房继电器",
      detail: "每次点击更短、更尖，没有木质空腔尾声。",
      role: "observation",
    },
  },
  {
    "record:full": {
      title: "完整口述 / 两次静音",
      detail: "陈渡承认先旁路警报，事故后又删除小默声轨；理由是保护孩子在场的事实。",
      role: "primary",
    },
    "time:22:49": {
      title: "22:49 / 导出窗口开始前",
      detail: "听见三次等距机械轻响，建立正常继电器节奏。",
      role: "observation",
    },
    "time:22:50": {
      title: "22:50 时间窗",
      detail: "第一次只剩连续环境声；预期出现机械轻响的位置全部空缺。",
      role: "primary",
    },
    "time:23:11": {
      title: "23:11 / 六分钟残句位置",
      detail: "对话说出“导出还差六分钟”时，机械轻响已经缺席；必须沿同一轨向前寻找开始点。",
      role: "observation",
    },
    "record:clean": {
      title: "清理版本 / 只留下救人",
      detail: "旁路警报与删除孩子两次承认全部消失，只剩唐肃锁门和陈渡带孩子离开的结果。",
      role: "support",
    },
  },
  {
    "phase:off": {
      title: "反相前 / 相关度",
      detail: "两份音乐相关度 +0.98；房间声被共同旋律覆盖。",
      role: "observation",
    },
    "phase:on": {
      title: "反相后 / 隐藏层",
      detail: "共同旋律抵消后，出现七段残句、门板动作和相互承接的回应。",
      role: "primary",
    },
    "remote:fingerprint": {
      title: "当前删改 / 7 次全部命中",
      detail: "每条线索写入后 0.7 秒内遭到对应删改；目标与 2012 年三联删除规则完全一致。",
      role: "primary",
    },
    "listener:master-key": {
      title: "权限签名 / TS_MASTER",
      detail: "当前会话持有唐肃旧主密钥，可读取全部历史剪口并覆写同一批母带字段。",
      role: "primary",
    },
  },
];

function getObservation(stage: number, option: string): Observation | null {
  if (stage === 4 && option.startsWith("compare:")) {
    const [, speed = "1.00", pitch = "0"] = option.split(":");
    const matched = speed === "0.82" && pitch === "-3";
    return {
      id: `${stage}:${option}`,
      title: `叠听结果 / ${speed}×、${pitch} 半音`,
      detail: matched
        ? "两段七次起音像同一次演奏；只有发行版修高了最后一个音。"
        : "仍能听见双重起音，后半段越走越开；两段还没有回到同一速度与高度。",
      role: matched ? "primary" : "observation",
    };
  }
  if (stage === 5) {
    const relayPlayback = parseRelayPlayback(option);
    const relayDefinition = relayPlayback
      ? OBSERVATION_LIBRARY[stage]?.[`time:${relayPlayback.time}`]
      : null;
    if (relayPlayback && relayDefinition) {
      return {
        id: `${stage}:${option}`,
        ...relayDefinition,
        title: `${RELAY_TRACK_LABELS[relayPlayback.track]} / ${relayDefinition.title}`,
      };
    }
  }
  if (stage === 6 && option.startsWith("fragment:")) {
    const segment = Number(option.slice(9));
    const meta = FRAGMENT_META[segment];
    if (!meta) return null;
    return {
      id: `${stage}:${option}`,
      title: `${meta.label} / 听写残句`,
      detail: `${meta.transcript}；${meta.sound}。约束来源：${meta.constraint}`,
      role: "observation",
    };
  }
  const definition = OBSERVATION_LIBRARY[stage]?.[option];
  return definition
    ? { id: `${stage}:${option}`, ...definition }
    : null;
}

const SOLUTION_OBSERVATION_OPTIONS = [
  ["take-a", "take-b", "final", "signature:anchor"],
  ["room:booth", "room:control", "room:corridor", "location:corridor"],
  ["right"],
  ["seam", "raw:tang", "raw:chen", "erasure:child-erasure"],
  ["compare:0.82:-3", "sample:door"],
  ["time:22:50", "record:full", "record:clean"],
  [
    "phase:on",
    "fragment:1",
    "fragment:2",
    "fragment:3",
    "fragment:4",
    "fragment:5",
    "fragment:6",
    "fragment:7",
    "remote:fingerprint",
    "listener:master-key",
  ],
];

function createAudioEngine() {
  let context: AudioContext | null = null;
  let master: GainNode | null = null;
  let activeBus: GainNode | null = null;
  let playbackTimers: number[] = [];
  let activeSources: AudioBufferSourceNode[] = [];
  const voiceBuffers = new Map<string, Promise<AudioBuffer | null>>();
  let sessionId = 0;
  let playRequestId = 0;

  const ensureGraph = () => {
    if (!context) {
      context = new AudioContext();
      master = context.createGain();
      master.gain.value = 0.46;
      master.connect(context.destination);
    }
    return { context, master: master as GainNode };
  };

  const unlock = async () => {
    const graph = ensureGraph();
    if (graph.context.state === "suspended") {
      await graph.context.resume();
    }
    if (graph.context.state !== "running") {
      throw new Error("audio-context-blocked");
    }
    return graph;
  };

  const beginSession = async () => {
    const graph = await unlock();
    const now = graph.context.currentTime;
    sessionId += 1;
    playbackTimers.forEach((timer) => window.clearTimeout(timer));
    playbackTimers = [];
    activeSources.forEach((source) => {
      try {
        source.stop();
      } catch {
        // The source may already have ended.
      }
    });
    activeSources = [];
    if (activeBus) {
      activeBus.gain.cancelScheduledValues(now);
      activeBus.gain.setValueAtTime(activeBus.gain.value, now);
      activeBus.gain.linearRampToValueAtTime(0.0001, now + 0.035);
    }
    const bus = graph.context.createGain();
    bus.gain.value = 1;
    bus.connect(graph.master);
    activeBus = bus;
    return { context: graph.context, bus, now: now + 0.08 };
  };

  const tone = (
    bus: AudioNode,
    frequency: number,
    start: number,
    duration: number,
    gainValue = 0.11,
    pan = 0,
    type: OscillatorType = "sine",
    attack = 0.018,
  ) => {
    const graph = ensureGraph();
    const oscillator = graph.context.createOscillator();
    const gain = graph.context.createGain();
    const panner = graph.context.createStereoPanner();
    oscillator.type = type;
    oscillator.frequency.value = frequency;
    panner.pan.value = pan;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(gainValue, start + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    oscillator.connect(gain).connect(panner).connect(bus);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.02);
  };

  const noise = (
    bus: AudioNode,
    start: number,
    duration: number,
    gainValue = 0.09,
    pan = 0,
    cutoff = 950,
  ) => {
    const graph = ensureGraph();
    const length = Math.max(1, Math.floor(graph.context.sampleRate * duration));
    const buffer = graph.context.createBuffer(
      1,
      length,
      graph.context.sampleRate,
    );
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / length);
    }
    const source = graph.context.createBufferSource();
    const filter = graph.context.createBiquadFilter();
    const gain = graph.context.createGain();
    const panner = graph.context.createStereoPanner();
    source.buffer = buffer;
    filter.type = "lowpass";
    filter.frequency.value = cutoff;
    gain.gain.value = gainValue;
    panner.pan.value = pan;
    source.connect(filter).connect(gain).connect(panner).connect(bus);
    source.start(start);
  };

  const loadVoiceBuffer = (clipId: string) => {
    const cached = voiceBuffers.get(clipId);
    if (cached) return cached;
    const graph = ensureGraph();
    const sourceUrl = new URL(
      `audio/voices/${clipId}.mp3`,
      window.location.href,
    ).toString();
    const pending = fetch(sourceUrl)
      .then((response) => {
        if (!response.ok) throw new Error("voice-fetch-failed");
        return response.arrayBuffer();
      })
      .then((data) => graph.context.decodeAudioData(data))
      .catch(() => null);
    voiceBuffers.set(clipId, pending);
    return pending;
  };

  const playVoiceClip = (
    bus: AudioNode,
    text: string,
    delay: number,
    {
      voice = "chen",
      tone: delivery,
      danger = false,
      onVoiceCue,
    }: {
      voice?: VoiceId;
      tone?: string;
      danger?: boolean;
      onVoiceCue?: (cue: VoiceCue) => void;
    } = {},
  ) => {
    const profile = VOICE_PROFILES[voice];
    const clip = getVoiceClip(voice, text);
    const bufferPromise = clip
      ? loadVoiceBuffer(clip.id)
      : Promise.resolve(null);
    const scheduledSession = sessionId;
    const timer = window.setTimeout(async () => {
      if (scheduledSession !== sessionId) return;
      const buffer = await bufferPromise;
      if (scheduledSession !== sessionId) return;
      onVoiceCue?.({
        speaker: profile.label,
        tone: buffer
          ? delivery ?? profile.tone
          : `${delivery ?? profile.tone}；音频载入失败，已保留字幕`,
        text,
        danger,
      });
      if (!buffer) return;
      const graph = ensureGraph();
      const source = graph.context.createBufferSource();
      const voiceGain = graph.context.createGain();
      source.buffer = buffer;
      voiceGain.gain.value = danger ? 0.72 : 0.82;
      source.connect(voiceGain).connect(bus);
      activeSources.push(source);
      source.start();
    }, delay);
    playbackTimers.push(timer);
  };

  const melody = (
    bus: AudioNode,
    base: number,
    {
      missingLast = false,
      timbre = "piano",
      rate = 1,
      pitchShift = 0,
      pan = 0,
      gain = 1,
      correctedLast = false,
    }: {
      missingLast?: boolean;
      timbre?: "hum" | "piano" | "mix";
      rate?: number;
      pitchShift?: number;
      pan?: number;
      gain?: number;
      correctedLast?: boolean;
    } = {},
  ) => {
    const shift = 2 ** (pitchShift / 12);
    const notes = [
      262,
      330,
      330,
      294,
      220,
      294,
      correctedLast ? 220 : 196,
    ];
    const step = 0.31 / rate;
    notes.forEach((note, index) => {
      if (missingLast && index === 6) return;
      const start = base + index * step;
      if (timbre === "hum") {
        tone(bus, note * shift * 0.5, start, step * 0.92, 0.09 * gain, pan, "sine", 0.08);
        tone(bus, note * shift, start, step * 0.84, 0.025 * gain, pan, "sine", 0.08);
      } else if (timbre === "mix") {
        tone(bus, note * shift, start, step * 0.78, 0.075 * gain, pan, "triangle");
        tone(bus, note * shift * 2, start, step * 0.35, 0.018 * gain, pan, "sine");
      } else {
        tone(bus, note * shift, start, step * 0.76, 0.11 * gain, pan, "triangle", 0.008);
        tone(bus, note * shift * 2, start, step * 0.34, 0.028 * gain, pan, "sine", 0.006);
      }
    });
  };

  const knocks = (
    bus: AudioNode,
    base: number,
    material: "door" | "wood" | "relay" = "door",
  ) => {
    const profile = {
      door: { frequency: 112, cutoff: 540, pan: 0.22, duration: 0.14 },
      wood: { frequency: 480, cutoff: 1600, pan: -0.1, duration: 0.07 },
      relay: { frequency: 880, cutoff: 2600, pan: 0, duration: 0.035 },
    }[material];
    [0, 0.31, 0.62, 0.93, 1.24, 1.55].forEach((offset, index) => {
      noise(
        bus,
        base + offset,
        profile.duration,
        0.12 - index * 0.006,
        profile.pan,
        profile.cutoff,
      );
      tone(
        bus,
        profile.frequency,
        base + offset,
        profile.duration,
        material === "relay" ? 0.025 : 0.045,
        profile.pan,
        "triangle",
        0.004,
      );
    });
  };

  const relayPulse = (bus: AudioNode, start: number, pan = 0) => {
    noise(bus, start, 0.028, 0.085, pan, 2800);
    tone(bus, 920, start, 0.045, 0.035, pan, "square", 0.002);
  };

  const roomResponse = (
    bus: AudioNode,
    base: number,
    room: "a" | "b" | "hall",
  ) => {
    noise(bus, base, 0.09, 0.16, 0, 2300);
    if (room === "a") {
      [0.3, 0.66, 1.08, 1.58].forEach((delay, index) =>
        noise(bus, base + delay, 0.16, 0.08 / (index + 1), -0.25, 1250),
      );
      tone(bus, 74, base + 0.12, 1.75, 0.035, -0.2, "sine", 0.12);
    } else if (room === "b") {
      [0.18, 0.39, 0.71].forEach((delay, index) =>
        noise(bus, base + delay, 0.11, 0.065 / (index + 1), 0.28, 1050),
      );
      [0.12, 0.56, 1].forEach((delay) =>
        tone(bus, 146, base + delay, 0.19, 0.026, 0.65, "sine", 0.05),
      );
    } else {
      [0.08, 0.17, 0.28, 0.42].forEach((delay, index) => {
        noise(bus, base + delay, 0.045, 0.06 / (index + 1), 0, 2800);
        tone(bus, 640, base + delay, 0.055, 0.018, 0, "square", 0.003);
      });
    }
  };

  const play = async (
    stage: number,
    option = "default",
    onVoiceCue?: (cue: VoiceCue) => void,
  ) => {
    const requestId = ++playRequestId;
    await unlock();
    const requiredVoiceClips = [
      ...new Set(getPlaybackVoiceClipIds(stage, option)),
    ];
    await Promise.all(
      requiredVoiceClips.map((clipId) => loadVoiceBuffer(clipId)),
    );
    if (requestId !== playRequestId) {
      throw new Error("audio-playback-superseded");
    }
    const graph = await beginSession();
    const { bus, now } = graph;
    let voiceQueueEnd = 0;
    const narrate = (
      text: string,
      delay: number,
      options: Omit<
        NonNullable<Parameters<typeof playVoiceClip>[3]>,
        "onVoiceCue"
      > = {},
    ) => {
      const voice = options.voice ?? "chen";
      const clip = getVoiceClip(voice, text);
      const scheduledDelay = Math.max(
        delay,
        voiceQueueEnd > 0 ? voiceQueueEnd + 180 : delay,
      );
      voiceQueueEnd =
        scheduledDelay + (clip?.duration ?? 3200);
      playVoiceClip(bus, text, scheduledDelay, {
        ...options,
        onVoiceCue,
      });
    };
    const finish = (baseDuration: number) =>
      Math.max(baseDuration, voiceQueueEnd + 280);

    if (option === "father-note") {
      narrate(
        "十四年前，乔岚在门后敲了六下。你一直说自己没有回答。我把事故母带拆成七层，因为完整的一份还会被同一把密钥删掉。不要先相信记忆。先找回那个被我们一起拿走的第七码。",
        120,
        {
        voice: "chen",
          tone: "压得很低；说到“同一把密钥”时明显停顿",
        },
      );
      return finish(19000);
    }
    if (option.startsWith("listener:")) {
      const chapter = Number(option.slice(9));
      narrate(
        LISTENER_VOICE_LINES[chapter] ?? "你不该继续听。",
        180,
        {
          voice: "listener",
          tone:
            chapter >= 4
              ? "贴近耳边，像在阻止写入"
              : "没有起伏，像早已知道结果",
          danger: true,
        },
      );
      return finish(chapter >= 4 ? 4600 : 3900);
    }
    if (option === "listener-final") {
      narrate("你确定，要让他们听见全部吗，陈默？", 180, {
        voice: "listener",
        tone: "第一次叫出你的名字，仍然没有起伏",
        danger: true,
      });
      return finish(4300);
    }
    if (option.startsWith("ending:")) {
      const ending = option.slice(7) as EndingId;
      if (ending === "complete") {
        knocks(bus, now + 0.18, "door");
        narrate("七拍都在。你确定，听见的人只有他们吗？", 2250, {
          voice: "listener",
          tone: "第六次敲击后才开口，像一直在等暗号",
          danger: true,
        });
        return finish(7200);
      }
      if (ending === "clean") {
        melody(bus, now, { missingLast: true, timbre: "mix", gain: 0.55 });
        narrate("爸爸……为什么又把我删掉了？", 2400, {
          voice: "child",
          tone: "很近，像从导出文件末尾突然恢复",
          danger: true,
        });
        return finish(6500);
      }
      relayPulse(bus, now + 0.12);
      narrate("你没有发布。没关系。我已经替你保存了。", 650, {
        voice: "listener",
        tone: "语气平静，像在报告一个早已完成的动作",
        danger: true,
      });
      return finish(6500);
    }

    if (option === "story") {
      if (stage === 0) {
        narrate("小默，你又把最后一个音唱低了。", 100, {
          voice: "qiao",
          tone: "听见错误后轻轻笑了一下",
        });
        narrate("要重来吗？", 3760, {
          voice: "child",
          tone: "小心翼翼，句首先吸气",
        });
        narrate("不重来。错得这么认真，删掉多可惜。", 6000, {
          voice: "qiao",
          tone: "温柔，但“删掉”前有一瞬停顿",
        });
        narrate("再来一次。最后一下，等你唱。", 11000, {
          voice: "qiao",
          tone: "像隔着玻璃提醒一个孩子",
        });
        return finish(15500);
      }
      if (stage === 1) {
        narrate("隔着玻璃听不见。我敲前六下。", 100, {
          voice: "qiao",
          tone: "压低声音，像在约定秘密",
        });
        narrate("最后一下，我唱吗？", 4300, {
          voice: "child",
          tone: "声音很远，认真确认规则",
        });
        narrate("对。这样我就知道，你还听得见。", 7500, {
          voice: "qiao",
          tone: "笑意消失，最后五个字说得很慢",
        });
        return finish(12000);
      }
      if (stage === 4) {
        narrate("第七码，保留小默原来的音高。不要修。", 100, {
          voice: "qiao",
          tone: "工作备注，疲惫但坚定",
        });
        narrate("这是节拍。不是求救。", 5300, {
          voice: "listener",
          tone: "贴近耳边，像在替你下结论",
          danger: true,
        });
        return finish(9500);
      }
      return 0;
    }

    if (stage === 0) {
      if (option === "take-a") {
        melody(bus, now, { timbre: "hum", missingLast: true, gain: 1.8 });
        noise(bus, now + 1.82, 0.18, 0.045, 0.08, 1400);
        tone(bus, 196, now + 2.25, 0.72, 0.14, 0.08, "sine", 0.08);
        return finish(3300);
      }
      if (option === "take-b") {
        melody(bus, now, {
          timbre: "piano",
          gain: 1.6,
          correctedLast: true,
        });
        return finish(2600);
      }
      melody(bus, now, {
        missingLast: true,
        timbre: "mix",
        gain: 1.9,
      });
      return finish(2600);
    }
    if (stage === 1) {
      const location =
        option === "room:corridor"
          ? "corridor"
          : option === "room:control"
            ? "control"
            : "booth";
      roomResponse(
        bus,
        now,
        location === "corridor" ? "hall" : location === "booth" ? "b" : "a",
      );
      knocks(bus, now + 0.35, "door");
      if (location === "corridor") {
        noise(bus, now + 2.12, 0.18, 0.042, -0.55, 1400);
        tone(bus, 196, now + 2.55, 0.72, 0.12, -0.55, "sine", 0.08);
      } else if (location === "control") {
        tone(bus, 74, now + 2.2, 0.85, 0.032, 0.62, "sine", 0.1);
      } else {
        noise(bus, now + 2.18, 0.2, 0.04, 0.28, 720);
      }
      return finish(3500);
    }
    if (stage === 2) {
      const selectedChannel = option === "default" ? "mix" : option;
      const pan =
        selectedChannel === "right"
          ? 0.92
          : selectedChannel === "left"
            ? -0.92
            : 0;
      if (selectedChannel !== "right") {
        melody(bus, now, {
          missingLast: true,
          timbre: "mix",
          pan,
          gain: selectedChannel === "mix" ? 0.9 : 1.15,
        });
      }
      if (selectedChannel === "right") {
        narrate("把 B 棚打开，母带归我。", 80, {
          voice: "qiao",
          tone: "强忍怒意，短促命令",
        });
        narrate("先别开门。导出，还差六分钟。", 2050, {
          voice: "tang",
          tone: "异常平静，“导出”后刻意停顿",
        });
        narrate("一、二、三、四、五、六……", 4850, {
          voice: "child",
          tone: "来自走廊，数到六后先吸气",
        });
        tone(bus, 196, now + 9.3, 0.68, 0.105, 0.72, "sine", 0.08);
        narrate("她还在里面！", 9800, {
          voice: "chen",
          tone: "在童声回应之后才喊出，呼吸急促",
        });
        return finish(12600);
      }
      if (selectedChannel === "mix") {
        return finish(2800);
      }
      tone(bus, 84, now, 2.4, 0.04, -0.72, "sine", 0.1);
      return finish(2800);
    }
    if (stage === 3) {
      if (option === "raw:tang") {
        narrate("先别开门。导出，还差六分钟。", 60, {
          voice: "tang",
          tone: "原始残句；句末自然呼气并结束",
        });
        return finish(4700);
      }
      if (option === "raw:chen") {
        noise(bus, now + 0.08, 0.18, 0.04, -0.4, 1500);
        tone(bus, 196, now + 0.32, 0.64, 0.11, -0.42, "sine", 0.08);
        narrate("别听。小默，跟爸爸出去。", 1250, {
          voice: "chen",
          tone: "原轨补回孩子名字；声音与脚步一起向走廊移动",
        });
        noise(bus, now + 5.7, 0.82, 0.045, -0.7, 420);
        return finish(6800);
      }
      if (option === "seam") {
        relayPulse(bus, now + 0.28);
        noise(bus, now + 2.1, 0.04, 0.13, -0.25, 2600);
        noise(bus, now + 3.1, 0.04, 0.13, 0.25, 2600);
        noise(bus, now + 4.1, 0.04, 0.13, -0.25, 2600);
        narrate("先别开门。导出，还差六分钟。", 60, {
          voice: "tang",
          tone: "三处剪口分别落在童声回应、名字和走廊脚步的位置",
        });
        return finish(5200);
      }
      relayPulse(bus, now + 0.28);
      narrate("先别开门。导出，还差六分钟。", 60, {
        voice: "tang",
        tone: "官方副本完整保留成年人对白",
      });
      narrate("她还在里面！", 4420, {
        voice: "chen",
        tone: "孩子回应、名字和走廊动作已被整窗删除",
      });
      relayPulse(bus, now + 4.38);
      return finish(6900);
    }
    if (stage === 4) {
      if (option === "source") {
        melody(bus, now, { timbre: "hum" });
        return finish(2600);
      }
      if (option === "released") {
        melody(bus, now, {
          timbre: "mix",
          rate: 1.22,
          pitchShift: 3,
        });
        knocks(bus, now + 2.15, "door");
        return finish(4200);
      }
      if (option.startsWith("sample:")) {
        const selected = option.slice(7);
        const material: "door" | "wood" | "relay" =
          selected === "new"
            ? "wood"
            : selected === "relay"
              ? "relay"
              : "door";
        knocks(bus, now, material);
        return finish(2300);
      }
      const [, speedValue = "1.00", pitchValue = "0"] =
        option.match(/^compare:([^:]+):([^:]+)$/) ?? [];
      const speed = Number(speedValue);
      const pitch = Number(pitchValue);
      melody(bus, now, { timbre: "hum" });
      relayPulse(bus, now + 2.2);
      melody(bus, now + 2.45, {
        timbre: "mix",
        rate: 1.22 * speed,
        pitchShift: 3 + pitch,
      });
      return finish(5200);
    }
    if (stage === 5) {
      const relayPlayback = parseRelayPlayback(option);
      if (relayPlayback) {
        const { track, time } = relayPlayback;
        const pan = track === "room" ? -0.62 : track === "piano" ? 0 : 0.62;
        const addTrackPrint = (start: number) => {
          if (track === "room") {
            noise(bus, start + 0.07, 0.08, 0.025, pan, 780);
          } else if (track === "piano") {
            tone(bus, 132, start + 0.04, 0.12, 0.014, pan, "sine", 0.02);
          } else {
            tone(bus, 62, start + 0.03, 0.1, 0.012, pan, "triangle", 0.01);
          }
        };
        if (time === "22:49") {
          [0, 0.62, 1.24].forEach((offset) => {
            relayPulse(bus, now + offset, pan);
            addTrackPrint(now + offset);
          });
          return finish(2100);
        }
        if (time === "22:50") {
          noise(bus, now, 0.12, 0.028, pan, track === "room" ? 760 : 420);
          tone(
            bus,
            track === "piano" ? 132 : track === "room" ? 54 : 62,
            now + 0.35,
            1.7,
            0.035,
            pan,
            "sine",
            0.15,
          );
          return finish(2800);
        }
        tone(
          bus,
          track === "piano" ? 126 : track === "room" ? 48 : 60,
          now,
          2.1,
          0.045,
          pan,
          "sine",
          0.18,
        );
        [0.35, 1.15].forEach((offset) =>
          noise(bus, now + offset, 0.24, 0.03, pan, track === "room" ? 430 : 680),
        );
        return finish(2700);
      }
      if (option === "record:clean") {
        tone(bus, 220, now, 0.08, 0.035, 0, "sine");
        narrate("唐肃锁住了门。其他内容，与事故无关。", 120, {
          voice: "listener",
          tone: "像一份已经替你写好的结论",
          danger: true,
        });
        return finish(4300);
      }
      [0, 0.5, 1].forEach((offset) => relayPulse(bus, now + offset));
      narrate("唐老师说，只关四十分钟。", 1550, {
        voice: "chen",
        tone: "反复解释，声音发紧",
      });
      narrate("我知道流程不允许……我还是按了。", 4200, {
        voice: "chen",
        tone: "承认时明显放慢，没有为自己辩解",
      });
      narrate(
        "我把小默那一轨删了。不是为了唐肃……是因为他当时也在现场。",
        8500,
        {
          voice: "chen",
          tone: "说到孩子名字时停顿；第二次承认比第一次更轻",
        },
      );
      return finish(15800);
    }
    if (stage === 6) {
      if (option.startsWith("fragment:")) {
        const fragment = Number(option.slice(9));
        const starts = [0, 0.24, 0.49, 0.77, 1.04, 1.29, 1.58];
        const frequencies = [76, 91, 64, 118, 83, 102, 56];
        noise(bus, now, 0.14 + fragment * 0.01, 0.055, fragment % 2 ? -0.3 : 0.3, 760);
        tone(
          bus,
          frequencies[fragment - 1] ?? 70,
          now,
          0.45,
          0.05,
          0,
          "triangle",
          0.03,
        );
        if (fragment === 1) {
          narrate("锁上 B 棚。她拿不到母带，就会签。", 620, {
            voice: "tang",
            tone: "低声命令，没有犹豫",
          });
        }
        if (fragment === 2) {
          narrate("机架冒烟了！断总闸！", 620, {
            voice: "chen",
            tone: "贴近机房门，急促喊叫",
          });
        }
        if (fragment === 3) {
          narrate("文件没写完。谁都别动电源。", 620, {
            voice: "tang",
            tone: "在警报缺席的安静里仍保持平稳",
          });
        }
        if (fragment === 4) knocks(bus, now + 0.35, "door");
        if (fragment === 5) {
          narrate("最后一下……该我唱。", 620, {
            voice: "child",
            tone: "等待六次敲击结束后，小声提醒自己",
          });
          noise(bus, now + 3.45, 0.16, 0.04, -0.42, 1300);
          tone(bus, 196, now + 3.82, 0.68, 0.11, -0.42, "sine", 0.08);
        }
        if (fragment === 6) {
          narrate("别听。小默，跟爸爸出去。", 620, {
            voice: "chen",
            tone: "强迫自己放轻，最后三个字急促",
          });
        }
        if (fragment === 7) {
          noise(bus, now + starts[fragment - 1] / 5, 0.8, 0.04, -0.5, 380);
          narrate("别回头。", 1000, {
            voice: "chen",
            tone: "已经离开麦克风，声音向走廊远去",
          });
        }
        return finish(
          fragment === 5
            ? 4800
            : [1, 2, 3, 6, 7].includes(fragment)
              ? 3600
              : 2100,
        );
      }
      if (option === "phase:off") {
        melody(bus, now, { timbre: "mix", gain: 1.15 });
        return finish(2600);
      }
      knocks(bus, now, "door");
      narrate("最后一下……该我唱。", 1950, {
        voice: "child",
        tone: "声音从被抵消的音乐下面浮出来",
      });
      noise(bus, now + 5.0, 0.16, 0.04, -0.42, 1300);
      tone(bus, 196, now + 5.38, 0.68, 0.11, -0.42, "sine", 0.08);
      return finish(6400);
    }
    if (option.startsWith("note:")) {
      const noteFrequencies: Record<string, number> = {
        high: 262,
        mid: 220,
        low: 196,
      };
      const frequency = noteFrequencies[option.slice(5)] ?? 220;
      tone(bus, frequency, now, 0.72, 0.12, 0, "sine", 0.08);
      return finish(1000);
    }
    melody(bus, now, { timbre: "mix" });
    tone(bus, 196, now + 1.93, 0.8, 0.14, 0, "sine", 0.08);
    narrate("小默，这个音低了一点。别重唱。", 3150, {
      voice: "qiao",
      tone: "像记忆里一样带笑，随后忽然认真",
    });
    narrate("七拍都在，我们就知道，对方还听得见。", 6100, {
      voice: "qiao",
      tone: "最后五个字几乎是耳语",
    });
    return finish(10200);
  };

  const uiClick = async () => {
    const graph = await unlock();
    tone(
      graph.master,
      440,
      graph.context.currentTime + 0.01,
      0.05,
      0.025,
      0,
      "triangle",
    );
  };

  const stop = () => {
    playRequestId += 1;
    sessionId += 1;
    playbackTimers.forEach((timer) => window.clearTimeout(timer));
    playbackTimers = [];
    activeSources.forEach((source) => {
      try {
        source.stop();
      } catch {
        // The source may already have ended.
      }
    });
    activeSources = [];
    if (context && activeBus) {
      const now = context.currentTime;
      activeBus.gain.cancelScheduledValues(now);
      activeBus.gain.setValueAtTime(activeBus.gain.value, now);
      activeBus.gain.linearRampToValueAtTime(0.0001, now + 0.035);
    }
  };

  return { play, uiClick, stop };
}

function useAudio(soundEnabled: boolean) {
  const engineRef = useRef<ReturnType<typeof createAudioEngine> | null>(null);

  const getEngine = () => {
    if (!engineRef.current) engineRef.current = createAudioEngine();
    return engineRef.current;
  };

  useEffect(() => {
    if (!soundEnabled) engineRef.current?.stop();
  }, [soundEnabled]);

  useEffect(
    () => () => {
      engineRef.current?.stop();
    },
    [],
  );

  return {
    play: async (
      stage: number,
      option?: string,
      onVoiceCue?: (cue: VoiceCue) => void,
    ): Promise<AudioPlaybackResult> => {
      if (!soundEnabled) {
        return { duration: 900, started: false, reason: "sound-off" };
      }
      try {
        const duration = await getEngine().play(
          stage,
          option,
          onVoiceCue,
        );
        return { duration, started: true };
      } catch {
        return { duration: 0, started: false, reason: "blocked" };
      }
    },
    click: async () => {
      if (!soundEnabled) return false;
      try {
        await getEngine().uiClick();
        return true;
      } catch {
        return false;
      }
    },
    stop: () => getEngine().stop(),
  };
}

function formatPlaybackTime(milliseconds: number) {
  const safeMilliseconds = Math.max(0, milliseconds);
  const totalTenths = Math.round(safeMilliseconds / 100);
  const minutes = Math.floor(totalTenths / 600);
  const seconds = Math.floor((totalTenths % 600) / 10);
  const tenths = totalTenths % 10;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(
    2,
    "0",
  )}.${tenths}`;
}

function getPlaybackTimeMarks(durationMs: number) {
  if (durationMs <= 0) {
    return ["00:00.0", "--:--.-", "--:--.-", "--:--.-", "--:--.-"];
  }
  return [0, 0.25, 0.5, 0.75, 1].map((ratio) =>
    formatPlaybackTime(durationMs * ratio),
  );
}

function Waveform({
  seed,
  playing,
  durationMs,
  danger = false,
  gapAt,
}: {
  seed: number;
  playing: boolean;
  durationMs: number;
  danger?: boolean;
  gapAt?: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const clockRef = useRef<HTMLOutputElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;
    let frame = 0;
    const startedAt = window.performance.now();
    let lastClockText = "";

    const draw = (timestamp = startedAt) => {
      const rect = canvas.getBoundingClientRect();
      const scale = Math.max(1, window.devicePixelRatio || 1);
      const width = Math.max(320, Math.floor(rect.width * scale));
      const height = Math.max(120, Math.floor(rect.height * scale));
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }

      context.clearRect(0, 0, width, height);
      context.fillStyle = danger ? "#121817" : "#101719";
      context.fillRect(0, 0, width, height);

      context.strokeStyle = "rgba(132, 164, 151, 0.10)";
      context.lineWidth = 1;
      for (let x = 0; x <= 16; x += 1) {
        const px = (x / 16) * width;
        context.beginPath();
        context.moveTo(px, 0);
        context.lineTo(px, height);
        context.stroke();
      }
      for (let y = 1; y < 4; y += 1) {
        const py = (y / 4) * height;
        context.beginPath();
        context.moveTo(0, py);
        context.lineTo(width, py);
        context.stroke();
      }

      const segments = 220;
      context.strokeStyle = danger ? "#b66c63" : "#8fb9a4";
      context.lineWidth = Math.max(1.2, scale);
      context.beginPath();
      for (let i = 0; i < segments; i += 1) {
        const normalized = i / (segments - 1);
        const gap =
          gapAt !== undefined && Math.abs(normalized - gapAt) < 0.026;
        const pseudo =
          Math.sin((i + seed * 11) * 0.61) *
          Math.sin((i + seed * 3) * 0.173);
        const envelope =
          0.22 +
          Math.abs(Math.sin((normalized + seed * 0.03) * Math.PI * 5)) *
            0.58;
        const amplitude = gap ? 0.025 : Math.abs(pseudo) * envelope;
        const x = normalized * width;
        const y1 = height / 2 - amplitude * height * 0.43;
        const y2 = height / 2 + amplitude * height * 0.43;
        context.moveTo(x, y1);
        context.lineTo(x, y2);
      }
      context.stroke();

      context.strokeStyle = "rgba(217, 226, 218, 0.2)";
      context.beginPath();
      context.moveTo(0, height / 2);
      context.lineTo(width, height / 2);
      context.stroke();

      const elapsedMs =
        playing && durationMs > 0
          ? Math.min(durationMs, Math.max(0, timestamp - startedAt))
          : 0;
      const progress =
        playing && durationMs > 0 ? elapsedMs / durationMs : 0;
      const playhead = progress * width;
      context.strokeStyle = "#d3ad70";
      context.lineWidth = Math.max(1, scale);
      context.beginPath();
      context.moveTo(playhead, 0);
      context.lineTo(playhead, height);
      context.stroke();

      const clockText = `${formatPlaybackTime(elapsedMs)} / ${
        durationMs > 0 ? formatPlaybackTime(durationMs) : "--:--.-"
      }`;
      if (clockRef.current && clockText !== lastClockText) {
        clockRef.current.textContent = clockText;
        lastClockText = clockText;
      }

      if (playing && progress < 1) {
        frame = window.requestAnimationFrame(draw);
      }
    };

    draw();
    if (!playing) {
      const onResize = () => draw();
      window.addEventListener("resize", onResize);
      return () => window.removeEventListener("resize", onResize);
    }
    return () => window.cancelAnimationFrame(frame);
  }, [danger, durationMs, gapAt, playing, seed]);

  return (
    <div className="waveform-visual">
      <canvas
        ref={canvasRef}
        className="waveform-canvas"
        aria-label="当前音轨的可视波形示意"
      />
      <output ref={clockRef} className="waveform-clock" aria-live="off">
        00:00.0 / --:--.-
      </output>
    </div>
  );
}

function LiveVoiceCue({
  cue,
  soundEnabled,
}: {
  cue: VoiceCue | null;
  soundEnabled: boolean;
}) {
  return (
    <div
      className={`live-voice-cue ${cue?.danger ? "is-danger" : ""} ${
        cue ? "is-speaking" : ""
      }`}
      aria-live="polite"
      aria-atomic="true"
    >
      <div>
        <i aria-hidden="true" />
        <span>{cue ? cue.speaker : "声纹字幕"}</span>
        <b>
          {cue
            ? cue.tone
            : soundEnabled
              ? "固定人声素材已就绪；播放时只会出现当前说话人"
              : "声音已关闭；解谜仍可使用文字与可视线索"}
        </b>
      </div>
      <p>{cue ? `“${cue.text}”` : "VOICE PRINT / STANDBY"}</p>
    </div>
  );
}

function SystemButton({
  children,
  active = false,
  danger = false,
  disabled = false,
  onClick,
  className = "",
}: {
  children: ReactNode;
  active?: boolean;
  danger?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      className={`system-button ${active ? "is-active" : ""} ${
        danger ? "is-danger" : ""
      } ${className}`}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function GuidedPanel({
  stage,
  step,
  currentDetail,
  onLocate,
}: {
  stage: number;
  step: number;
  currentDetail?: string;
  onLocate: () => void;
}) {
  const guide = GUIDE_CONTENT[stage];
  const current = Math.min(step, guide.steps.length - 1);
  return (
    <section className="guided-panel" aria-labelledby="guide-question">
      <div className="guide-explanation">
        <div className="guide-progress-heading">
          <span>
            当前步骤 {current + 1}/{guide.steps.length}
          </span>
          <i>
            <b
              style={{
                width: `${Math.min(
                  100,
                  ((current + 1) / guide.steps.length) * 100,
                )}%`,
              }}
            />
          </i>
        </div>
        <span>本章要证明</span>
        <h3 id="guide-question">{guide.question}</h3>
        <p>{guide.plain}</p>
        <div className="guide-legend" aria-label="解谜操作方法">
          <span>1　看当前任务</span>
          <i>→</i>
          <span>2　点击黄色高亮</span>
          <i>→</i>
          <span>3　自动进入下一步</span>
        </div>
      </div>
      <div className="guide-progress">
        <div className="next-action" aria-live="polite">
          <div>
            <span>现在请做</span>
            <strong>{currentDetail ?? guide.steps[current]}</strong>
            <small>页面中的黄色高亮区域就是当前可点击位置。</small>
          </div>
          <button type="button" onClick={onLocate}>
            定位下一步 ↓
          </button>
        </div>
        <small className="guide-term">{guide.term}</small>
        <details className="guide-history">
          <summary>查看完整修复步骤</summary>
          <ol>
            {guide.steps.map((item, index) => (
              <li
                key={item}
                className={
                  index < step
                    ? "is-done"
                    : index === current
                      ? "is-current"
                      : "is-locked"
                }
              >
                <b>{index < step ? "✓" : index + 1}</b>
                <span>{item}</span>
              </li>
            ))}
          </ol>
        </details>
      </div>
    </section>
  );
}

function ObservationLog({
  observations,
}: {
  observations: Observation[];
}) {
  return (
    <section className="observation-log" aria-label="自动观察记录">
      <header>
        <div>
          <span>自动观察记录</span>
          <strong>{observations.length}</strong>
        </div>
        <p>这里只复述听见的残句与声音事件，不替你解释它们为什么发生。</p>
      </header>
      {observations.length === 0 ? (
        <div className="observation-empty">
          试听或处理音轨后，这里会留下敲击、停顿、残句与背景声音的听写。
        </div>
      ) : (
        <div className="observation-list" aria-live="polite">
          {observations.map((item) => (
            <article key={item.id} className={`is-${item.role}`}>
              <div>
                <span>
                  {item.role === "primary"
                    ? "关键观察"
                    : item.role === "support"
                      ? "可选佐证"
                      : "中立记录"}
                </span>
                <strong>{item.title}</strong>
              </div>
              <p>{item.detail}</p>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function BootCover({
  saved,
  soundEnabled,
  textAssist,
  onSound,
  onTextAssist,
  onStart,
}: {
  saved: boolean;
  soundEnabled: boolean;
  textAssist: boolean;
  onSound: () => void;
  onTextAssist: () => void;
  onStart: () => void;
}) {
  return (
    <main className="boot-shell">
      <section className="boot-console" aria-labelledby="game-title">
        <div className="boot-eyebrow">
          <span>NØ7 / ARCHIVE RECOVERY NODE</span>
          <span className="status-dot">LOCAL</span>
        </div>
        <div className="boot-grid">
          <div className="boot-title-block">
            <p className="chapter-index">未完成工程</p>
            <h1 id="game-title">第七码</h1>
            <p className="boot-subtitle">
              有些声音被删掉，是为了让歌更干净。
              <br />
              有些人也是。
            </p>
          </div>
          <div className="boot-meter" aria-label="七段损坏工程">
            {Array.from({ length: 7 }, (_, index) => (
              <span
                key={index}
                className={index === 6 ? "boot-bar missing" : "boot-bar"}
                style={{ height: `${24 + ((index * 19) % 58)}%` }}
              />
            ))}
          </div>
        </div>

        <div className="boot-readout">
          <span>创建者：CHEN_DU</span>
          <span>最后保存：2026.07.17 03:14</span>
          <span>事故母带：1 / 修复阶段：7</span>
          <span>可正常播放：0</span>
          <span>当前监听者：1</span>
        </div>

        <blockquote className="father-note">
          <p>陈默：</p>
          <p>如果你看到这里，说明我还是没能亲口解释。</p>
          <p>十四年前，乔岚在门后敲了六下。你一直说自己没有回答。</p>
          <p>我把事故母带拆成七层，因为完整的一份还会被同一把密钥删掉。</p>
          <p>不要先相信记忆。先找回那个被我们一起拿走的第七码。</p>
        </blockquote>

        <div className="boot-settings" aria-label="游玩辅助设置">
          <SystemButton active={soundEnabled} onClick={onSound}>
            声音 {soundEnabled ? "开启" : "关闭"}
          </SystemButton>
          <SystemButton active={textAssist} onClick={onTextAssist}>
            全文字辅助 {textAssist ? "开启" : "关闭"}
          </SystemButton>
        </div>

        <button type="button" className="primary-entry" onClick={onStart}>
          <span>{saved ? "继续修复" : "开始校验"}</span>
          <span aria-hidden="true">→</span>
        </button>
        <p className="boot-safety">
          推荐使用耳机。不会访问麦克风，不会自动播放或制造高音量惊吓。
        </p>
      </section>
    </main>
  );
}

function PuzzleWorkspace({
  stage,
  hintLevel,
  onFailure,
  onComplete,
  onPlay,
  onHint,
  onObservation,
  textAssist,
}: {
  stage: number;
  hintLevel: number;
  onFailure: () => void;
  onComplete: () => void;
  onPlay: (option?: string) => Promise<boolean>;
  onHint: () => void;
  onObservation: (observation: Observation) => void;
  textAssist: boolean;
}) {
  const [beat, setBeat] = useState<number | null>(null);
  const [room, setRoom] = useState<string | null>(null);
  const [channel, setChannel] = useState("mix");
  const [dialogueOrder, setDialogueOrder] = useState<string[]>([]);
  const [cutsVisible, setCutsVisible] = useState(false);
  const [speaker, setSpeaker] = useState<string | null>(null);
  const [speed, setSpeed] = useState("1.00");
  const [pitch, setPitch] = useState("0");
  const [sample, setSample] = useState<string | null>(null);
  const [relayTime, setRelayTime] = useState<string | null>(null);
  const [versionChoice, setVersionChoice] = useState<
    "full" | "clean" | null
  >(null);
  const [inverted, setInverted] = useState(false);
  const [heardFragments, setHeardFragments] = useState<number[]>([]);
  const [segmentOrder, setSegmentOrder] = useState<number[]>([]);
  const [listenerIdentity, setListenerIdentity] = useState<string | null>(
    null,
  );
  const [message, setMessage] = useState("");
  const [inputLoaded, setInputLoaded] = useState(stage === 0);
  const [guideStep, setGuideStep] = useState(0);
  const [hintOpen, setHintOpen] = useState(false);
  const puzzleRootRef = useRef<HTMLDivElement>(null);
  const locateTimerRef = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (locateTimerRef.current) {
        window.clearTimeout(locateTimerRef.current);
      }
    },
    [],
  );

  const advanceGuide = (expectedStep: number) => {
    setGuideStep((current) =>
      current === expectedStep ? current + 1 : current,
    );
  };

  const recordObservation = (option: string) => {
    const observation = getObservation(stage, option);
    if (!observation) return;
    onObservation(observation);
  };

  const inspectPlay = async (option: string) => {
    const ready = await onPlay(option);
    if (!ready) return false;
    recordObservation(option);
    return true;
  };

  const guidedPlay = async (option: string, expectedStep: number) => {
    const ready = await inspectPlay(option);
    if (ready) advanceGuide(expectedStep);
  };

  const guidedInspect = (option: string, expectedStep: number) => {
    recordObservation(option);
    advanceGuide(expectedStep);
  };

  const applyCorrectOperation = () => {
    setInputLoaded(true);
    if (stage === 0) setBeat(6);
    if (stage === 1) setRoom("corridor");
    if (stage === 2) {
      setChannel("right");
      setDialogueOrder(["a", "b", "d", "c"]);
    }
    if (stage === 3) {
      setCutsVisible(true);
      setSpeaker("child-erasure");
    }
    if (stage === 4) {
      setSpeed("0.82");
      setPitch("-3");
      setSample("door");
    }
    if (stage === 5) {
      setRelayTime("22:50");
      setVersionChoice("full");
    }
    if (stage === 6) {
      setInverted(true);
      setSegmentOrder([1, 2, 3, 4, 5, 6, 7]);
      setListenerIdentity("master-key");
    }
    SOLUTION_OBSERVATION_OPTIONS[stage].forEach(recordObservation);
    setGuideStep(GUIDE_CONTENT[stage].steps.length - 1);
    setMessage("正确操作已装入。请亲自点击“验证修复”。");
  };

  const fail = (copy: string) => {
    setMessage(copy);
    onFailure();
  };

  const succeed = () => {
    setMessage("");
    onComplete();
  };

  const verify = () => {
    if (stage === 0) {
      if (beat === 6) succeed();
      else fail("这个位置在三次演奏中都存在。再比较一次。");
      return;
    }
    if (stage === 1) {
      if (room === "corridor") succeed();
      else
        fail(
          "这个话筒没有同时出现“先吸气、晚 0.7 秒、尾音下降”三项声纹锚。继续比较三个位置。",
        );
      return;
    }
    if (stage === 2) {
      const correct = dialogueOrder.join(",") === "a,b,d,c";
      if (channel === "right" && correct) succeed();
      else {
        fail(
          channel !== "right"
            ? "中央混音仍然盖住了对话。"
            : "把童声回应固定在第三位：开门要求在前，六分钟拖延随后，陈渡的反驳发生在回应之后。",
        );
      }
      return;
    }
    if (stage === 3) {
      if (cutsVisible && speaker === "child-erasure") succeed();
      else {
        fail(
          !cutsVisible
            ? "先放大三道剪口，查看每个位置被拿走的声音。"
            : "三个剪口分别删掉童声回应、名字“小默”和走廊脚步；共同目标不是某个成年人的一句话。",
        );
      }
      return;
    }
    if (stage === 4) {
      if (speed === "0.82" && pitch === "-3" && sample === "door") {
        succeed();
      } else {
        fail("两段仍能听见双重起音，或六连击的间距与第六下尾声没有接上。");
      }
      return;
    }
    if (stage === 5) {
      if (relayTime === "22:50" && versionChoice === "full") succeed();
      else {
        fail(
          relayTime !== "22:50"
            ? "沿同一警报轨回查时，这里不是机械点击第一次消失的位置。"
            : "清理版本删掉了对陈渡不利、却真实存在的操作。",
        );
      }
      return;
    }
    const correct = segmentOrder.join(",") === "1,2,3,4,5,6,7";
    if (inverted && correct && listenerIdentity === "master-key") succeed();
    else {
      fail(
        !inverted
          ? "表面音乐仍然盖住房间声。"
          : !correct
            ? "检查相邻片段是否形成直接回应：断电要求之后是谁阻止，六次敲击之后必须接童声回应。"
            : "当前七次删改精准命中旧剪口，且都由 TS_MASTER 签名；不能解释成自动清理或未知访客。",
      );
    }
  };

  const dialogueCards = [
    {
      id: "b",
      text: "先别开门，导出还差六分钟。",
    },
    { id: "c", text: "她还在里面。" },
    {
      id: "d",
      text: "［六次敲击］陈默在走廊唱回偏低的第七码。",
    },
    {
      id: "a",
      text: "把 B 棚打开，母带归我。",
    },
  ];

  const shuffledSegments = [4, 1, 6, 2, 7, 3, 5];

  const playComparison = (nextSpeed = speed, nextPitch = pitch) => {
    inspectPlay(`compare:${nextSpeed}:${nextPitch}`);
  };

  const guideReadyToVerify =
    guideStep >= GUIDE_CONTENT[stage].steps.length - 1;
  const guideDetail =
    stage === 6 && guideStep === 2
      ? `还需试听 ${7 - heardFragments.length} 段；每段只计一次`
      : stage === 6 && guideStep === 3
        ? `已经排入 ${segmentOrder.length}/7 段`
        : stage === 6 && guideStep === 4
          ? "事故链已写入；现在检查七次远端删改"
        : undefined;

  const locateNextAction = () => {
    const target = puzzleRootRef.current?.querySelector<HTMLElement>(
      ".is-next-action:not([disabled])",
    );
    if (!target) return;

    target.scrollIntoView({ behavior: "smooth", block: "center" });
    window.setTimeout(() => target.focus({ preventScroll: true }), 260);
    target.classList.remove("is-located");
    window.requestAnimationFrame(() => target.classList.add("is-located"));

    if (locateTimerRef.current) {
      window.clearTimeout(locateTimerRef.current);
    }
    locateTimerRef.current = window.setTimeout(
      () => target.classList.remove("is-located"),
      1800,
    );
  };

  return (
    <div className="puzzle-stack" ref={puzzleRootRef}>
      <section
        className={`chain-transfer ${inputLoaded ? "is-loaded" : "is-waiting"}`}
        aria-label="跨章修复成果传递"
      >
        <div>
          <span>{stage === 0 ? "本次输入" : "上章成果"}</span>
          <strong>{CHAPTERS[stage].input}</strong>
          <small>
            {stage === 0
              ? "先建立基准，后续六次修复都将引用它。"
              : inputLoaded
                ? "已装入当前处理链"
                : "必须先装入，当前章的音频窗口才会开放。"}
        </small>
        </div>
        {stage > 0 && (
          <button
            type="button"
            disabled={inputLoaded}
            className={!inputLoaded ? "is-next-action" : ""}
            onClick={() => setInputLoaded(true)}
          >
            {inputLoaded ? "已装入 ✓" : "装入上章成果 →"}
          </button>
        )}
        <i aria-hidden="true">→</i>
        <div>
          <span>本章将写出</span>
          <strong>{CHAPTERS[stage].artifact}</strong>
          <small>{CHAPTERS[stage].nextUse}</small>
        </div>
      </section>
      <section className="red-thread" aria-label="贯穿全程的童声线索">
        <div>
          <span>贯穿线索 / {stage + 1} OF 7</span>
          <strong>{CHAPTERS[stage].threadClue}</strong>
        </div>
        <p>
          <b>本章异常</b>
          {CHAPTERS[stage].horror}
        </p>
      </section>
      {inputLoaded && (
        <>
      <GuidedPanel
        stage={stage}
        step={guideStep}
        currentDetail={guideDetail}
        onLocate={locateNextAction}
      />
      <div className="puzzle-surface" aria-label="当前谜题操作区">
      {stage === 0 && (
        <>
          <div className="audio-scene-compare fingerprint-tracks">
            {[
              {
                label: "原始练习 / 乔岚保留",
                detail: "第七码前先吸气，晚 0.7 秒进入，尾音向下",
                option: "take-a",
              },
              {
                label: "后期修正版 / 唐肃工程",
                detail: "吸气被抹除，准点进入，尾音被拉平",
                option: "take-b",
              },
              {
                label: "正式混音 / 听证附件",
                detail: "第七码整段成为空白",
                option: "final",
              },
            ].map((track, index) => (
              <button
                type="button"
                key={track.option}
                disabled={guideStep < index}
                className={guideStep === index ? "is-next-action" : ""}
                onClick={() => guidedPlay(track.option, index)}
              >
                <span>{track.label}</span>
                <strong>{track.detail}</strong>
                <div
                  className={`call-response-strip ${
                    track.option === "final" ? "is-broken" : ""
                  }`}
                  aria-hidden="true"
                >
                  {Array.from({ length: 7 }, (_, beatIndex) => (
                    <i
                      key={beatIndex}
                      className={
                        beatIndex === 6
                          ? track.option === "final"
                            ? "is-missing"
                            : "is-response"
                          : ""
                      }
                    />
                  ))}
                </div>
                <em>{guideStep > index ? "重新试听" : "试听此版本"}</em>
              </button>
            ))}
          </div>
          <div className="meaning-choices fingerprint-choices">
            <span>哪组特征属于没有被修音前的童年陈默？</span>
            <div>
              {[
                ["early", "提前进入 · 无吸气 · 尾音升高", 1],
                ["flat", "准点进入 · 无吸气 · 尾音平直", 3],
                ["anchor", "先吸气 · 晚 0.7 秒 · 尾音向下", 6],
              ].map(([id, label, value]) => (
                <button
                  type="button"
                  key={String(id)}
                  disabled={guideStep < 3}
                  className={`${beat === Number(value) ? "is-selected" : ""} ${
                    guideStep === 3 ? "is-next-action" : ""
                  }`}
                  onClick={() => {
                    setBeat(Number(value));
                    recordObservation(`signature:${String(id)}`);
                    advanceGuide(3);
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {stage === 1 && (
        <>
          <div className="audio-scene-compare location-tracks">
            {[
              ["room:booth", "B 棚室内话筒", "六次近距离门板声；回应位置为空"],
              ["room:control", "控制室话筒", "六次远距离敲击；只有机架低频"],
              ["room:corridor", "走廊话筒", "六次隔门敲击；0.7 秒后出现童声锚"],
            ].map(([option, label, detail], index) => (
              <button
                type="button"
                key={option}
                disabled={guideStep < index}
                className={guideStep === index ? "is-next-action" : ""}
                onClick={() => guidedPlay(option, index)}
              >
                <span>{label}</span>
                <strong>{detail}</strong>
                <div
                  className={`call-response-strip ${
                    option === "room:corridor" ? "" : "is-broken"
                  }`}
                  aria-label={detail}
                >
                  {Array.from({ length: 7 }, (_, beatIndex) => (
                    <i
                      key={beatIndex}
                      className={
                        beatIndex === 6
                          ? option === "room:corridor"
                            ? "is-response"
                            : "is-missing"
                          : ""
                      }
                    />
                  ))}
                </div>
                <em>{guideStep > index ? "重新试听" : "试听此话筒"}</em>
              </button>
            ))}
          </div>
          <div className="meaning-choices">
            <span>哪个位置同时出现上一章的三项声纹锚？</span>
            <div>
              {[
                ["booth", "B 棚室内"],
                ["control", "控制室"],
                ["corridor", "B 棚外走廊"],
              ].map(([id, label]) => (
                <button
                  type="button"
                  key={id}
                  disabled={guideStep < 3}
                  className={`${room === id ? "is-selected" : ""} ${
                    guideStep === 3 ? "is-next-action" : ""
                  }`}
                  onClick={() => {
                    setRoom(id);
                    recordObservation(`location:${id}`);
                    advanceGuide(3);
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {stage === 2 && (
        <>
          <div className="channel-switcher" aria-label="声道选择">
            {[
              ["mix", "MIX / 中央混音", 0],
              ["left", "L / 左声道", 1],
              ["right", "R / 右声道", 2],
            ].map(([id, label, step]) => (
              <SystemButton
                key={id}
                active={channel === String(id)}
                disabled={guideStep < Number(step)}
                className={guideStep === Number(step) ? "is-next-action" : ""}
                onClick={() => {
                  setChannel(String(id));
                  guidedPlay(String(id), Number(step));
                }}
              >
                {label}
              </SystemButton>
            ))}
          </div>
          <div className="sequence-builder">
            <div className="sequence-bank">
              {dialogueCards.map((card) => (
                <button
                  type="button"
                  key={card.id}
                  className={guideStep === 3 ? "is-next-action" : ""}
                  disabled={
                    guideStep < 3 || dialogueOrder.includes(card.id)
                  }
                  onClick={() => {
                    const next = [...dialogueOrder, card.id];
                    setDialogueOrder(next);
                    if (next.length === dialogueCards.length) {
                      advanceGuide(3);
                    }
                  }}
                >
                  <span>残句 {card.id.toUpperCase()}</span>
                  {card.text}
                </button>
              ))}
            </div>
            <div className="sequence-output">
              <span>恢复顺序</span>
              {dialogueOrder.length === 0 ? (
                <em>依次选择三句话</em>
              ) : (
                dialogueOrder.map((id, index) => (
                  <b key={`${id}-${index}`}>{id.toUpperCase()}</b>
                ))
              )}
              <button
                type="button"
                disabled={guideStep < 3}
                onClick={() => {
                  setDialogueOrder([]);
                  if (guideStep >= 4) setGuideStep(3);
                }}
              >
                清空
              </button>
            </div>
          </div>
        </>
      )}

      {stage === 3 && (
        <>
          <div className="guided-primary-action">
            <SystemButton
              active={guideStep === 0}
              className={guideStep === 0 ? "is-next-action" : ""}
              onClick={() => guidedPlay("default", 0)}
            >
              {guideStep > 0 ? "重新试听合并副本" : "试听合并副本"}
            </SystemButton>
          </div>
          <div className={`seam-timeline ${cutsVisible ? "show-cuts" : ""}`}>
            {["吸气", "回应", "小默", "脚步", "关门", "口述", "底噪"].map((label, index) => (
              <span key={label} className={[1, 2, 3].includes(index) ? "jump" : ""}>
                {label}
              </span>
            ))}
            <i className="seam-marker one" />
            <i className="seam-marker two" />
          </div>
          <SystemButton
            active={cutsVisible}
            disabled={guideStep < 1}
            className={guideStep === 1 ? "is-next-action" : ""}
            onClick={() => {
              const next = !cutsVisible;
              setCutsVisible(next);
              inspectPlay(next ? "seam" : "default");
              if (next) advanceGuide(1);
            }}
          >
            {cutsVisible ? "三道定向剪口已放大" : "放大三道连续剪口"}
          </SystemButton>
          <div className="raw-fragment-grid">
            <button
              type="button"
              disabled={guideStep < 2}
              className={guideStep === 2 ? "is-next-action" : ""}
              onClick={() => guidedPlay("raw:tang", 2)}
            >
              <span>剪口前 / 事故语境</span>
              <strong>“先别开门。导出，还差六分钟。”</strong>
              <small>成年人对白在官方副本中完整保留</small>
            </button>
            <button
              type="button"
              disabled={guideStep < 3}
              className={guideStep === 3 ? "is-next-action" : ""}
              onClick={() => guidedPlay("raw:chen", 3)}
            >
              <span>原轨补回 / 被删窗口</span>
              <strong>童声回应 → “小默” → 走廊脚步</strong>
              <small>三种痕迹在听证副本中连续缺席</small>
            </button>
          </div>
          <div className="splice-choice-heading">
            <span>三道剪口共同针对的是什么？</span>
          </div>
          <div className="speaker-grid splice-choice-grid">
            {[
              [
                "child-erasure",
                "系统性删除孩子存在过的痕迹",
                "声纹、名字和行动位置同时消失",
              ],
              [
                "adult-shortening",
                "只是压缩成年人之间的争吵",
                "无法解释为什么“小默”和童声都被切掉",
              ],
              [
                "noise-cleaning",
                "普通降噪误删了弱小声音",
                "无法解释走廊脚步与名字也在独立窗口消失",
              ],
            ].map(([id, name, relation]) => (
              <button
                type="button"
                key={id}
                disabled={guideStep < 4}
                className={`${speaker === String(id) ? "is-selected" : ""} ${
                  guideStep === 4 ? "is-next-action" : ""
                }`}
                onClick={() => {
                  setSpeaker(String(id));
                  guidedInspect(`erasure:${id}`, 4);
                }}
              >
                <span>{name}</span>
                <small>{relation}</small>
                <em>选择这种还原</em>
              </button>
            ))}
          </div>
        </>
      )}

      {stage === 4 && (
        <>
          <div className="contour-compare">
            <Contour
              label="乔岚 / 2012"
              values={[3, 6, 6, 4, 2, 5, 1]}
              current={guideStep === 0}
              onPlay={() => guidedPlay("source", 0)}
            />
            <Contour
              label="《无潮之夜》/ 2014"
              values={
                speed === "0.82" && pitch === "-3"
                  ? [3, 6, 6, 4, 2, 5, 1]
                  : [5, 7, 6, 5, 4, 6, 4]
              }
              warning
              disabled={guideStep < 1}
              current={guideStep === 1}
              onPlay={() => guidedPlay("released", 1)}
            />
          </div>
          <div className="parameter-row">
            <div>
              <span>速度</span>
              {["1.00", "0.92", "0.82"].map((value) => (
                <SystemButton
                  key={value}
                  active={speed === value}
                  disabled={guideStep < 2}
                  className={guideStep === 2 ? "is-next-action" : ""}
                  onClick={() => {
                    setSpeed(value);
                    playComparison(value, pitch);
                    advanceGuide(2);
                  }}
                >
                  {value}×
                </SystemButton>
              ))}
            </div>
            <div>
              <span>移调</span>
              {["0", "-2", "-3"].map((value) => (
                <SystemButton
                  key={value}
                  active={pitch === value}
                  disabled={guideStep < 3}
                  className={guideStep === 3 ? "is-next-action" : ""}
                  onClick={() => {
                    setPitch(value);
                    playComparison(speed, value);
                    advanceGuide(3);
                  }}
                >
                  {value} 半音
                </SystemButton>
              ))}
            </div>
          </div>
          <div className={`overlap-listen ${speed === "0.82" && pitch === "-3" ? "is-aligned" : ""}`}>
            <span>叠听状态</span>
            <strong>
              {speed === "0.82" && pitch === "-3"
                ? "七次起音已经像同一次演奏"
                : "仍能听见双重起音"}
            </strong>
            <small>
              可视辅助只显示两排起音是否落在一起，不提供自动得分。
            </small>
          </div>
          <div className="release-transient-reference">
            <span>发行版尾部 / 六次打击</span>
            <div className="transient-strip" aria-label="发行版六次打击的间距轮廓">
              {[42, 55, 38, 62, 45, 28].map((height, index) => (
                <i key={index} style={{ height: `${height}%` }} />
              ))}
            </div>
            <small>试听候选材料，比较六次间距与第六下之后的尾声。</small>
          </div>
          <div className="sample-choices">
            {([
              ["new", "重新演奏的木鱼", [32, 44, 28, 48, 36, 42]],
              ["door", "B 棚红门敲击", [42, 55, 38, 62, 45, 28]],
              ["relay", "机房继电器", [24, 24, 24, 24, 24, 24]],
            ] satisfies Array<[string, string, number[]]>).map(([id, label, pattern]) => (
              <button
                type="button"
                key={id}
                disabled={guideStep < 4}
                className={`${sample === id ? "is-selected" : ""} ${
                  guideStep === 4 ? "is-next-action" : ""
                }`}
                onClick={() => {
                  setSample(id);
                  inspectPlay(`sample:${id}`);
                  advanceGuide(4);
                }}
              >
                <span>{label}</span>
                <div className="transient-strip" aria-hidden="true">
                  {pattern.map((height, index) => (
                    <i key={index} style={{ height: `${height}%` }} />
                  ))}
                </div>
                <small>试听六次间距与第六下尾声</small>
              </button>
            ))}
          </div>
        </>
      )}

      {stage === 5 && (
        <>
          <div className="relay-window-actions" aria-label="依次检查时间窗">
            {["23:11", "22:49", "22:50"].map((time, index) => (
              <button
                type="button"
                key={time}
                disabled={guideStep < index}
                className={
                  guideStep === index ? "is-next-action" : ""
                }
                onClick={() =>
                  guidedPlay(`time:control@${time}`, index)
                }
              >
                <span>
                  {time === "23:11"
                    ? "载入六分钟残句位置"
                    : time === "22:49"
                      ? "向前回查正常规律"
                      : "定位首次缺席"}
                </span>
                <strong>{time}</strong>
                <div className={`relay-listen-strip ${time !== "22:49" ? "is-silent" : ""}`}>
                  {Array.from({ length: 3 }, (_, pulse) => (
                    <i key={pulse} />
                  ))}
                </div>
              </button>
            ))}
          </div>
          <div className="relay-time-choices">
            <span>选择规律机械点击第一次消失的时间窗</span>
            <div>
              {["22:49", "22:50", "23:11"].map((time) => (
                <button
                  type="button"
                  key={time}
                  disabled={guideStep < 3}
                  className={`${relayTime === time ? "is-selected" : ""} ${
                    guideStep === 3 ? "is-next-action" : ""
                  }`}
                  onClick={() => {
                    setRelayTime(time);
                    recordObservation(`time:${time}`);
                    advanceGuide(3);
                  }}
                >
                  {time}
                </button>
              ))}
            </div>
          </div>
          <div className="record-comparison">
            <button
              type="button"
              disabled={guideStep < 4}
              className={guideStep === 4 ? "is-next-action" : ""}
              onClick={() => guidedPlay("record:full", 4)}
            >
              <span>本地完整口述</span>
              <strong>包含警报旁路与删除孩子两次承认</strong>
              <small>救人与责任保留在同一版本</small>
            </button>
            <button
              type="button"
              disabled={guideStep < 5}
              className={guideStep === 5 ? "is-next-action" : ""}
              onClick={() => guidedPlay("record:clean", 5)}
            >
              <span>远端清理版本</span>
              <strong>06_CLEAN_FATHER.wav</strong>
              <small>只保留“父亲救出孩子”的结果</small>
            </button>
          </div>
          <div className="clean-version">
            <div>
              <span>版本决定</span>
              <strong>哪一份录音没有把救人变成免责？</strong>
              <small>两次静音都必须保留：先让警报安静，后来又让孩子从记录里安静。</small>
              <div className="version-auditions">
                <button
                  type="button"
                  disabled={guideStep < 6}
                  className={`${
                    versionChoice === "full" ? "is-selected" : ""
                  } ${guideStep === 6 ? "is-next-action" : ""}`}
                  onClick={() => {
                    setVersionChoice("full");
                    advanceGuide(6);
                  }}
                >
                  选择完整记录
                </button>
                <button
                  type="button"
                  disabled={guideStep < 6}
                  className={`${
                    versionChoice === "clean" ? "is-selected" : ""
                  } ${guideStep === 6 ? "is-next-action" : ""}`}
                  onClick={() => {
                    setVersionChoice("clean");
                    advanceGuide(6);
                  }}
                >
                  选择清理版本
                </button>
              </div>
            </div>
            <div className="version-decision">
              <span>当前决定</span>
              <strong>
                {versionChoice === "full"
                  ? "保留完整记录"
                  : versionChoice === "clean"
                    ? "采用清理版本"
                    : "等待选择"}
              </strong>
            </div>
          </div>
        </>
      )}

      {stage === 6 && (
        <>
          <div className="phase-control">
            <SystemButton
              active={guideStep === 0}
              className={guideStep === 0 ? "is-next-action" : ""}
              onClick={() => guidedPlay("phase:off", 0)}
            >
              {guideStep > 0 ? "重听覆盖状态" : "试听覆盖状态"}
            </SystemButton>
            <SystemButton
              active={inverted}
              disabled={guideStep < 1}
              className={guideStep === 1 ? "is-next-action" : ""}
              onClick={() => {
                if (!inverted) {
                  setInverted(true);
                  guidedPlay("phase:on", 1);
                } else {
                  inspectPlay("phase:on");
                }
              }}
            >
              Ø {inverted ? "反相已开启" : "对隐藏副本反相"}
            </SystemButton>
            <p>
              {inverted
                ? "共同音乐已抵消。七段残句与环境动作可以分别试听。"
                : "两条相同音乐仍叠在一起，房间声不可辨认。"}
            </p>
          </div>
          <div className={`segment-bank ${inverted ? "is-visible" : ""}`}>
            {shuffledSegments.map((segment) => {
              const meta = FRAGMENT_META[segment];
              return (
                <button
                  type="button"
                  key={segment}
                  disabled={
                    !inverted ||
                    guideStep < 2 ||
                    (guideStep >= 3 && segmentOrder.includes(segment))
                  }
                  className={
                    `${heardFragments.includes(segment) ? "is-heard" : ""} ${
                      guideStep === 2 || guideStep === 3
                        ? "is-next-action"
                        : ""
                    }`
                  }
                  onClick={() => {
                    inspectPlay(`fragment:${segment}`);
                    if (guideStep === 2) {
                      if (!heardFragments.includes(segment)) {
                        const next = [...heardFragments, segment];
                        setHeardFragments(next);
                        if (next.length === shuffledSegments.length) {
                          advanceGuide(2);
                        }
                      }
                    } else if (guideStep >= 3) {
                      const next = [...segmentOrder, segment];
                      setSegmentOrder(next);
                      if (next.length === shuffledSegments.length) {
                        advanceGuide(3);
                      }
                    }
                  }}
                >
                  <span>母带残片</span>
                  <strong>{meta.label}</strong>
                  <small>
                    {heardFragments.includes(segment)
                      ? meta.transcript
                      : "先试听以生成听写"}
                  </small>
                  {heardFragments.includes(segment) && (
                    <>
                      <b>{meta.sound}</b>
                      <q>{meta.constraint}</q>
                    </>
                  )}
                  <em>{guideStep === 2 ? "试听" : "排入"}</em>
                </button>
              );
            })}
          </div>
          <div className="segment-output">
            <span>07_ROOM 写入顺序</span>
            <div>
              {segmentOrder.length === 0
                ? "等待片段"
                : segmentOrder.map((segment) => (
                    <b key={segment}>{FRAGMENT_META[segment].label}</b>
                  ))}
            </div>
            <button
              type="button"
              onClick={() => {
                setSegmentOrder([]);
                if (guideStep >= 4) setGuideStep(3);
              }}
            >
              清空
            </button>
          </div>
          <div className="listener-proof">
            <div>
              <span>当前会话 / 七次删改比对</span>
              <strong>
                {guideStep < 4
                  ? "事故链完成后才能检查"
                  : "7 / 7 次删改命中历史剪口"}
              </strong>
              <small>
                声纹锚、走廊方位、童声时间钉、删除规则、作品原轨、警报旁路与完整事故链，
                都在本地恢复后 0.7 秒内遭到同一远端游标改写。
              </small>
            </div>
            <button
              type="button"
              disabled={guideStep < 4}
              className={guideStep === 4 ? "is-next-action" : ""}
              onClick={() => {
                recordObservation("remote:fingerprint");
                advanceGuide(4);
              }}
            >
              {guideStep > 4 ? "删除指纹已比对" : "比对历史剪口与当前删改"}
            </button>
          </div>
          <div className="meaning-choices listener-identity">
            <span>监听者 02 为什么知道全部剪口？</span>
            <div>
              {[
                ["auto-clean", "普通自动降噪程序"],
                ["unknown", "偶然进入工程的未知访客"],
                ["master-key", "持有唐肃旧主密钥 TS_MASTER 的人"],
              ].map(([id, label]) => (
                <button
                  type="button"
                  key={id}
                  disabled={guideStep < 5}
                  className={`${listenerIdentity === id ? "is-selected" : ""} ${
                    guideStep === 5 ? "is-next-action" : ""
                  }`}
                  onClick={() => {
                    setListenerIdentity(id);
                    recordObservation(`listener:${id}`);
                    advanceGuide(5);
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {textAssist && (
        <div className="text-assist-note">
          <span>文字辅助</span>
          当前声音已转换为敲击位置、呼吸断点、机械点击、残句听写和可选文本。辅助信息复述听见了什么，不直接填写推理答案。
        </div>
      )}

      {message && <p className="puzzle-message">{message}</p>}
      </div>

      {hintOpen && (
        <section className="hint-drawer" aria-label="当前步骤提示">
          <div>
            <span>当前提示</span>
            <p>
              {hintLevel === 0
                ? "先尝试当前高亮操作。提示会从方向逐步增加到正确操作，不会扣除进度。"
                : HINTS[stage][Math.min(hintLevel - 1, 2)]}
            </p>
          </div>
          <SystemButton
            onClick={() => {
              onHint();
              setHintOpen(true);
            }}
            disabled={hintLevel >= 3}
          >
            {hintLevel === 0
              ? "显示第一层提示"
              : hintLevel < 3
                ? "再明确一点"
                : "已给出正确操作"}
          </SystemButton>
        </section>
      )}

      <div className="puzzle-actions puzzle-action-dock">
        <SystemButton
          className="dock-locate-button"
          onClick={locateNextAction}
        >
          ↓ 定位下一步
        </SystemButton>
        <SystemButton
          active={hintOpen}
          onClick={() => setHintOpen((open) => !open)}
        >
          {hintOpen ? "收起提示" : "打开提示"}
        </SystemButton>
        {hintLevel >= 3 && (
          <SystemButton onClick={applyCorrectOperation}>
            装入正确操作
          </SystemButton>
        )}
        <button
          type="button"
          className={`verify-button ${
            guideReadyToVerify ? "is-next-action" : ""
          }`}
          disabled={!guideReadyToVerify}
          onClick={verify}
        >
          {guideReadyToVerify ? "提交本章结论" : "请先完成当前步骤"}
        </button>
      </div>
        </>
      )}
    </div>
  );
}

function Contour({
  label,
  values,
  warning = false,
  onPlay,
  disabled = false,
  current = false,
}: {
  label: string;
  values: number[];
  warning?: boolean;
  onPlay?: () => void;
  disabled?: boolean;
  current?: boolean;
}) {
  return (
    <div className={warning ? "contour warning" : "contour"}>
      <div className="contour-heading">
        <span>{label}</span>
        {onPlay && (
          <button
            type="button"
            className={current ? "is-next-action" : ""}
            disabled={disabled}
            onClick={onPlay}
          >
            试听
          </button>
        )}
      </div>
      <div className="contour-bars">
        {values.map((value, index) => (
          <i key={index} style={{ height: `${value * 12}%` }}>
            <b>{index + 1}</b>
          </i>
        ))}
      </div>
    </div>
  );
}

function ReviewPanel({
  chapter,
  onBack,
  onPlay,
  playing,
}: {
  chapter: Chapter;
  onBack: () => void;
  onPlay: () => void;
  playing: boolean;
}) {
  return (
    <div className="review-panel">
      <p className="review-label">已确认事实</p>
      <h3>{chapter.fact}</h3>
      <div className="review-artifact">
        <span>已写入处理链</span>
        <strong>{chapter.artifact}</strong>
        <small>{chapter.nextUse}</small>
      </div>
      <div className="review-thread">
        <span>贯穿线索</span>
        <strong>{chapter.threadClue}</strong>
        <small>{chapter.horror}</small>
      </div>
      <div className="transcript-card">
        {chapter.transcript.map((line) => (
          <p key={line}>{line}</p>
        ))}
      </div>
      <blockquote>{chapter.monologue}</blockquote>
      <div className="review-actions">
        <SystemButton onClick={onPlay}>
          {playing ? "正在播放…" : "重放声音线索"}
        </SystemButton>
        <button type="button" className="verify-button" onClick={onBack}>
          返回当前任务
        </button>
      </div>
    </div>
  );
}

function Finale({
  soundEnabled,
  onSound,
  onFinish,
}: {
  soundEnabled: boolean;
  onSound: () => void;
  onFinish: (ending: EndingId) => void;
}) {
  const audio = useAudio(soundEnabled);
  const [note, setNote] = useState<string | null>(null);
  const [noteSolved, setNoteSolved] = useState(false);
  const [facts, setFacts] = useState<string[]>([]);
  const [conclusionSolved, setConclusionSolved] = useState(false);
  const [message, setMessage] = useState("");
  const [failures, setFailures] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [voiceCue, setVoiceCue] = useState<VoiceCue | null>(null);
  const playbackTimerRef = useRef<number | null>(null);

  const playFinal = async (option = "complete") => {
    setVoiceCue(null);
    const result = await audio.play(7, option, setVoiceCue);
    setPlaying(result.started);
    if (!result.started) {
      if (result.reason === "blocked") {
        setMessage("浏览器未允许播放。请再次点击当前音频按钮重试。");
      }
      return;
    }
    if (playbackTimerRef.current) {
      window.clearTimeout(playbackTimerRef.current);
    }
    playbackTimerRef.current = window.setTimeout(
      () => {
        setPlaying(false);
        setVoiceCue(null);
      },
      result.duration,
    );
  };

  const toggleSound = () => {
    if (soundEnabled) setVoiceCue(null);
    onSound();
  };

  const verifyNote = () => {
    if (note === "low") {
      setNoteSolved(true);
      setMessage("");
      void playFinal();
    } else {
      const next = failures + 1;
      setFailures(next);
      setMessage(
        next >= 2
          ? "正确答案：选择“吸气后迟到 0.7 秒、尾音偏低”的原始声纹。"
          : "这个版本更标准，却不同时具备第一章确认的三项声纹锚。",
      );
    }
  };

  const currentChainStep =
    FINAL_CHAIN_STEPS[
      Math.min(facts.length, FINAL_CHAIN_STEPS.length - 1)
    ];
  const chainReady = facts.length === FINAL_CHAIN_STEPS.length;

  const chooseChainFact = (choice: {
    id: string;
    text: string;
    correct: boolean;
  }) => {
    if (choice.correct) {
      const nextCount = facts.length + 1;
      setFacts((items) => [...items, currentChainStep.id]);
      setMessage(
        nextCount === FINAL_CHAIN_STEPS.length
          ? "三项责任结论已经建立。先检查综合结果，再进入发布决定。"
          : `已写入：${choice.text}。现在继续下一项。`,
      );
      return;
    }
    setMessage(currentChainStep.wrong);
  };

  const confirmConclusion = () => {
    setConclusionSolved(true);
    setMessage("");
    void playFinal("listener-final");
  };

  return (
    <main className="finale-shell">
      <header className="finale-header">
        <div>
          <span>NØ7 / FINAL WRITE</span>
          <h1>第七码</h1>
        </div>
        <SystemButton active={soundEnabled} onClick={toggleSound}>
          声音 {soundEnabled ? "开启" : "关闭"}
        </SystemButton>
      </header>

      <section className="finale-console">
        <LiveVoiceCue cue={voiceCue} soundEnabled={soundEnabled} />
        {!noteSolved ? (
          <>
            <p className="chapter-index">最后一项修复</p>
            <h2>把当晚被删掉、却真实唱出的回应放回第七拍。</h2>
            <p>
              不需要辨认音高。使用第一章建立的声纹锚，选择同时保留吸气、0.7
              秒延迟和下降尾音的版本。
            </p>
            <div className="final-note-grid">
              {[
                ["high", "提前进入 · 尾音修高", 78],
                ["mid", "准点进入 · 尾音修平", 54],
                ["low", "先吸气 · 晚 0.7 秒 · 尾音偏低", 28],
              ].map(([id, label, height]) => (
                <button
                  type="button"
                  key={String(id)}
                  className={note === id ? "is-selected" : ""}
                  onClick={() => {
                    const selected = String(id);
                    setNote(selected);
                    void playFinal(`note:${selected}`);
                  }}
                >
                  <i style={{ height: `${height}%` }} />
                  <span>{label}</span>
                </button>
              ))}
            </div>
            {message && <p className="puzzle-message">{message}</p>}
            <button type="button" className="verify-button" onClick={verifyNote}>
              写入第七拍
            </button>
          </>
        ) : !conclusionSolved ? (
          <>
            <div className="final-response">
              <span>{playing ? "正在播放走廊原始回应…" : "被删回应已恢复"}</span>
              <blockquote>
                小默，这个音低了一点。别重唱。七拍都在，我们就知道对方还听得见。
                十四年前我回答过；今天，也有人听见了。
              </blockquote>
            </div>
            <p className="chapter-index">建立最终结论</p>
            <h2>七条贯穿线索已经闭合。回答谁唱过、谁删过、谁仍在删除。</h2>
            <p className="conclusion-instruction">
              每次只回答当前问题。黄色卡片是现在需要处理的位置；选对后会自动写入并进入下一项。
            </p>
            <div className="conclusion-builder">
              <aside className="chain-ledger" aria-label="最终事实链进度">
                <header>
                  <div>
                    <span>事实链进度</span>
                    <strong>
                      {facts.length}/{FINAL_CHAIN_STEPS.length}
                    </strong>
                  </div>
                  <i>
                    <b
                      style={{
                        width: `${(facts.length / FINAL_CHAIN_STEPS.length) * 100}%`,
                      }}
                    />
                  </i>
                </header>
                <ol>
                  {FINAL_CHAIN_STEPS.map((step, index) => {
                    const complete = facts.includes(step.id);
                    const current = index === facts.length && !chainReady;
                    return (
                      <li
                        key={step.id}
                        className={`${complete ? "is-complete" : ""} ${
                          current ? "is-current" : ""
                        }`}
                        aria-current={current ? "step" : undefined}
                      >
                        <span>{String(index + 1).padStart(2, "0")}</span>
                        <div>
                          <b>{step.label.split(" / ")[1]}</b>
                          <p>
                            {complete
                              ? step.choices.find((choice) => choice.correct)
                                  ?.text
                              : current
                                ? "正在根据录音确认"
                                : "等待上一项写入"}
                          </p>
                        </div>
                      </li>
                    );
                  })}
                </ol>
              </aside>

              <section className="chain-workspace" aria-live="polite">
                {!chainReady ? (
                  <>
                    <div className="chain-step-heading">
                      <span>{currentChainStep.label}</span>
                      <b>
                        当前只处理第 {facts.length + 1} 项，共{" "}
                        {FINAL_CHAIN_STEPS.length} 项
                      </b>
                    </div>
                    <h3>{currentChainStep.question}</h3>
                    <div className="chain-evidence">
                      <span>证据来源</span>
                      <b>{currentChainStep.source}</b>
                      <p>{currentChainStep.evidence}</p>
                    </div>
                    <p className="chain-prompt">
                      根据上面的录音记录，点击能被证据直接支持的结论：
                    </p>
                    <div className="chain-options">
                      {currentChainStep.choices.map((choice) => (
                        <button
                          type="button"
                          key={choice.id}
                          onClick={() => chooseChainFact(choice)}
                        >
                          <span>{choice.text}</span>
                          <b>写入这一项 →</b>
                        </button>
                      ))}
                    </div>
                    {message && <p className="chain-feedback">{message}</p>}
                  </>
                ) : (
                  <div className="chain-complete">
                    <span>CHAIN VERIFIED / 03 OF 03</span>
                    <h3>完整事实链已经建立。</h3>
                    <p>
                      唐肃的行为、陈渡的责任和被删除的陈默都被保留。你不需要再勾选或背诵结论。
                    </p>
                    <ol>
                      {FINAL_CHAIN_STEPS.map((step, index) => (
                        <li key={step.id}>
                          <span>{String(index + 1).padStart(2, "0")}</span>
                          <p>
                            {
                              step.choices.find((choice) => choice.correct)
                                ?.text
                            }
                          </p>
                        </li>
                      ))}
                    </ol>
                    {message && <p className="chain-feedback">{message}</p>}
                    <button
                      type="button"
                      className="verify-button"
                      onClick={confirmConclusion}
                    >
                      因果链已完成，进入发布决定
                    </button>
                  </div>
                )}
              </section>
            </div>
          </>
        ) : (
          <>
            <p className="chapter-index">发布决定</p>
            <h2>监听者 02 正在等待你选择一个版本。</h2>
            <p>
              真相不会因选择改变。改变的是你允许其他人听见哪一部分。
            </p>
            <div className="ending-grid">
              {(Object.entries(ENDINGS) as [EndingId, (typeof ENDINGS)[EndingId]][]).map(
                ([id, ending]) => (
                  <button type="button" key={id} onClick={() => onFinish(id)}>
                    <span>{ending.label}</span>
                    <p>{ending.kicker}</p>
                    <b>选择此版本 →</b>
                  </button>
                ),
              )}
            </div>
          </>
        )}
      </section>
    </main>
  );
}

function EndingScreen({
  endingId,
  soundEnabled,
  onSound,
  onRestart,
}: {
  endingId: EndingId;
  soundEnabled: boolean;
  onSound: () => void;
  onRestart: () => void;
}) {
  const ending = ENDINGS[endingId];
  const audio = useAudio(soundEnabled);
  const [revealedLogs, setRevealedLogs] = useState(0);
  const [voiceRevealed, setVoiceRevealed] = useState(false);
  const [voiceCue, setVoiceCue] = useState<VoiceCue | null>(null);
  const [playing, setPlaying] = useState(false);
  const [audioError, setAudioError] = useState("");
  const playbackTimerRef = useRef<number | null>(null);
  const anomalyVisible = revealedLogs === ending.body.length;

  const revealNextLog = () => {
    setRevealedLogs((current) => Math.min(ending.body.length, current + 1));
  };

  const playAnomaly = async () => {
    setAudioError("");
    setVoiceCue(null);
    const result = await audio.play(
      7,
      `ending:${endingId}`,
      setVoiceCue,
    );
    if (!result.started && result.reason === "blocked") {
      setPlaying(false);
      setAudioError("浏览器未允许播放。请再次点击这段人声重试。");
      return;
    }
    setVoiceRevealed(true);
    setPlaying(result.started);
    if (!result.started) return;
    if (playbackTimerRef.current) {
      window.clearTimeout(playbackTimerRef.current);
    }
    playbackTimerRef.current = window.setTimeout(() => {
      setPlaying(false);
      setVoiceCue(null);
    }, result.duration);
  };

  const toggleEndingSound = () => {
    if (soundEnabled) setVoiceCue(null);
    onSound();
  };

  return (
    <main
      className={`ending-shell ending-${endingId} ${
        anomalyVisible ? "has-anomaly" : ""
      }`}
    >
      <section className="ending-terminal">
        <header className="ending-terminal-header">
          <div>
            <span>NØ7 / RELEASE TRACE</span>
            <b>{ending.label}</b>
          </div>
          <div>
            <span className={anomalyVisible ? "is-alert" : ""}>
              {anomalyVisible ? "监听状态：异常" : "监听者：1"}
            </span>
            <SystemButton active={soundEnabled} onClick={toggleEndingSound}>
              声音 {soundEnabled ? "开启" : "关闭"}
            </SystemButton>
          </div>
        </header>

        <div className="ending-decision">
          <p className="chapter-index">发布选择已锁定</p>
          <h1>{ending.kicker}</h1>
          <p>
            系统正在逐条写入结果。读取完三条日志后，工程才会真正关闭。
          </p>
        </div>

        <div
          className="ending-write-progress"
          aria-label={`已读取 ${revealedLogs} 条，共 ${ending.body.length} 条发布日志`}
        >
          {ending.body.map((_, index) => (
            <i
              key={index}
              className={index < revealedLogs ? "is-written" : ""}
            />
          ))}
          <span>
            {String(revealedLogs).padStart(2, "0")} /{" "}
            {String(ending.body.length).padStart(2, "0")} WRITTEN
          </span>
        </div>

        <div className="ending-log-sequence" aria-live="polite">
          {ending.body.map((paragraph, index) => {
            const revealed = index < revealedLogs;
            const current = index === revealedLogs && !anomalyVisible;
            return (
              <article
                key={paragraph}
                className={`${revealed ? "is-revealed" : ""} ${
                  current ? "is-current" : ""
                }`}
              >
                <span>{String(index + 1).padStart(2, "0")}</span>
                <div>
                  <b>
                    {revealed
                      ? "写入完成"
                      : current
                        ? "等待读取"
                        : "内容已锁定"}
                  </b>
                  <p>
                    {revealed
                      ? paragraph
                      : current
                        ? "点击下方按钮读取这一条发布结果。"
                        : "完成上一条后解锁。"}
                  </p>
                </div>
              </article>
            );
          })}
        </div>

        {!anomalyVisible ? (
          <button
            type="button"
            className="ending-advance"
            onClick={revealNextLog}
          >
            <span>
              读取第 {revealedLogs + 1} 条发布日志
            </span>
            <b>继续写入 →</b>
          </button>
        ) : (
          <section className="ending-anomaly" aria-labelledby="anomaly-title">
            <div className="anomaly-heading">
              <span>未归档事件</span>
              <b>{ending.anomaly.code}</b>
            </div>
            <h2 id="anomaly-title">{ending.anomaly.title}</h2>
            <p>{ending.anomaly.detail}</p>
            <LiveVoiceCue cue={voiceCue} soundEnabled={soundEnabled} />

            {!voiceRevealed ? (
              <>
                <button
                  type="button"
                  className="anomaly-play"
                  onClick={() => void playAnomaly()}
                >
                  <span>{ending.anomaly.action}</span>
                  <b>这段人声不在发布清单内 →</b>
                </button>
                {audioError && (
                  <p className="audio-error" role="alert">
                    {audioError}
                  </p>
                )}
              </>
            ) : (
              <div className="ending-aftervoice">
                <div>
                  <span>{playing ? "正在播放未归档人声" : "播放结束"}</span>
                  <p>“{ending.anomaly.transcript}”</p>
                </div>
                <blockquote>{ending.final}</blockquote>
                <div className="last-note" aria-label="缺少回应的七音暗号">
                  {[42, 76, 76, 58, 31, 58, 3].map((height, index) => (
                    <i key={index} style={{ height: `${height}%` }} />
                  ))}
                </div>
                <button
                  type="button"
                  className="primary-entry"
                  onClick={onRestart}
                >
                  关闭工程并重新开始
                </button>
              </div>
            )}
          </section>
        )}
      </section>
    </main>
  );
}

export function AudioArchiveGame() {
  const [save, setSave] = useState<SaveState>(DEFAULT_SAVE);
  const [hydrated, setHydrated] = useState(false);
  const [viewChapter, setViewChapter] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [status, setStatus] = useState("等待操作");
  const [playbackKind, setPlaybackKind] = useState("未选择样本");
  const [playbackDurationMs, setPlaybackDurationMs] = useState(0);
  const [currentPlayback, setCurrentPlayback] =
    useState<PlaybackSelection | null>(null);
  const [voiceCue, setVoiceCue] = useState<VoiceCue | null>(null);
  const [resetArmed, setResetArmed] = useState(false);
  const [sideTab, setSideTab] = useState<"clues" | "story">("clues");
  const [chapterObservations, setChapterObservations] = useState<
    Record<number, Observation[]>
  >({});
  const playbackTimerRef = useRef<number | null>(null);
  const playbackRequestRef = useRef(0);
  const audio = useAudio(save.soundEnabled);

  useEffect(() => {
    let active = true;
    window.queueMicrotask(() => {
      if (!active) return;
      try {
        const stored = window.localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored) as Partial<SaveState>;
          const merged = { ...DEFAULT_SAVE, ...parsed };
          setSave(merged);
          setViewChapter(merged.currentChapter);
        }
      } catch {
        window.localStorage.removeItem(STORAGE_KEY);
      } finally {
        setHydrated(true);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(save));
  }, [hydrated, save]);

  const completedSet = useMemo(
    () => new Set(save.completed),
    [save.completed],
  );
  const isReview = completedSet.has(viewChapter);
  const chapter = CHAPTERS[viewChapter] ?? CHAPTERS[0];

  const updateSave = useCallback((patch: Partial<SaveState>) => {
    setSave((current) => ({ ...current, ...patch }));
  }, []);

  const stopPlayback = (
    nextStatus = "播放已停止；当前样本仍可重播",
    clearSelection = false,
  ) => {
    playbackRequestRef.current += 1;
    audio.stop();
    if (playbackTimerRef.current) {
      window.clearTimeout(playbackTimerRef.current);
      playbackTimerRef.current = null;
    }
    setPlaying(false);
    setVoiceCue(null);
    if (clearSelection) {
      setCurrentPlayback(null);
      setPlaybackKind("未选择样本");
      setPlaybackDurationMs(0);
    } else if (
      currentPlayback &&
      currentPlayback.stage === viewChapter
    ) {
      setPlaybackKind(
        describePlaybackKind(currentPlayback.stage, currentPlayback.option),
      );
    } else {
      setPlaybackKind("未选择样本");
    }
    setStatus(
      !clearSelection &&
        (!currentPlayback || currentPlayback.stage !== viewChapter) &&
        nextStatus === "播放已停止；当前样本仍可重播"
        ? "播放已停止；请在当前步骤选择样本"
        : nextStatus,
    );
  };

  const toggleSound = () => {
    if (save.soundEnabled) {
      stopPlayback("声音已关闭；文字与可视线索仍然有效");
    }
    updateSave({ soundEnabled: !save.soundEnabled });
  };

  const playTrack = async (option?: string) => {
    const selection = option
      ? { stage: viewChapter, option }
      : currentPlayback?.stage === viewChapter
        ? currentPlayback
        : null;
    if (!selection) {
      setPlaybackKind("未选择样本");
      setStatus("请先点击谜题中的试听按钮，再使用这里重播");
      return false;
    }
    const requestId = playbackRequestRef.current + 1;
    playbackRequestRef.current = requestId;
    audio.stop();
    if (playbackTimerRef.current) {
      window.clearTimeout(playbackTimerRef.current);
      playbackTimerRef.current = null;
    }
    setCurrentPlayback(selection);
    setPlaying(false);
    setPlaybackDurationMs(0);
    setVoiceCue(null);
    setStatus(
      save.soundEnabled
        ? "正在启用声音并载入当前样本…"
        : "声音关闭：显示可视波形",
    );
    const result = await audio.play(
      selection.stage,
      selection.option,
      setVoiceCue,
    );
    if (requestId !== playbackRequestRef.current) return false;
    if (!result.started) {
      setPlaying(false);
      if (result.reason === "sound-off") {
        setPlaybackKind(
          describePlaybackKind(selection.stage, selection.option),
        );
        setStatus("声音关闭：已保留文字与可视线索");
        return true;
      }
      setPlaybackKind("声音未启动");
      setStatus("浏览器未允许播放。请再次点击当前样本重试");
      return false;
    }
    const duration = result.duration;
    setPlaybackDurationMs(duration);
    setPlaying(true);
    setPlaybackKind(
      describePlaybackKind(selection.stage, selection.option),
    );
    setStatus(
      save.soundEnabled
        ? `试听：${describePlayback(selection.stage, selection.option)}`
        : "声音关闭：显示可视波形",
    );
    if (playbackTimerRef.current) {
      window.clearTimeout(playbackTimerRef.current);
    }
    playbackTimerRef.current = window.setTimeout(() => {
      setPlaying(false);
      setVoiceCue(null);
      setPlaybackKind(
        describePlaybackKind(selection.stage, selection.option),
      );
      setStatus(
        `已选择：${describePlayback(selection.stage, selection.option)}；可直接重播`,
      );
      playbackTimerRef.current = null;
    }, duration);
    return true;
  };

  const start = async () => {
    setVoiceCue(null);
    const result = await audio.play(7, "father-note", setVoiceCue);
    setPlaying(result.started);
    setPlaybackKind(result.started ? "人物对白" : "声音未启动");
    setCurrentPlayback(null);
    if (playbackTimerRef.current) {
      window.clearTimeout(playbackTimerRef.current);
    }
    if (result.started) {
      playbackTimerRef.current = window.setTimeout(() => {
        setPlaying(false);
        setVoiceCue(null);
        setPlaybackKind("未选择样本");
        setStatus("请点击当前步骤中的试听按钮");
        playbackTimerRef.current = null;
      }, result.duration);
    }
    setSave((current) => ({
      ...current,
      started: true,
      phase: current.phase === "cover" ? "investigation" : current.phase,
    }));
    setStatus(
      result.started
        ? "陈渡留下了一段未编号口述"
        : result.reason === "sound-off"
          ? "声音关闭：可以使用文字与可视线索"
          : "浏览器未允许播放；进入工程后请再次点击样本",
    );
  };

  const registerFailure = () => {
    setSave((current) => {
      const failureCounts = [...current.failureCounts];
      const hintLevels = [...current.hintLevels];
      failureCounts[viewChapter] = (failureCounts[viewChapter] ?? 0) + 1;
      if (failureCounts[viewChapter] >= 2) {
        hintLevels[viewChapter] = Math.max(hintLevels[viewChapter] ?? 0, 2);
      }
      return { ...current, failureCounts, hintLevels };
    });
    setStatus("校验未通过：没有扣除进度");
  };

  const completeChapter = () => {
    void audio.click();
    stopPlayback("本章播放已停止；下一章请重新选择样本", true);
    if (viewChapter < CHAPTERS.length - 1) {
      setViewChapter(viewChapter + 1);
    }
    setSave((current) => {
      const completed = Array.from(
        new Set([...current.completed, viewChapter]),
      ).sort((a, b) => a - b);
      if (viewChapter === CHAPTERS.length - 1) {
        return {
          ...current,
          completed,
          currentChapter: viewChapter,
          phase: "finale",
        };
      }
      return {
        ...current,
        completed,
        currentChapter: Math.max(current.currentChapter, viewChapter + 1),
      };
    });
    setStatus(`修复成果已写入：${chapter.artifact}`);
  };

  const requestHint = () => {
    setSave((current) => {
      const hintLevels = [...current.hintLevels];
      hintLevels[viewChapter] = Math.min(
        3,
        (hintLevels[viewChapter] ?? 0) + 1,
      );
      return { ...current, hintLevels };
    });
  };

  const resetGame = () => {
    if (!resetArmed) {
      setResetArmed(true);
      return;
    }
    stopPlayback("工程已重置", true);
    window.localStorage.removeItem(STORAGE_KEY);
    setSave(DEFAULT_SAVE);
    setViewChapter(0);
    setResetArmed(false);
  };

  useEffect(
    () => () => {
      if (playbackTimerRef.current) {
        window.clearTimeout(playbackTimerRef.current);
      }
    },
    [],
  );

  if (!save.started || save.phase === "cover") {
    return (
      <BootCover
        saved={save.completed.length > 0}
        soundEnabled={save.soundEnabled}
        textAssist={save.textAssist}
        onSound={toggleSound}
        onTextAssist={() => updateSave({ textAssist: !save.textAssist })}
        onStart={start}
      />
    );
  }

  if (save.phase === "finale") {
    return (
      <Finale
          soundEnabled={save.soundEnabled}
          onSound={toggleSound}
        onFinish={(ending) =>
          updateSave({ phase: "ending", ending })
        }
      />
    );
  }

  if (save.phase === "ending" && save.ending) {
    return (
      <EndingScreen
        endingId={save.ending}
        soundEnabled={save.soundEnabled}
        onSound={toggleSound}
        onRestart={() => {
          window.localStorage.removeItem(STORAGE_KEY);
          setSave(DEFAULT_SAVE);
          setViewChapter(0);
        }}
      />
    );
  }

  const hintLevel = save.hintLevels[viewChapter] ?? 0;
  const visibleObservations = chapterObservations[viewChapter] ?? [];
  const remoteAlert = REMOTE_ALERTS[viewChapter] ?? REMOTE_ALERTS[0];
  const selectedPlayback =
    currentPlayback?.stage === viewChapter ? currentPlayback : null;
  const playbackTimeMarks = getPlaybackTimeMarks(playbackDurationMs);
  const storyTrack = STORY_TRACKS[viewChapter];
  const syncCount = Math.min(
    SYNC_EVENTS.length,
    Math.max(1, save.completed.length + 1),
  );

  return (
    <main className={`game-shell threat-${remoteAlert.level}`}>
      <header className="top-bar">
        <div className="brand-lockup">
          <span>NØ7</span>
          <div>
            <strong>第七码</strong>
            <small>ARCHIVE RECOVERY NODE</small>
          </div>
        </div>
        <div className="top-readouts">
          <span>
            进度 <b>{save.completed.length}/7</b>
          </span>
          <span>
            TIME <b>{chapter.duration}</b>
          </span>
          <span className="listener-readout">
            <i />
            监听者 <b>2</b>
          </span>
        </div>
        <div className="top-actions">
          <SystemButton
            active={save.soundEnabled}
            onClick={toggleSound}
          >
            声音
          </SystemButton>
          <SystemButton
            active={save.textAssist}
            onClick={() => updateSave({ textAssist: !save.textAssist })}
          >
            文字辅助
          </SystemButton>
          <SystemButton danger={resetArmed} onClick={resetGame}>
            {resetArmed ? "再次点击重置" : "重置"}
          </SystemButton>
        </div>
      </header>

      <div className="workstation">
        <nav className="chapter-switcher" aria-label="事故母带的七个连续修复阶段">
          <div className="chapter-switcher-label">
            <span>修复记录</span>
            <b>{save.completed.length}/7 已确认</b>
          </div>
          <div className="chapter-switcher-scroll">
            {CHAPTERS.map((item) => {
              const complete = completedSet.has(item.id);
              const current = item.id === save.currentChapter;
              const locked = !complete && !current;
              return (
                <button
                  type="button"
                  key={item.id}
                  disabled={locked}
                  className={`${viewChapter === item.id ? "is-active" : ""} ${
                    complete ? "is-complete" : ""
                  } ${locked ? "is-locked" : ""}`}
                  onClick={() => {
                    stopPlayback(
                      "已切换章节；请重新选择要听的样本",
                      true,
                    );
                    setViewChapter(item.id);
                    setSideTab("clues");
                  }}
                >
                  <span>{item.number}</span>
                  <div>
                    <strong>{item.title}</strong>
                    <small>
                      {locked
                        ? "未解锁"
                        : complete
                          ? "成果已写入"
                          : "正在处理母带"}
                    </small>
                  </div>
                  <i />
                </button>
              );
            })}
          </div>
        </nav>

        <div className="investigation-body">
          <section className="main-workspace">
          <div className="remote-alert" role="status" aria-live="polite">
            <div>
              <i />
              <span>{remoteAlert.label}</span>
            </div>
            <p>{remoteAlert.detail}</p>
            <b>REMOTE / LISTENER 02</b>
          </div>
          <header className="chapter-header">
            <div>
              <p className="chapter-index">
                FILE {chapter.number} / {chapter.file}
              </p>
              <h1 id="objective-title">{chapter.title}</h1>
              <p className="chapter-objective">{chapter.objective}</p>
            </div>
            <span className={isReview ? "verified-tag" : "recovering-tag"}>
              {isReview ? "VERIFIED" : "RECOVERING"}
            </span>
          </header>

          <div className="waveform-panel">
            <div className="waveform-tools">
              <div className="playback-status">
                <button
                  type="button"
                  className={playing ? "is-playing" : ""}
                  disabled={!playing && !selectedPlayback}
                  onClick={() =>
                    playing ? stopPlayback() : playTrack()
                  }
                >
                  {playing
                    ? "停止播放"
                    : selectedPlayback
                      ? "重播当前样本"
                      : "先选择样本"}
                </button>
                <div>
                  <small>{playbackKind}</small>
                  <span aria-live="polite">{status}</span>
                </div>
              </div>
              <div>
                <b>单轨播放</b>
                <b>48 kHz</b>
                <b>24 BIT</b>
                <b>STEREO</b>
              </div>
            </div>
            <Waveform
              seed={
                selectedPlayback
                  ? getPlaybackWaveformSeed(
                      selectedPlayback.stage,
                      selectedPlayback.option,
                    )
                  : viewChapter + 3
              }
              playing={playing}
              durationMs={playbackDurationMs}
              danger={viewChapter >= 4}
              gapAt={
                viewChapter === 0 &&
                (selectedPlayback?.option === "final" ||
                  selectedPlayback?.option === "default")
                  ? 0.86
                  : undefined
              }
            />
            <div className="time-ruler" aria-hidden="true">
              {playbackTimeMarks.map((mark, index) => (
                <span key={`${mark}-${index}`}>{mark}</span>
              ))}
            </div>
            <LiveVoiceCue
              cue={voiceCue}
              soundEnabled={save.soundEnabled}
            />
            <p className="playback-rule">
              播放头和刻度按当前样本的真实时长推进；答案来自录音内部的停顿、问答、重复规律与前后矛盾，不要求辨认演员音色。
            </p>
          </div>

          <section className="puzzle-panel" aria-labelledby="objective-title">
            {isReview ? (
              <ReviewPanel
                chapter={chapter}
                onBack={() => {
                  stopPlayback("已返回当前任务", true);
                  setViewChapter(save.currentChapter);
                }}
                onPlay={() =>
                  playTrack(getReviewPlaybackOption(viewChapter))
                }
                playing={playing}
              />
            ) : (
              <PuzzleWorkspace
                key={viewChapter}
                stage={viewChapter}
                hintLevel={hintLevel}
                onFailure={registerFailure}
                onComplete={completeChapter}
                onPlay={playTrack}
                onHint={requestHint}
                onObservation={(observation) =>
                  setChapterObservations((current) => {
                    const items = current[viewChapter] ?? [];
                    if (items.some((item) => item.id === observation.id)) {
                      return current;
                    }
                    return {
                      ...current,
                      [viewChapter]: [...items, observation],
                    };
                  })
                }
                textAssist={save.textAssist}
              />
            )}
          </section>
          </section>

          <aside className="evidence-rail">
          <div className="side-tabs" role="tablist" aria-label="线索与剧情">
            <button
              type="button"
              role="tab"
              aria-selected={sideTab === "clues"}
              className={sideTab === "clues" ? "is-active" : ""}
              onClick={() => setSideTab("clues")}
            >
              线索记录
              <b>{visibleObservations.length}</b>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={sideTab === "story"}
              className={sideTab === "story" ? "is-active" : ""}
              onClick={() => setSideTab("story")}
            >
              剧情回顾
              <b>{syncCount}</b>
            </button>
          </div>

          {sideTab === "clues" ? (
            <div className="side-tab-content" role="tabpanel">
              <ObservationLog observations={visibleObservations} />
              <section className="fact-panel">
                <div className="side-heading">
                  <span>已确认事实</span>
                  <b>{save.completed.length}</b>
                </div>
                {save.completed.length === 0 ? (
                  <p className="empty-copy">
                    尚未写入。声音需要先经过你的验证。
                  </p>
                ) : (
                  <ol>
                    {save.completed.map((id) => (
                      <li key={id}>
                        <span>{String(id + 1).padStart(2, "0")}</span>
                        <p>{CHAPTERS[id].fact}</p>
                      </li>
                    ))}
                  </ol>
                )}
              </section>
            </div>
          ) : (
            <div className="side-tab-content story-tab" role="tabpanel">
              <blockquote className="inner-voice">
                <span>陈默 / 当前判断</span>
                {chapter.monologue}
              </blockquote>
              {storyTrack ? (
                <section className="story-audio-track">
                  <div>
                    <span>独立对白轨</span>
                    <b>{storyTrack.label}</b>
                    <p>{storyTrack.detail}</p>
                  </div>
                  <button
                    type="button"
                    className={
                      playing && selectedPlayback?.option === "story"
                        ? "is-playing"
                        : ""
                    }
                    onClick={() =>
                      playing && selectedPlayback?.option === "story"
                        ? stopPlayback()
                        : void playTrack("story")
                    }
                  >
                    {playing && selectedPlayback?.option === "story"
                      ? "停止对白"
                      : "单独播放对白"}
                  </button>
                </section>
              ) : (
                <p className="story-audio-note">
                  本章人声本身就是待验证证据，不再叠加额外剧情对白。
                </p>
              )}
              <section className="sync-panel">
                <div className="side-heading">
                  <span>同步冲突</span>
                  <b>{syncCount}</b>
                </div>
                <div className="sync-events">
                  {SYNC_EVENTS.slice(0, syncCount)
                    .reverse()
                    .map((event, index) => (
                      <article
                        key={`${event.title}-${index}`}
                        className={event.tone === "danger" ? "is-danger" : ""}
                      >
                        <i />
                        <div>
                          <strong>{event.title}</strong>
                          <p>{event.detail}</p>
                        </div>
                      </article>
                    ))}
                </div>
              </section>
            </div>
          )}
          </aside>
        </div>
      </div>
    </main>
  );
}

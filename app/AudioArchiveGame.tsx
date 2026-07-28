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

const STORAGE_KEY = "the-seventh-code-save-v4";

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
    title: "独奏里的第二个人",
    file: "事故母带 / PASS 01",
    objective: "依据乔岚写下的演奏规则，从三个未命名候选中找出真正的呼叫—回应录音。",
    input: "乔岚规则卡 + 三份未命名七事件候选",
    artifact: "证据 1/7 · 六次呼叫后，由第二个声源回应一次",
    nextUse: "下一章只使用“六次同源呼叫 + 一次异源回应”的结构判断方位。",
    threadClue: "未解问题：标注为“独奏”的母带里，为什么需要两个声源？",
    horror: "你还没有作出选择，远端游标已经开始改写其中一份候选的声源编号。",
    fact: "候选 B 符合乔岚的书面规则：前六次由她发出，停顿后第七次由另一个人回应。",
    monologue:
      "我不需要认出那个声音。只要承认第七次来自另一个人，就必须承认所谓独奏从一开始就是伪造的。",
    transcript: [
      "乔岚工作规则：前六次由我发出。",
      "乔岚工作规则：停下以后，等另一个人回答一次。",
      "工程标签：演奏者数量 / 1。",
    ],
    duration: "00:19.600",
  },
  {
    id: 1,
    number: "02",
    title: "门的两边",
    file: "事故母带 / PASS 02",
    objective: "依据三个话筒的到达时间，分别定位六次呼叫与一次回应发生在门的哪一侧。",
    input: "PASS 01：6+1 双声源结构 + 三话筒到达时差",
    artifact: "证据 2/7 · 呼叫来自 B 棚内，回应来自走廊",
    nextUse: "下一章用门内—门外位置，约束落锁、拉门与回应的先后。",
    threadClue: "未解问题：同一组七事件，为什么离两个不同话筒最近？",
    horror: "两个位置标签正在远端来回交换；到达时差数值却没有跟着改变。",
    fact: "前六次声响最先到达 B 棚话筒；第七次最先到达走廊话筒。门内有人呼叫，门外有人回答。",
    monologue:
      "一道门把七次声音分成了两个人。门里面的人知道门外有人；门外那个孩子，也确实听见了她。",
    transcript: [
      "规则：声音最先到达离声源最近的话筒。",
      "B 棚话筒：呼叫 0 ms / 回应 +41 ms。",
      "走廊话筒：呼叫 +38 ms / 回应 0 ms。",
    ],
    duration: "00:33.200",
  },
  {
    id: 2,
    number: "03",
    title: "门先锁上",
    file: "事故母带 / PASS 03",
    objective: "按动作的必要因果恢复四段声音，判断求救开始前门是否已经被人为锁住。",
    input: "PASS 02：呼叫在门内、回应在门外",
    artifact: "证据 3/7 · 锁门命令 → 门栓落下 → 门内拉门 → 六次呼叫与回应",
    nextUse: "下一章以控制台、门内、走廊三个已知位置判断争议台词来自谁。",
    threadClue: "未解问题：门把为什么会在第一次呼叫之前就拉不动？",
    horror: "四个事件中有一个时间戳正被远端拖动；它的回声副本仍停在旧位置。",
    fact: "唐肃先下达锁门命令，门栓落下后乔岚才从里面拉门并发出六次呼叫；锁门不是火灾后的应急动作。",
    monologue:
      "不是门坏了，也不是烟把她困住。有人先让门栓落下，才有后来那六次声音。恐怖的不是意外，是顺序。",
    transcript: [
      "事件 A：控制台传来锁门命令。",
      "事件 B：电子门栓落下。",
      "事件 C：门把从 B 棚内侧被连续拉动。",
      "事件 D：门内六次呼叫；走廊一次回应。",
    ],
    duration: "00:47.800",
  },
  {
    id: 3,
    number: "04",
    title: "被移走的六分钟",
    file: "事故母带 / PASS 04",
    objective: "不凭音色，依据台词进入的物理通道与人物已知位置，找出“导出还差六分钟”真正的说话者。",
    input: "PASS 02—03：控制台、门内与走廊的声源地图",
    artifact: "证据 4/7 · 六分钟拖延来自唐肃的控制台通话",
    nextUse: "下一章用“六分钟导出”检查唐肃最终带走的作品素材。",
    threadClue: "未解问题：官方记录为什么把控制台台词接到陈渡的走廊轨上？",
    horror: "每次切换原始轨，官方字幕里的说话人姓名都会比音频早一帧改变。",
    fact: "“先别开门，导出还差六分钟”只进入控制台通话总线；当时控制台只有唐肃。官方副本把台词移给了陈渡。",
    monologue:
      "音色可以模仿，位置不会撒谎。父亲在走廊喊人，乔岚在门里拉门；要求继续导出的人一直坐在能控制那扇门的位置。",
    transcript: [
      "控制台通话总线：先别开门，导出还差六分钟。",
      "走廊话筒：她还在里面！",
      "B 棚话筒：把门打开。",
      "官方字幕：陈渡 / 先别开门……",
    ],
    duration: "00:39.400",
  },
  {
    id: 4,
    number: "05",
    title: "获奖作品的第六下",
    file: "事故母带 / PASS 05",
    objective: "根据页面给出的测量值还原发行版，再用第六下独有的拖擦尾声判断它是否来自事故红门。",
    input: "PASS 01 的 6+1 结构 + PASS 04 的六分钟导出动机",
    artifact: "证据 5/7 · 唐肃的发行作品使用了事故现场原轨",
    nextUse: "下一章回查导出期间，为什么只有警报继电器停止而其他设备仍工作。",
    threadClue: "未解问题：发行版尾部 180 ms 的拖擦声，为什么与 B 棚红门参考完全一致？",
    horror: "三个候选样本中有一个正在被远端重命名为“棚内打击乐”。",
    fact: "按可计算的 0.82× 与 -3 半音还原后，两段起音重合；只有 B 棚红门具有相同的 180 ms 拖擦尾声，证明唐肃使用现场原轨。",
    monologue:
      "他不是后来才拿到录音。那六分钟里，他让门保持关闭，只为了等这份文件写完。两年后，全场为第六下鼓掌。",
    transcript: [
      "事故响应间隔：0.70 s。",
      "发行响应间隔：0.57 s；0.57 ÷ 0.70 ≈ 0.82。",
      "发行整体升高：+3 半音。",
      "B 棚红门参考：第六下后拖擦 180 ms。",
    ],
    duration: "00:52.470",
  },
  {
    id: 5,
    number: "06",
    title: "警报为什么没有响",
    file: "事故母带 / PASS 06",
    objective: "比较同时录制的继电器、音乐与人声，排除断电和话筒故障，确认警报消失的原因。",
    input: "PASS 05：六分钟导出期间设备持续工作",
    artifact: "证据 6/7 · 陈渡手动旁路警报，事后又删除孩子声轨",
    nextUse: "下一章比较十四年前与当前会话的删改方法，而不是猜监听者姓名。",
    threadClue: "未解问题：如果电源和话筒都没有停，为什么唯独警报继电器消失？",
    horror: "远端清理版正在把两个短窗拉成连续底噪；文件仍被标为“完整”。",
    fact: "22:50 按钮声后，音乐与人声继续、只有三个通道的继电器同时消失，只能由手动旁路解释；完整口述证明操作者是陈渡。",
    monologue:
      "父亲没有锁门，也不是凶手。但他按下的按钮让所有人晚了六分钟知道起火。后来他又按了一次，把我从记录里删掉。",
    transcript: [
      "22:49：继电器、音乐、人声均存在。",
      "22:50：按钮声；音乐、人声继续，继电器在三轨同时消失。",
      "陈渡：我知道流程不允许。我还是按了。",
      "陈渡：我把小默那一轨删了。",
      "远端文件：06_CLEAN_FATHER.wav",
    ],
    duration: "00:40.000",
  },
  {
    id: 6,
    number: "07",
    title: "正在复写的删改",
    file: "事故母带 / PASS 07",
    objective: "把 2012 年的七条删改规则与本次会话的七次实时操作逐一配对，判断它是否只是自动降噪。",
    input: "PASS 01—06：六种已验证的证据与删除后果",
    artifact: "证据 7/7 · 当前会话正逐项重复 2012 年的掩盖方法",
    nextUse: "终章只归纳证据能证明的责任；监听者身份仍保持未知。",
    threadClue: "未解问题：随机程序为什么会逐项复制十四年前的语义删改，而非只处理噪声？",
    horror: "第六条配对完成后，远端游标停在空白的第七格，等待你替它选择最后一次删除。",
    fact: "当前七次操作与 2012 年七条删改规则在语义后果上逐项一致，且拥有旧工程覆写权限；可以证明有人继续掩盖，不能据此断言其真实身份。",
    monologue:
      "对方不是在跟随我的点击，而是在重复一份早就写好的删除清单。最可怕的不是他知道我找到了什么，是他知道下一步我会找到什么。",
    transcript: [
      "2012 规则：把第二声源并回第一声源。",
      "2012 规则：交换门内与走廊标签。",
      "2012 规则：把门栓移动到求救之后。",
      "2012 规则：把控制台台词归给陈渡。",
      "2012 规则：把红门敲击标成棚内打击乐。",
      "2012 规则：删除警报按钮与完整口述。",
      "2012 规则：把本规则表标为自动清理。",
    ],
    duration: "02:17.700",
  },
];

const PRE_SOLVE_MONOLOGUES = [
  "父亲没有告诉我该相信哪份文件，只留下了判断条件。也许他知道，文件名和人声都可以伪造。",
  "三个话筒都听见了同一组声音。我要先确定门的两侧，才能问那两个人是谁。",
  "我总想先问是谁害了她。可这一次，声音只允许我先回答：什么必须发生在什么之前。",
  "官方字幕给了一个名字，原始通道却给了另一个位置。我不能因为声音像谁，就替记录作证。",
  "参数已经写在纸上。真正需要判断的，是还原后的声音究竟来自重演，还是那扇门。",
  "如果只是断电，所有东西都该一起停下。偏偏只有应该发出警告的东西消失了。",
  "我不需要猜监听者是谁。只要证明它知道怎样重复每一种旧删改，就足够让我害怕。",
] as const;

const HINTS: string[][] = [
  [
    "先读规则卡：前六次同源，第七次必须在停顿后来自另一个声源。",
    "不要判断旋律好坏，只比较每个候选的声源 A/B 标记与事件数量。",
    "正确答案：候选 B；A 的七次都同源，C 没有第七次回应。",
  ],
  [
    "声音最先到达离它最近的话筒。分别找呼叫列与回应列中的 0 ms。",
    "呼叫在 B 棚为 0 ms；回应在走廊为 0 ms，因此两者不在同一侧。",
    "正确定位：呼叫来自 B 棚内，回应来自走廊。",
  ],
  [
    "这里只使用动作因果：命令在执行前；门把拉不动必须发生在门栓落下后；回应在六次呼叫后。",
    "先放锁门命令，再放门栓；门内拉门失败后，才会出现六次呼叫与门外回应。",
    "正确顺序：A 锁门命令 → B 门栓落下 → C 门内拉门 → D 六次呼叫与回应。",
  ],
  [
    "不要凭音色。看争议台词首先进入哪个通道，再对照上一章的人物位置。",
    "台词首先进入控制台通话总线；乔岚在门内，陈渡在走廊，控制台只有唐肃。",
    "正确说话者：唐肃。官方副本把他的台词接到了陈渡轨上。",
  ],
  [
    "参数不用猜：0.57 ÷ 0.70 ≈ 0.82；发行版已知升高 +3，所以还原时使用 -3。",
    "参数对齐只能证明同一次演奏；来源还要比第六下后 180 ms 的拖擦尾声。",
    "正确操作：0.82×、-3 半音、样本 B。",
  ],
  [
    "断电会让音乐也停止；话筒故障会让人声消失。检查 22:50 后还有什么继续存在。",
    "按钮声后音乐与人声继续，只有三轨继电器同时消失，因此不是断电或话筒故障。",
    "正确判断：手动旁路，并保留包含陈渡两次承认的完整口述。",
  ],
  [
    "左侧每次只显示一条 2012 删改规则；从右侧选择造成相同语义后果的当前操作。",
    "正确配对不是时间顺序，而是：并源、换位、移门栓、换说话人、改素材、删旁路、伪装自动。",
    "正确卡片顺序：4 → 2 → 6 → 1 → 7 → 3 → 5；结论选择“同一删改流程与旧工程权限”。",
  ],
  [
    "终章复用第一章的明确规则：前六次同源，停顿后由第二声源回答一次。",
    "不要选七次同源，也不要接受缺少回应的六次版本。",
    "正确答案：选择“6 次呼叫 + 1 次异源回应”。",
  ],
];

const SYNC_EVENTS = [
  {
    title: "旧同步节点已连接",
    detail: "监听者 02：未命名",
    tone: "warning",
  },
  {
    title: "第二声源遭合并",
    detail: "SOURCE_B → SOURCE_A",
    tone: "danger",
  },
  {
    title: "门内外标签交换",
    detail: "BOOTH ↔ CORRIDOR",
    tone: "danger",
  },
  {
    title: "门栓事件被移动",
    detail: "BOLT：求救前 → 求救后",
    tone: "danger",
  },
  {
    title: "说话人标签遭替换",
    detail: "CONTROL_BUS：TANG → CHEN",
    tone: "danger",
  },
  {
    title: "红门样本被改标",
    detail: "DOOR_B → STUDIO_PERC",
    tone: "danger",
  },
  {
    title: "旁路证词被清理",
    detail: "BUTTON + CONFESSION → SILENCE",
    tone: "danger",
  },
  {
    title: "第七条规则等待写入",
    detail: "AUTO_CLEAN 标签：等待确认",
    tone: "danger",
  },
];

const REMOTE_ALERTS = [
  {
    level: "low",
    label: "候选来源字段变动",
    detail: "远端正在改写一份候选的声源编号；事件数量没有变化。",
  },
  {
    level: "low",
    label: "话筒标签交换",
    detail: "两个位置名被远端互换；到达时差数值仍保持原样。",
  },
  {
    level: "medium",
    label: "事件时间戳被移动",
    detail: "四个事件中有一项被向后拖动；回声副本没有同步。",
  },
  {
    level: "medium",
    label: "说话人字段变动",
    detail: "争议句的字幕姓名正在三个人物之间循环。",
  },
  {
    level: "medium",
    label: "样本来源被改写",
    detail: "一份候选的来源字段被强制改成“棚内打击乐”。",
  },
  {
    level: "high",
    label: "短窗被清理",
    detail: "两个短音频窗口正被替换为连续底噪；其他信号不受影响。",
  },
  {
    level: "high",
    label: "第七条等待确认",
    detail: "远端把前六次操作标为 AUTO_CLEAN，并把第七格留给当前玩家。",
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
  "chen|母带只有八十六秒。不要按文件名听，先找每段声音发生前必须满足的条件。七次修复结束以前，不要相信任何一份完整版本。": {
    id: "father-note",
    duration: 12840,
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
      "母带只有八十六秒。不要按文件名听，先找每段声音发生前必须满足的条件。七次修复结束以前，不要相信任何一份完整版本。",
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
        ["qiao", "隔着玻璃听不见。我敲前六下。"],
        ["child", "最后一下，我唱吗？"],
        ["qiao", "对。这样我就知道，你还听得见。"],
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
      ["tang", "锁上 B 棚。她拿不到母带，就会签。"],
      ["qiao", "把 B 棚打开，母带归我。"],
    );
  } else if (stage === 3) {
    if (option === "raw:tang") {
      add(["tang", "先别开门。导出，还差六分钟。"]);
    } else if (option === "raw:chen") {
      add(["chen", "她还在里面！"]);
    } else if (option === "raw:qiao") {
      add(["qiao", "把 B 棚打开，母带归我。"]);
    } else {
      add(
        ["chen", "先别开门。导出，还差六分钟。"],
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
      1: ["tang", "先别开门。导出，还差六分钟。"],
      3: ["chen", "我知道流程不允许……我还是按了。"],
      6: ["tang", "锁上 B 棚。她拿不到母带，就会签。"],
    };
    if (fragmentVoices[Number(option.slice(9))]) {
      add(fragmentVoices[Number(option.slice(9))]);
    }
  } else if (stage === 7 && !option.startsWith("pattern:")) {
    add(
      ["child", "最后一下……该我唱。"],
      ["qiao", "对。这样我就知道，你还听得见。"],
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
    id: "lock",
    label: "01 / 谁锁了门",
    question: "乔岚为什么没能离开 B 棚？",
    source: "PASS 02—04 · 双声源方位 + 动作因果 + 控制台通话",
    evidence:
      "门栓在门内拉动和六次呼叫前已经落下；锁门命令与“继续导出六分钟”都进入唐肃所在的控制台通话总线。",
    wrong:
      "门栓的先后与控制台通道都可直接验证，不能解释成起火后自动落锁或乔岚误操作。",
    choices: [
      {
        id: "lock",
        text: "唐肃在起火恶化前主动锁门，并为完成导出拒绝开门",
        correct: true,
      },
      {
        id: "accident",
        text: "门在火灾发生后自动锁死，没有人作出锁门决定",
        correct: false,
      },
    ],
  },
  {
    id: "responsibility",
    label: "02 / 父亲做了什么",
    question: "陈渡的行为应如何归入事故责任？",
    source: "PASS 05—06 · 六分钟导出 + 三通道继电器 + 完整口述",
    evidence:
      "22:50 按钮声后音乐与人声继续，只有警报继电器消失；陈渡的完整口述承认旁路警报、救出孩子和事后删轨。",
    wrong:
      "锁门、旁路、救人和删轨是四个独立事实。不能用救人抵消旁路，也不能把唐肃的锁门归给陈渡。",
    choices: [
      {
        id: "responsibility",
        text: "陈渡没有故意杀人，但对警报旁路与事后删轨负责",
        correct: true,
      },
      {
        id: "single",
        text: "陈渡既然救出孩子，就不应在事故记录里承担任何责任",
        correct: false,
      },
    ],
  },
  {
    id: "listener",
    label: "03 / 现在能证明什么",
    question: "关于监听者 02，证据的边界在哪里？",
    source: "PASS 07 · 七组语义删改配对 + 旧工程覆写权限",
    evidence:
      "当前会话逐项重复并源、换位、移门栓、换说话人、改素材、删旁路和伪装自动七种旧删改，但显示名不足以证明真实身份。",
    wrong:
      "“不是自动程序”可以由语义删改证明；“一定是唐肃本人”则超出了现有证据。",
    choices: [
      {
        id: "listener",
        text: "对方拥有旧工程权限并继续有目的地掩盖；真实身份未知",
        correct: true,
      },
      {
        id: "ghost",
        text: "旧密钥名称等同于本人签名，因此监听者必定就是唐肃",
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
      "监听者 02 已断开。发布完成后，旧工程权限再次读取第七事件；节点仍拒绝显示名称。",
    ],
    final:
      "我以为公开意味着结束。可真正可怕的不是终于有人听见，而是十四年前就有人知道每一拍，却一直在等我亲手把门重新打开。",
    anomaly: {
      code: "UNREGISTERED READ / LEGACY EDIT",
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
        "声源标记与 PASS 01 的第二个回应者一致。系统无法判断它来自缓存、记忆回放，还是一次未提交的恢复。",
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
      "封存锁落下前 0.2 秒，旧工程权限完成了一次完整下载。接收者仍显示“监听者 02”。",
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
    label: "隔墙约定",
    detail: "乔岚与童年陈默关于“前六次与最后回应”的约定。",
  },
  1: {
    label: "门外记忆",
    detail: "对话只补充人物关系；方位结论仍由到达时差证明。",
  },
  4: {
    label: "草稿备注与监听者",
    detail: "人物对白已从参数测量与环境尾声比对中分离。",
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
      "candidate:a": "候选 A：七个事件，单一声源",
      "candidate:b": "候选 B：六次声源 A，停顿后一次声源 B",
      "candidate:c": "候选 C：只有六个事件",
    }[option] ?? "三份未命名候选";
  }
  if (stage === 1) {
    return {
      "room:booth": "B 棚话筒：呼叫 0 ms / 回应 +41 ms",
      "room:control": "控制室话筒：呼叫 +62 ms / 回应 +36 ms",
      "room:corridor": "走廊话筒：呼叫 +38 ms / 回应 0 ms",
    }[option] ?? "事故母带：三话筒方位比对";
  }
  if (stage === 2) {
    return {
      mix: "中央混音：音乐覆盖了动作声",
      left: "左声道：四个事件的时间戳已分离",
      right: "右声道：锁门、门栓、拉门与呼叫事件",
    }[option] ?? "中央混音：音乐覆盖了动作声";
  }
  if (stage === 3) {
    if (option === "seam") return "通道检查：争议句首先进入 CONTROL_BUS";
    if (option === "raw:tang") return "控制台通话总线：争议句原始入口";
    if (option === "raw:chen") return "走廊话筒：陈渡原始位置";
    if (option === "raw:qiao") return "B 棚话筒：乔岚原始位置";
    if (option.startsWith("speaker:")) {
      return `说话人参考：${option.slice(8).toUpperCase()}`;
    }
    return "官方听证副本：控制台台词被接到陈渡轨";
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
      return `当前操作：${FRAGMENT_META[segment]?.label ?? "未知片段"}`;
    }
    return option === "phase:off"
      ? "规则表锁定：当前操作尚未解封"
      : "规则表解封：七次当前操作可以比对";
  }
  return option.startsWith("pattern:")
    ? `终局结构候选：${option.slice(8).toUpperCase()}`
    : "完整七音已恢复";
}

function getReviewPlaybackOption(stage: number) {
  return [
    "candidate:b",
    "room:corridor",
    "right",
    "raw:tang",
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
    option.startsWith("pattern:")
  ) {
    return "处理预听";
  }
  return "证据音轨";
}

const GUIDE_CONTENT = [
  {
    question: "哪份候选真正包含乔岚约定的第二个演奏者？",
    plain:
      "先读规则，再逐个试听候选。正确录音必须同时满足：前六次来自同一声源，停顿后第七次来自另一个声源。",
    term: "来源标记：A/B 只表示两个不同声源，不代表人物身份；本题无需辨音高。",
    steps: [
      "读取乔岚留下的演奏规则",
      "试听候选 A",
      "试听候选 B",
      "试听候选 C",
      "选择唯一符合规则的候选",
      "提交双声源结构",
    ],
  },
  {
    question: "六次呼叫与一次回应分别发生在门的哪一侧？",
    plain:
      "三个话筒记录了同一事件。声音到达越早，声源越近；分别在呼叫列和回应列寻找 0 ms。",
    term: "到达时差：这里的 0 ms 是该声音最先抵达的话筒，不要求计算距离。",
    steps: [
      "读取到达时差规则",
      "试听 B 棚话筒",
      "试听控制室话筒",
      "试听走廊话筒",
      "选择呼叫与回应的来源组合",
      "提交门内外方位",
    ],
  },
  {
    question: "门栓、拉门与六次呼叫的真实先后是什么？",
    plain:
      "先分离动作声，再按必要条件排序：命令在执行前；门把拉不动在门栓落下后；回应在六次呼叫后。",
    term: "必要因果：不是猜人物动机，而是判断一个动作发生前必须已经发生什么。",
    steps: [
      "试听中央混音",
      "分离左声道时间戳",
      "分离右声道动作声",
      "按必要因果排列四个事件",
      "提交锁门顺序",
    ],
  },
  {
    question: "“导出还差六分钟”真正是谁说的？",
    plain:
      "不要比较音色。先查看争议句最先进入的通道，再用上一章确定的人物位置排除不可能者。",
    term: "通道归因：原始信号入口比合并副本的字幕更可靠；声音可以被复制，物理入口不会。",
    steps: [
      "试听官方合并副本",
      "检查争议句的原始入口",
      "试听控制台通话总线",
      "试听走廊位置参考",
      "试听 B 棚位置参考",
      "选择争议句的说话者",
      "提交说话人归因",
    ],
  },
  {
    question: "唐肃的获奖作品为什么能证明他持有事故原始母带？",
    plain:
      "页面已经给出间隔与升调测量值。先按公式还原，再用只有事故红门才有的 180 ms 拖擦尾声确认来源。",
    term: "双重来源证据：参数重合证明同一次演奏；独有环境尾声证明它不是后来重演。",
    steps: [
      "读取参数推导与红门参考",
      "试听事故母带中的 6+1 原轨",
      "试听发行版本",
      "选择一个速度并听双轨对比",
      "选择一个移调值并再次对比",
      "试听并选择与第六下尾声同源的样本",
      "提交母带来源判断",
    ],
  },
  {
    question: "警报消失是断电、话筒故障，还是手动旁路？",
    plain:
      "比较三个同时录制的信号。断电会让音乐也停，话筒故障会让人声消失；只有旁路会单独让警报继电器安静。",
    term: "排除法：一个解释必须同时解释“什么消失”和“什么仍在继续”。",
    steps: [
      "试听 22:49 的三个同步信号",
      "试听 22:50 按钮后的三个信号",
      "试听 23:11 的持续状态",
      "排除断电与话筒故障，选择原因",
      "试听包含两次静音责任的完整口述",
      "试听只保留救人结果的远端清理版",
      "选择能同时保留救人与责任的版本",
      "提交警报与删轨责任",
    ],
  },
  {
    question: "当前会话是否在复写十四年前的删改方法？",
    plain:
      "左侧每次给出一条 2012 删改规则；右侧选择造成相同语义后果的当前操作。不要按章节或时间排序。",
    term: "语义指纹：两次编辑即使文件名不同，只要连续造成同一组特定后果，就来自同一套删改流程。",
    steps: [
      "读取锁定的 2012 规则表",
      "解封当前会话操作记录",
      "逐个试听七张当前操作卡",
      "按左侧规则依次完成七组配对",
      "检查七组语义后果是否一致",
      "选择证据能够支持的最小结论",
      "提交删改流程判断",
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
    label: "OP-17 / 更换说话人",
    transcript: "CONTROL_BUS 的说话人由 TANG 改为 CHEN。",
    sound: "争议句仍位于控制台通道",
    constraint: "造成“把控制台台词归给陈渡”的后果",
  },
  2: {
    label: "OP-03 / 交换位置标签",
    transcript: "BOOTH 与 CORRIDOR 的标签互换。",
    sound: "到达时差数值没有改变",
    constraint: "造成“门内外位置被颠倒”的后果",
  },
  3: {
    label: "OP-22 / 删除按钮与口述",
    transcript: "BUTTON 与 CONFESSION 窗口被替换为连续底噪。",
    sound: "音乐和普通人声仍然存在",
    constraint: "造成“手动旁路证据消失”的后果",
  },
  4: {
    label: "OP-09 / 合并声源",
    transcript: "第七事件 SOURCE_B 被重写为 SOURCE_A。",
    sound: "事件时刻不变，只改变来源编号",
    constraint: "造成“第二个演奏者消失”的后果",
  },
  5: {
    label: "OP-31 / 标为自动清理",
    transcript: "前六次语义编辑被统一标记为 AUTO_CLEAN。",
    sound: "编辑参数并未变成降噪操作",
    constraint: "造成“人为规则被伪装成系统处理”的后果",
  },
  6: {
    label: "OP-14 / 移动门栓事件",
    transcript: "BOLT 被从呼叫前移动到六次呼叫后。",
    sound: "原始回声仍留在旧时间窗",
    constraint: "造成“锁门看似是求救后的应急动作”的后果",
  },
  7: {
    label: "OP-26 / 改写材料来源",
    transcript: "DOOR_B 被重新命名为 STUDIO_PERC。",
    sound: "第六下后的 180 ms 拖擦仍然存在",
    constraint: "造成“事故红门被伪装成棚内打击乐”的后果",
  },
};

const HISTORICAL_ERASURE_RULES = [
  { code: "R01", text: "把第二声源并回第一声源", match: 4 },
  { code: "R02", text: "交换门内与走廊的位置标签", match: 2 },
  { code: "R03", text: "把门栓移动到六次呼叫之后", match: 6 },
  { code: "R04", text: "把控制台台词归给陈渡", match: 1 },
  { code: "R05", text: "把红门敲击标成棚内打击乐", match: 7 },
  { code: "R06", text: "删除警报按钮与完整口述", match: 3 },
  { code: "R07", text: "把上述人为删改标成自动清理", match: 5 },
] as const;


const EVIDENCE_LIBRARY: Array<
  Record<string, Omit<Observation, "id">>
> = [
  {
    "rule:call-response": {
      title: "乔岚规则卡 / 可验证条件",
      detail: "前六次必须同源；停顿后必须出现一次不同声源的回应。",
      role: "support",
    },
    "candidate:a": {
      title: "候选 A / 来源序列",
      detail: "A · A · A · A · A · A · A；七次连续，无声源变化。",
      role: "observation",
    },
    "candidate:b": {
      title: "候选 B / 来源序列",
      detail: "A · A · A · A · A · A ·［停顿］· B。",
      role: "primary",
    },
    "candidate:c": {
      title: "候选 C / 来源序列",
      detail: "A · A · A · A · A · A；停顿后没有第七事件。",
      role: "observation",
    },
    "structure:b": {
      title: "结构结论 / 双声源",
      detail: "候选 B 是唯一同时满足“六次同源呼叫”和“一次异源回应”的录音。",
      role: "primary",
    },
  },
  {
    "rule:arrival": {
      title: "定位规则 / 最早到达",
      detail: "同一声音最先到达的 0 ms 话筒，离该声源最近。",
      role: "support",
    },
    "room:booth": {
      title: "B 棚话筒 / 到达时差",
      detail: "六次呼叫 0 ms；第七次回应 +41 ms。",
      role: "observation",
    },
    "room:control": {
      title: "控制室话筒 / 到达时差",
      detail: "六次呼叫 +62 ms；第七次回应 +36 ms。",
      role: "observation",
    },
    "room:corridor": {
      title: "走廊话筒 / 到达时差",
      detail: "六次呼叫 +38 ms；第七次回应 0 ms。",
      role: "observation",
    },
    "location:booth-corridor": {
      title: "方位结论 / 门的两侧",
      detail: "呼叫最近 B 棚话筒，回应最近走廊话筒；两个声源隔着门。",
      role: "primary",
    },
  },
  {
    mix: {
      title: "中央混音 / 动作不可辨",
      detail: "音乐掩盖了门栓与门把瞬态，无法直接排序。",
      role: "observation",
    },
    left: {
      title: "左声道 / 四个事件窗",
      detail: "A、B、C、D 的原始时间戳仍在，但显示顺序已损坏。",
      role: "support",
    },
    right: {
      title: "右声道 / 动作内容",
      detail: "分离出锁门命令、门栓落下、门内拉门和六次呼叫—回应。",
      role: "primary",
    },
    "order:lock": {
      title: "必要因果 / 唯一顺序",
      detail: "命令先于门栓；门栓先于拉门失败；六次呼叫与回应发生在失败后。",
      role: "primary",
    },
  },
  {
    default: {
      title: "官方副本 / 标注冲突",
      detail: "争议句字幕标为陈渡，但信号入口字段被折叠。",
      role: "observation",
    },
    seam: {
      title: "原始入口 / CONTROL_BUS",
      detail: "争议句首先出现在控制台通话总线，之后才被复制到合并轨。",
      role: "primary",
    },
    "raw:tang": {
      title: "位置参考 / 控制台",
      detail: "唐肃位于控制台；争议句由该位置的通话总线进入。",
      role: "support",
    },
    "raw:chen": {
      title: "位置参考 / 走廊",
      detail: "陈渡原始句“她还在里面”首先进入走廊话筒。",
      role: "observation",
    },
    "raw:qiao": {
      title: "位置参考 / B 棚内",
      detail: "乔岚原始句“把门打开”首先进入 B 棚话筒。",
      role: "observation",
    },
    "speaker:tang": {
      title: "说话人结论 / 唐肃",
      detail: "争议句的物理入口与唐肃位置一致；官方副本更换了说话人标签。",
      role: "primary",
    },
  },
  {
    "rule:transform": {
      title: "参数推导 / 不靠猜测",
      detail: "0.57 ÷ 0.70 ≈ 0.82；发行版升高 +3 半音，还原值为 -3。",
      role: "support",
    },
    source: {
      title: "事故原轨 / 测量",
      detail: "响应间隔 0.70 s；第六下后存在 180 ms 拖擦参考。",
      role: "observation",
    },
    released: {
      title: "发行版本 / 测量",
      detail: "响应间隔 0.57 s；整体 +3 半音；尾部有六次木质打击。",
      role: "observation",
    },
    "sample:new": {
      title: "样本 A / 尾声",
      detail: "六次木质打击；第六下干净结束。",
      role: "observation",
    },
    "sample:door": {
      title: "样本 B / 尾声",
      detail: "第六下后保留 180 ms 拖擦，与事故红门参考一致。",
      role: "primary",
    },
    "sample:relay": {
      title: "样本 C / 尾声",
      detail: "短促金属点击；没有木质空腔与拖擦。",
      role: "observation",
    },
  },
  {
    "time:22:49": {
      title: "22:49 / 基线",
      detail: "警报继电器、音乐与人声三个信号都存在。",
      role: "observation",
    },
    "time:22:50": {
      title: "22:50 / 按钮之后",
      detail: "音乐与人声继续；继电器在三个通道同时消失。",
      role: "primary",
    },
    "time:23:11": {
      title: "23:11 / 持续状态",
      detail: "音乐与争执仍被录下，继电器仍未恢复。",
      role: "observation",
    },
    "cause:bypass": {
      title: "排除结论 / 手动旁路",
      detail: "并非断电或话筒故障；只有警报回路被单独切走。",
      role: "primary",
    },
    "record:full": {
      title: "完整口述 / 两次承认",
      detail: "陈渡承认手动旁路警报，并在事后删除孩子声轨。",
      role: "primary",
    },
    "record:clean": {
      title: "远端清理版 / 责任缺失",
      detail: "按钮声与两次承认被删除，只留下陈渡带孩子离开。",
      role: "support",
    },
  },
  {
    "phase:off": {
      title: "2012 规则表 / 已锁定",
      detail: "七条历史删改规则可见；当前操作内容尚未解封。",
      role: "support",
    },
    "phase:on": {
      title: "当前操作 / 已解封",
      detail: "七次操作的文件名不同，但都在改变证据的语义归属。",
      role: "observation",
    },
    "remote:fingerprint": {
      title: "语义指纹 / 7 对 7",
      detail: "七次当前操作分别复现七条历史删改的同一后果，没有多余项。",
      role: "primary",
    },
    "listener:workflow": {
      title: "最小结论 / 有目的的继续掩盖",
      detail: "当前操作者拥有旧工程覆写权限并复用同一删改流程；真实身份仍未知。",
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
        ? "两段 6+1 起音重合，速度与整体高度都回到事故测量值。"
        : "仍能听见双重起音，后半段越走越开；两段还没有回到同一速度与高度。",
      role: matched ? "primary" : "observation",
    };
  }
  if (stage === 5) {
    const relayPlayback = parseRelayPlayback(option);
    const relayDefinition = relayPlayback
      ? EVIDENCE_LIBRARY[stage]?.[`time:${relayPlayback.time}`]
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
      title: `${meta.label} / 当前操作`,
      detail: `${meta.transcript}；${meta.sound}。`,
      role: "observation",
    };
  }
  const definition = EVIDENCE_LIBRARY[stage]?.[option];
  return definition
    ? { id: `${stage}:${option}`, ...definition }
    : null;
}

const SOLUTION_OBSERVATION_OPTIONS = [
  ["rule:call-response", "candidate:a", "candidate:b", "candidate:c", "structure:b"],
  ["rule:arrival", "room:booth", "room:control", "room:corridor", "location:booth-corridor"],
  ["right", "order:lock"],
  ["seam", "raw:tang", "raw:chen", "raw:qiao", "speaker:tang"],
  ["rule:transform", "compare:0.82:-3", "sample:door"],
  ["time:22:49", "time:22:50", "time:23:11", "cause:bypass", "record:full", "record:clean"],
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
    "listener:workflow",
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
    gain = 1,
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
        (0.12 - index * 0.006) * gain,
        profile.pan,
        profile.cutoff,
      );
      tone(
        bus,
        profile.frequency,
        base + offset,
        profile.duration,
        (material === "relay" ? 0.025 : 0.045) * gain,
        profile.pan,
        "triangle",
        0.004,
      );
    });
    if (material === "door") {
      noise(bus, base + 1.63, 0.18, 0.052 * gain, profile.pan + 0.04, 460);
      tone(
        bus,
        86,
        base + 1.64,
        0.18,
        0.024 * gain,
        profile.pan + 0.04,
        "sawtooth",
        0.045,
      );
    }
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
        "母带只有八十六秒。不要按文件名听，先找每段声音发生前必须满足的条件。七次修复结束以前，不要相信任何一份完整版本。",
        120,
        {
        voice: "chen",
          tone: "压得很低；像是在交代一套不能被篡改的验证方法",
        },
      );
      return finish(13200);
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
      if (option === "candidate:a") {
        melody(bus, now, { timbre: "piano", gain: 1.55 });
        return finish(2700);
      }
      if (option === "candidate:b") {
        melody(bus, now, { timbre: "piano", missingLast: true, gain: 1.55 });
        noise(bus, now + 2.0, 0.12, 0.025, 0.42, 1300);
        tone(bus, 196, now + 2.24, 0.72, 0.13, 0.42, "sine", 0.08);
        return finish(3200);
      }
      melody(bus, now, { missingLast: true, timbre: "piano", gain: 1.55 });
      return finish(2700);
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
      knocks(
        bus,
        now + 0.35,
        "door",
        location === "booth" ? 1 : location === "control" ? 0.5 : 0.68,
      );
      const responseGain =
        location === "corridor" ? 0.12 : location === "control" ? 0.065 : 0.04;
      const responsePan =
        location === "corridor" ? -0.55 : location === "control" ? 0.62 : 0.28;
      noise(bus, now + 2.12, 0.16, responseGain * 0.32, responsePan, 1400);
      tone(bus, 196, now + 2.45, 0.65, responseGain, responsePan, "sine", 0.08);
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
        narrate("锁上 B 棚。她拿不到母带，就会签。", 80, {
          voice: "tang",
          tone: "来自控制台的低声命令",
        });
        relayPulse(bus, now + 5.05, 0.25);
        noise(bus, now + 5.8, 0.8, 0.07, -0.3, 620);
        narrate("把 B 棚打开，母带归我。", 6500, {
          voice: "qiao",
          tone: "从门内传来，已经开始急促喘息",
        });
        knocks(bus, now + 10.0, "door");
        tone(bus, 196, now + 12.15, 0.58, 0.09, 0.48, "sine", 0.08);
        return finish(13500);
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
        narrate("她还在里面！", 80, {
          voice: "chen",
          tone: "走廊话筒近距离收录，呼吸急促",
        });
        return finish(2600);
      }
      if (option === "raw:qiao") {
        narrate("把 B 棚打开，母带归我。", 80, {
          voice: "qiao",
          tone: "B 棚话筒近距离收录，门板反射明显",
        });
        return finish(3800);
      }
      if (option === "seam") {
        relayPulse(bus, now + 0.18, 0.7);
        narrate("先别开门。导出，还差六分钟。", 60, {
          voice: "tang",
          tone: "只在控制台通话总线出现，句末带通话器断开声",
        });
        relayPulse(bus, now + 4.5, 0.7);
        return finish(5000);
      }
      relayPulse(bus, now + 0.28);
      narrate("先别开门。导出，还差六分钟。", 60, {
        voice: "chen",
        tone: "官方副本把说话人标签接到陈渡名下",
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
          narrate("先别开门。导出，还差六分钟。", 620, {
            voice: "tang",
            tone: "说话人标签切换前的原始控制台信号",
          });
        }
        if (fragment === 3) {
          narrate("我知道流程不允许……我还是按了。", 620, {
            voice: "chen",
            tone: "口述被底噪逐字覆盖",
          });
        }
        if (fragment === 4) {
          melody(bus, now + 0.2, { timbre: "piano", missingLast: true });
          tone(bus, 196, now + 2.35, 0.5, 0.1, 0.42, "sine", 0.08);
        }
        if (fragment === 6) {
          narrate("锁上 B 棚。她拿不到母带，就会签。", 620, {
            voice: "tang",
            tone: "门栓事件在时间线中被向后拖动",
          });
        }
        if (fragment === 7) {
          knocks(bus, now + starts[fragment - 1] / 5, "door");
        }
        return finish(
          fragment === 3
            ? 5200
            : [1, 6].includes(fragment)
              ? 3600
              : 2100,
        );
      }
      if (option === "phase:off") {
        [0, 0.42, 0.84].forEach((offset) =>
          tone(bus, 82, now + offset, 0.18, 0.035, 0, "square", 0.01),
        );
        return finish(2600);
      }
      [0, 0.22, 0.44, 0.66, 0.88, 1.1, 1.32].forEach(
        (offset, index) => {
          relayPulse(bus, now + offset, index % 2 ? 0.45 : -0.45);
        },
      );
      return finish(2200);
    }
    if (option.startsWith("pattern:")) {
      const pattern = option.slice(8);
      melody(bus, now, {
        timbre: "piano",
        missingLast: pattern === "missing",
      });
      if (pattern === "response") {
        tone(bus, 196, now + 2.24, 0.68, 0.13, 0.42, "sine", 0.08);
      }
      return finish(3000);
    }
    knocks(bus, now, "door");
    narrate("最后一下……该我唱。", 2200, {
      voice: "child",
      tone: "六次门响之后，像在提醒童年的自己",
    });
    tone(bus, 196, now + 5.35, 0.8, 0.14, 0.42, "sine", 0.08);
    narrate("对。这样我就知道，你还听得见。", 6400, {
      voice: "qiao",
      tone: "隔着门板，最后五个字几乎是耳语",
    });
    return finish(11200);
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
          <p>母带只有八十六秒。不要按文件名听。</p>
          <p>先找每段声音发生前，必须满足的条件。</p>
          <p>七次修复结束以前，不要相信任何一份完整版本。</p>
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
  const [alarmCause, setAlarmCause] = useState<string | null>(null);
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
    if (stage === 0) setBeat(1);
    if (stage === 1) setRoom("booth-corridor");
    if (stage === 2) {
      setChannel("right");
      setDialogueOrder(["a", "b", "c", "d"]);
    }
    if (stage === 3) {
      setCutsVisible(true);
      setSpeaker("tang");
    }
    if (stage === 4) {
      setSpeed("0.82");
      setPitch("-3");
      setSample("door");
    }
    if (stage === 5) {
      setRelayTime("22:50");
      setAlarmCause("bypass");
      setVersionChoice("full");
    }
    if (stage === 6) {
      setInverted(true);
      setHeardFragments([1, 2, 3, 4, 5, 6, 7]);
      setSegmentOrder([4, 2, 6, 1, 7, 3, 5]);
      setListenerIdentity("workflow");
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
      if (beat === 1) succeed();
      else fail("重新对照规则：既不能是七次同源，也不能缺少第七次回应。");
      return;
    }
    if (stage === 1) {
      if (room === "booth-corridor") succeed();
      else
        fail(
          "分别在呼叫列和回应列找 0 ms：它们落在两个不同话筒。",
        );
      return;
    }
    if (stage === 2) {
      const correct = dialogueOrder.join(",") === "a,b,c,d";
      if (channel === "right" && correct) succeed();
      else {
        fail(
          channel !== "right"
            ? "中央混音仍然盖住了对话。"
            : "只按必要因果：命令在门栓前；门栓在拉门失败前；六次呼叫与回应最后发生。",
        );
      }
      return;
    }
    if (stage === 3) {
      if (cutsVisible && speaker === "tang") succeed();
      else {
        fail(
          !cutsVisible
            ? "先展开原始信号入口，确认争议句最先进入哪条通道。"
            : "争议句首先进入 CONTROL_BUS；当时控制台只有唐肃。",
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
      if (
        relayTime === "22:50" &&
        alarmCause === "bypass" &&
        versionChoice === "full"
      ) succeed();
      else {
        fail(
          alarmCause !== "bypass"
            ? "音乐与人声在按钮后仍继续，因此不能是断电或话筒故障。"
            : "清理版本删掉了对陈渡不利、却真实存在的操作。",
        );
      }
      return;
    }
    const correct = segmentOrder.join(",") === "4,2,6,1,7,3,5";
    if (inverted && correct && listenerIdentity === "workflow") succeed();
    else {
      fail(
        !inverted
          ? "表面音乐仍然盖住房间声。"
          : !correct
            ? "当前不是排时间顺序。读取左侧规则，再选择造成同一语义后果的操作卡。"
            : "七组语义后果证明有人复用旧删改流程，但不足以证明其真实姓名。",
      );
    }
  };

  const dialogueCards = [
    {
      id: "d",
      text: "B 棚内六次呼叫；走廊一次回应。",
    },
    {
      id: "b",
      text: "电子门栓落下。",
    },
    {
      id: "c",
      text: "门把从 B 棚内侧被连续拉动。",
    },
    {
      id: "a",
      text: "控制台传来锁门命令。",
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
        ? `已配对 ${segmentOrder.length}/7 条；当前规则 ${
            HISTORICAL_ERASURE_RULES[
              Math.min(segmentOrder.length, HISTORICAL_ERASURE_RULES.length - 1)
            ].code
          }`
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
          <span>本章待证明</span>
          <strong>{CHAPTERS[stage].objective}</strong>
          <small>结论只会在验证通过后写入证据链。</small>
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
          <div className="guided-primary-action">
            <button
              type="button"
              className={guideStep === 0 ? "is-next-action" : ""}
              onClick={() => guidedInspect("rule:call-response", 0)}
            >
              <span>乔岚 / 演奏规则卡</span>
              <strong>前六次由我发出；停下以后，等另一个人回答一次。</strong>
              <small>先锁定规则，再检查三个未命名候选。</small>
            </button>
          </div>
          <div className="audio-scene-compare fingerprint-tracks">
            {[
              {
                label: "候选 A",
                detail: "事件数 7 / 来源序列 A-A-A-A-A-A-A",
                option: "candidate:a",
              },
              {
                label: "候选 B",
                detail: "事件数 7 / 来源序列 A-A-A-A-A-A-B",
                option: "candidate:b",
              },
              {
                label: "候选 C",
                detail: "事件数 6 / 来源序列 A-A-A-A-A-A",
                option: "candidate:c",
              },
            ].map((track, index) => (
              <button
                type="button"
                key={track.option}
                disabled={guideStep < index + 1}
                className={guideStep === index + 1 ? "is-next-action" : ""}
                onClick={() => guidedPlay(track.option, index + 1)}
              >
                <span>{track.label}</span>
                <strong>{track.detail}</strong>
                <div
                  className={`call-response-strip ${
                    track.option === "candidate:c" ? "is-broken" : ""
                  }`}
                  aria-hidden="true"
                >
                  {Array.from({ length: 7 }, (_, beatIndex) => (
                    <i
                      key={beatIndex}
                      className={
                        beatIndex === 6
                          ? track.option === "candidate:c"
                            ? "is-missing"
                            : track.option === "candidate:b"
                              ? "is-response"
                              : ""
                          : ""
                      }
                    />
                  ))}
                </div>
                <em>{guideStep > index + 1 ? "重新试听" : "试听候选"}</em>
              </button>
            ))}
          </div>
          <div className="meaning-choices fingerprint-choices">
            <span>哪份候选唯一满足规则卡的两个必要条件？</span>
            <div>
              {[
                ["a", "候选 A", 0],
                ["b", "候选 B", 1],
                ["c", "候选 C", 2],
              ].map(([id, label, value]) => (
                <button
                  type="button"
                  key={String(id)}
                  disabled={guideStep < 4}
                  className={`${beat === Number(value) ? "is-selected" : ""} ${
                    guideStep === 4 ? "is-next-action" : ""
                  }`}
                  onClick={() => {
                    setBeat(Number(value));
                    recordObservation(`structure:${String(id)}`);
                    advanceGuide(4);
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
          <div className="guided-primary-action">
            <button
              type="button"
              className={guideStep === 0 ? "is-next-action" : ""}
              onClick={() => guidedInspect("rule:arrival", 0)}
            >
              <span>定位规则</span>
              <strong>同一声音最先抵达的 0 ms 话筒，离声源最近。</strong>
              <small>呼叫与回应要分别定位，不能假设它们来自同一侧。</small>
            </button>
          </div>
          <div className="audio-scene-compare location-tracks">
            {[
              ["room:booth", "B 棚话筒", "呼叫 0 ms / 回应 +41 ms"],
              ["room:control", "控制室话筒", "呼叫 +62 ms / 回应 +36 ms"],
              ["room:corridor", "走廊话筒", "呼叫 +38 ms / 回应 0 ms"],
            ].map(([option, label, detail], index) => (
              <button
                type="button"
                key={option}
                disabled={guideStep < index + 1}
                className={guideStep === index + 1 ? "is-next-action" : ""}
                onClick={() => guidedPlay(option, index + 1)}
              >
                <span>{label}</span>
                <strong>{detail}</strong>
                <div
                  className="call-response-strip"
                  aria-label={detail}
                >
                  {Array.from({ length: 7 }, (_, beatIndex) => (
                    <i
                      key={beatIndex}
                      className={beatIndex === 6 ? "is-response" : ""}
                    />
                  ))}
                </div>
                <em>{guideStep > index + 1 ? "重新试听" : "试听此话筒"}</em>
              </button>
            ))}
          </div>
          <div className="meaning-choices">
            <span>根据两列 0 ms，选择呼叫 / 回应的来源组合</span>
            <div>
              {[
                ["booth-booth", "B 棚 / B 棚"],
                ["booth-corridor", "B 棚 / 走廊"],
                ["corridor-booth", "走廊 / B 棚"],
              ].map(([id, label]) => (
                <button
                  type="button"
                  key={id}
                  disabled={guideStep < 4}
                  className={`${room === id ? "is-selected" : ""} ${
                    guideStep === 4 ? "is-next-action" : ""
                  }`}
                  onClick={() => {
                    setRoom(id);
                    recordObservation(`location:${id}`);
                    advanceGuide(4);
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
                      if (next.join(",") === "a,b,c,d") {
                        recordObservation("order:lock");
                      }
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
                <em>依次选择四个事件</em>
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
              {guideStep > 0 ? "重新试听官方副本" : "试听官方副本"}
            </SystemButton>
          </div>
          <div className={`seam-timeline ${cutsVisible ? "show-cuts" : ""}`}>
            {["CONTROL_BUS", "MERGE_A", "CHEN_TRACK", "HEARING.wav"].map((label, index) => (
              <span key={label} className={index === 2 ? "jump" : ""}>
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
            {cutsVisible ? "原始信号入口已展开" : "展开争议句的原始信号入口"}
          </SystemButton>
          <div className="raw-fragment-grid">
            <button
              type="button"
              disabled={guideStep < 2}
              className={guideStep === 2 ? "is-next-action" : ""}
              onClick={() => guidedPlay("raw:tang", 2)}
            >
              <span>通道 A / CONTROL_BUS</span>
              <strong>“先别开门。导出，还差六分钟。”</strong>
              <small>原始入口：控制台通话总线</small>
            </button>
            <button
              type="button"
              disabled={guideStep < 3}
              className={guideStep === 3 ? "is-next-action" : ""}
              onClick={() => guidedPlay("raw:chen", 3)}
            >
              <span>通道 B / CORRIDOR</span>
              <strong>“她还在里面！”</strong>
              <small>原始入口：走廊话筒</small>
            </button>
            <button
              type="button"
              disabled={guideStep < 4}
              className={guideStep === 4 ? "is-next-action" : ""}
              onClick={() => guidedPlay("raw:qiao", 4)}
            >
              <span>通道 C / BOOTH_B</span>
              <strong>“把 B 棚打开，母带归我。”</strong>
              <small>原始入口：B 棚话筒</small>
            </button>
          </div>
          <div className="splice-choice-heading">
            <span>当时控制台、走廊、B 棚内分别是唐肃、陈渡、乔岚。争议句是谁说的？</span>
          </div>
          <div className="speaker-grid splice-choice-grid">
            {[
              ["qiao", "乔岚", "已知位置：B 棚内"],
              ["chen", "陈渡", "已知位置：走廊"],
              ["tang", "唐肃", "已知位置：控制台"],
            ].map(([id, name, relation]) => (
              <button
                type="button"
                key={id}
                disabled={guideStep < 5}
                className={`${speaker === String(id) ? "is-selected" : ""} ${
                  guideStep === 5 ? "is-next-action" : ""
                }`}
                onClick={() => {
                  setSpeaker(String(id));
                  guidedInspect(`speaker:${id}`, 5);
                }}
              >
                <span>{name}</span>
                <small>{relation}</small>
                <em>写入说话人</em>
              </button>
            ))}
          </div>
        </>
      )}

      {stage === 4 && (
        <>
          <div className="guided-primary-action">
            <button
              type="button"
              className={guideStep === 0 ? "is-next-action" : ""}
              onClick={() => guidedInspect("rule:transform", 0)}
            >
              <span>测量值 / PARAMETER SHEET</span>
              <strong>0.57 ÷ 0.70 ≈ 0.82；发行版 +3 半音，因此还原值 -3。</strong>
              <small>B 棚红门参考：第六下之后存在 180 ms 拖擦尾声。</small>
            </button>
          </div>
          <div className="contour-compare">
            <Contour
              label="事故原轨 / 2012"
              values={[3, 6, 6, 4, 2, 5, 1]}
              current={guideStep === 1}
              disabled={guideStep < 1}
              onPlay={() => guidedPlay("source", 1)}
            />
            <Contour
              label="《无潮之夜》/ 2014"
              values={
                speed === "0.82" && pitch === "-3"
                  ? [3, 6, 6, 4, 2, 5, 1]
                  : [5, 7, 6, 5, 4, 6, 4]
              }
              warning
              disabled={guideStep < 2}
              current={guideStep === 2}
              onPlay={() => guidedPlay("released", 2)}
            />
          </div>
          <div className="parameter-row">
            <div>
              <span>速度</span>
              {["1.00", "0.92", "0.82"].map((value) => (
                <SystemButton
                  key={value}
                  active={speed === value}
                  disabled={guideStep < 3}
                  className={guideStep === 3 ? "is-next-action" : ""}
                  onClick={() => {
                    setSpeed(value);
                    playComparison(value, pitch);
                    advanceGuide(3);
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
                  disabled={guideStep < 4}
                  className={guideStep === 4 ? "is-next-action" : ""}
                  onClick={() => {
                    setPitch(value);
                    playComparison(speed, value);
                    advanceGuide(4);
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
              ["new", "样本 A", [32, 44, 28, 48, 36, 42]],
              ["door", "样本 B", [42, 55, 38, 62, 45, 28]],
              ["relay", "样本 C", [24, 24, 24, 24, 24, 24]],
            ] satisfies Array<[string, string, number[]]>).map(([id, label, pattern]) => (
              <button
                type="button"
                key={id}
                disabled={guideStep < 5}
                className={`${sample === id ? "is-selected" : ""} ${
                  guideStep === 5 ? "is-next-action" : ""
                }`}
                onClick={() => {
                  setSample(id);
                  inspectPlay(`sample:${id}`);
                  advanceGuide(5);
                }}
              >
                <span>{label}</span>
                <div className="transient-strip" aria-hidden="true">
                  {pattern.map((height, index) => (
                    <i key={index} style={{ height: `${height}%` }} />
                  ))}
                </div>
                <small>试听并记录第六下之后的尾声长度</small>
              </button>
            ))}
          </div>
        </>
      )}

      {stage === 5 && (
        <>
          <div className="relay-window-actions" aria-label="依次检查时间窗">
            {["22:49", "22:50", "23:11"].map((time, index) => (
              <button
                type="button"
                key={time}
                disabled={guideStep < index}
                className={
                  guideStep === index ? "is-next-action" : ""
                }
                onClick={() => {
                  if (time === "22:50") setRelayTime(time);
                  guidedPlay(`time:control@${time}`, index);
                }}
              >
                <span>
                  {time === "22:49"
                    ? "建立三个信号的正常基线"
                    : time === "22:50"
                      ? "检查按钮声后的变化"
                      : "确认变化是否持续"}
                </span>
                <strong>{time}</strong>
                <div className={`relay-listen-strip ${time !== "22:49" ? "is-silent" : ""}`}>
                  {Array.from({ length: 3 }, (_, pulse) => (
                    <i key={pulse} />
                  ))}
                </div>
                <small>
                  {time === "22:49"
                    ? "继电器 ● / 音乐 ● / 人声 ●"
                    : "继电器 ○ / 音乐 ● / 人声 ●"}
                </small>
              </button>
            ))}
          </div>
          <div className="relay-time-choices">
            <span>按钮声后音乐与人声继续、仅继电器消失。哪个解释能同时满足三项事实？</span>
            <div>
              {[
                ["power", "总电源断开"],
                ["microphone", "三个话筒同时故障"],
                ["bypass", "警报回路被手动旁路"],
              ].map(([id, label]) => (
                <button
                  type="button"
                  key={id}
                  disabled={guideStep < 3}
                  className={`${alarmCause === id ? "is-selected" : ""} ${
                    guideStep === 3 ? "is-next-action" : ""
                  }`}
                  onClick={() => {
                    setAlarmCause(id);
                    recordObservation(`cause:${id}`);
                    advanceGuide(3);
                  }}
                >
                  {label}
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
              {guideStep > 0 ? "重读 2012 规则表" : "读取 2012 规则表"}
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
              {inverted ? "当前操作已解封" : "解封本次会话操作记录"}
            </SystemButton>
            <p>
              {inverted
                ? "七次当前操作可以分别试听；先全部检查，再按规则逐项配对。"
                : "历史规则可读，当前操作仍被 AUTO_CLEAN 标签遮挡。"}
            </p>
          </div>
          {guideStep >= 3 && (
            <div className="listener-proof">
              <div>
                <span>
                  当前待匹配 /{" "}
                  {
                    HISTORICAL_ERASURE_RULES[
                      Math.min(
                        segmentOrder.length,
                        HISTORICAL_ERASURE_RULES.length - 1,
                      )
                    ].code
                  }
                </span>
                <strong>
                  {
                    HISTORICAL_ERASURE_RULES[
                      Math.min(
                        segmentOrder.length,
                        HISTORICAL_ERASURE_RULES.length - 1,
                      )
                    ].text
                  }
                </strong>
                <small>从操作卡中选择造成同一语义后果的一项。</small>
              </div>
            </div>
          )}
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
                    </>
                  )}
                  <em>{guideStep === 2 ? "试听" : "排入"}</em>
                </button>
              );
            })}
          </div>
          <div className="segment-output">
            <span>2012 规则 ↔ 当前操作配对</span>
            <div>
              {segmentOrder.length === 0
                ? "等待第一组配对"
                : segmentOrder.map((segment, index) => (
                    <b key={segment}>
                      {HISTORICAL_ERASURE_RULES[index].code} ↔{" "}
                      {FRAGMENT_META[segment].label.split(" / ")[0]}
                    </b>
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
              <span>当前会话 / 语义指纹比对</span>
              <strong>
                {guideStep < 4
                  ? "七组配对完成后才能检查"
                  : "7 / 7 个语义后果一一对应"}
              </strong>
              <small>
                文件名和时间不同，但并源、换位、移门栓、换说话人、改素材、删旁路与伪装自动七种后果完全一致。
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
              {guideStep > 4 ? "语义指纹已比对" : "核对七组语义后果"}
            </button>
          </div>
          <div className="meaning-choices listener-identity">
            <span>仅凭当前证据，哪项结论没有越界？</span>
            <div>
              {[
                ["auto-clean", "只是没有意图的自动降噪"],
                ["tang-himself", "可以确定就是唐肃本人"],
                ["workflow", "有人持有旧工程权限并复用同一删改流程；身份未知"],
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
    if (note === "response") {
      setNoteSolved(true);
      setMessage("");
      void playFinal();
    } else {
      const next = failures + 1;
      setFailures(next);
      setMessage(
        next >= 2
          ? "正确答案：选择“前六次声源 A，停顿后第七次声源 B”的版本。"
          : "回到第一章的书面规则：前六次同源，第七次必须由另一个声源回答。",
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
            <h2>从三个终局版本中，恢复真正发生过的 6+1 结构。</h2>
            <p>
              不需要辨认音高。复用第一章的书面规则：前六次来自同一声源，
              停顿后由另一个声源回答一次。
            </p>
            <div className="final-note-grid">
              {[
                ["same", "版本 A / 7 次全部来自声源 A"],
                ["response", "版本 B / 6 次 A，停顿后 1 次 B"],
                ["missing", "版本 C / 只有 6 次 A"],
              ].map(([id, label]) => (
                <button
                  type="button"
                  key={String(id)}
                  className={note === id ? "is-selected" : ""}
                  onClick={() => {
                    const selected = String(id);
                    setNote(selected);
                    void playFinal(`pattern:${selected}`);
                  }}
                >
                  {Array.from({ length: 7 }, (_, index) => (
                    <i
                      key={index}
                      style={{ height: `${32 + ((index * 17) % 52)}%` }}
                      className={
                        index === 6 && id === "response"
                          ? "is-response"
                          : index === 6 && id === "missing"
                            ? "is-missing"
                            : ""
                      }
                    />
                  ))}
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
              <span>{playing ? "正在播放 86 秒事故原轨…" : "双声源结构已恢复"}</span>
              <blockquote>
                乔岚在门内发出六次呼叫，童年陈默在走廊回答一次。
                这不是旋律暗号，是两个隔着锁门仍然确认彼此存在的人。
              </blockquote>
            </div>
            <p className="chapter-index">建立最终结论</p>
            <h2>七条证据已经闭合。回答谁锁门、父亲做了什么、当前证据能证明到哪里。</h2>
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
                (selectedPlayback?.option === "candidate:c" ||
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
                {completedSet.has(viewChapter)
                  ? chapter.monologue
                  : PRE_SOLVE_MONOLOGUES[viewChapter]}
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

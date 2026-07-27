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
  fact: string;
  monologue: string;
  transcript: string[];
  duration: string;
};

const STORAGE_KEY = "the-seventh-code-save-v1";

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
    title: "缺掉的一拍",
    file: "01_潮汐练习_三次",
    objective: "比较三次演奏，找出正式混音中被自动静音的节拍。",
    fact: "正式混音主动删除了第七个音，静音来自隐藏声道 07_ROOM。",
    monologue:
      "我不记得她的脸了。可她说“删掉多可惜”的时候，我知道下一秒自己会笑。身体比我先认出了这段录音。",
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
    title: "房间会记得",
    file: "02_房间测试_无标签",
    objective: "根据回声长度与排风共振，确认这段录音真正来自哪个房间。",
    fact: "录音来自 B 棚；门后的六次敲击与七音短句共享同一节奏。",
    monologue:
      "我记得那扇红门。十四年后，最有用的偏偏都是他们认为无关的声音。",
    transcript: [
      "乔岚：隔着玻璃听不见，我敲前六下，最后一下你唱。",
      "陈默（童声）：是什么意思？",
      "乔岚：我还听得见你。",
    ],
    duration: "00:31.800",
  },
  {
    id: 2,
    number: "03",
    title: "右耳里的六分钟",
    file: "03_导出前_立体声",
    objective: "分离右声道，将被音乐盖住的三句对话恢复到正确顺序。",
    fact: "有人为完成导出拒绝开门；现场还存在一个未登记的孩子。",
    monologue:
      "还有那个孩子。我为什么知道他数第七拍时，会先吸一口气？",
    transcript: [
      "声音 A：把 B 棚打开，母带归我。",
      "声音 B：先别开门，导出还差六分钟。",
      "声音 C：她还在里面。",
      "声音 D（童声）：一、二、三、四、五、六……",
    ],
    duration: "01:06.214",
  },
  {
    id: 3,
    number: "04",
    title: "一段话的剪口",
    file: "04_听证副本_合并",
    objective: "显示剪辑断口，判断“先别开门”真正属于哪个说话人。",
    fact: "唐肃说了“先别开门”；官方副本还删除了陈默在场的声音。",
    monologue:
      "我不可能在一段自己从没经历过的录音里，听见父亲这样叫我。",
    transcript: [
      "唐肃：先别开门，导出还差六分钟。",
      "陈渡：她还在里面。",
      "唐肃：我知道。六分钟后我亲自开。",
      "陈渡：小默？你怎么出来了？",
    ],
    duration: "00:44.920",
  },
  {
    id: 4,
    number: "05",
    title: "借来的副歌",
    file: "05_乔岚草稿_与_无潮之夜",
    objective: "对齐两段旋律，再判断获奖歌曲的打击乐采样来自哪里。",
    fact: "唐肃盗用了乔岚的七音旋律，也把红门后的六次敲击做成了鼓点。",
    monologue:
      "别人把它当鼓点，我却每次都在等它敲完。只有门外的人，才会说那不是求救。",
    transcript: [
      "乔岚工作备注：第七码保留小默的音高。不要修，不要替换。",
      "监听者 02：这是节拍，不是求救。",
    ],
    duration: "00:52.470",
  },
  {
    id: 5,
    number: "06",
    title: "报警器的休止符",
    file: "06_四十分钟",
    objective: "对齐三条时间码，找出火警继电器同时消失的时刻。",
    fact: "22:50，陈渡亲手旁路了火警继电器；他不是唯一有错的人，也并非没有错。",
    monologue:
      "我想找到一个版本，让我可以毫无保留地原谅他。监听者替我做好了那个版本。",
    transcript: [
      "陈渡：唐老师说只关四十分钟。",
      "陈渡：我知道流程不允许。我还是按了。",
      "远端文件：06_CLEAN_FATHER.wav",
    ],
    duration: "00:40.000",
  },
  {
    id: 6,
    number: "07",
    title: "七段静音",
    file: "07_ROOM_不可播放",
    objective: "反相消去表面音乐，按连续时间码排列七段房间声。",
    fact: "唐肃锁门并延迟断电；陈渡关闭警报、先救出陈默，再返回机房。",
    monologue:
      "门没有少敲一下。少回答的人是我。父亲删掉的不是七十秒，是我在那七十秒里听见的一切。",
    transcript: [
      "唐肃：锁上 B 棚。她拿不到母带，就签不了。",
      "陈渡：机架冒烟了，断总闸！",
      "唐肃：文件没写完。谁都别动电源。",
      "［B 棚红门传来六次敲击］",
      "陈默（童声）：最后一下该我唱。",
      "陈渡：别听。跟爸爸出去。",
      "［23:16:01，陈渡返回；远处安全门关闭］",
    ],
    duration: "02:17.700",
  },
];

const HINTS: string[][] = [
  [
    "不要猜音名。比较三行节拍格，找出只有正式混音缺失的位置。",
    "观察最右边的一拍：前两次都有低音，第三次只有灰色环境声。",
    "正确操作：选择正式混音的第 7 拍，再验证。",
  ],
  [
    "回声长度不是唯一线索，还要看右后方是否存在周期性排风共振。",
    "A 厅回声太长，走廊第一次反射太近。剩下的房间符合两项特征。",
    "正确答案：B 棚。",
  ],
  [
    "中央混音把对话盖住了。先单独播放右声道。",
    "对话顺序跟随背景节拍：取母带 → 等待导出 → 指出她仍在里面。",
    "正确顺序：A“把 B 棚打开” → B“还差六分钟” → C“她还在里面”。",
  ],
  [
    "先开启“显示剪口”，不要只凭音色判断说话人。",
    "空调底噪在那句话前断了一层，控制室样本与声音 B 的停顿一致。",
    "正确答案：“先别开门”来自唐肃。",
  ],
  [
    "先让两段旋律在速度和高度上重合，再比较门板共振。",
    "使用 0.82× 速度和降 3 个半音；六个瞬态仍与 B 棚红门一致。",
    "正确操作：0.82×、-3 半音，并选择“B 棚红门敲击”。",
  ],
  [
    "不要按歌曲开头对齐，要按工程时间码寻找三条轨道共同失去继电器声的位置。",
    "三条轨道在 22:50 之后同时没有每 20 秒一次的继电器轻响。",
    "正确答案：22:50；随后保留完整记录，不使用清理版本。",
  ],
  [
    "先打开反相。音乐消失后，片段底部会出现连续的时间码。",
    "按完整时间码从早到晚排列；时间接近时，可比较前一段尾部与后一段开头的机架低频。",
    "正确顺序：K4 → M1 → R7 → B2 → Q5 → D8 → H3。",
  ],
  [
    "最后一音不是要唱准，而是要保留童年的原始音高。",
    "乔岚的备注写着“第七码保留小默的音高”，它比标准结尾更低。",
    "正确答案：最低的那个音。",
  ],
];

const SYNC_EVENTS = [
  {
    title: "旧同步节点已连接",
    detail: "监听者 02：未命名",
    tone: "warning",
  },
  {
    title: "远端重命名",
    detail: "07_ROOM → 07_EMPTY / 空轨",
    tone: "danger",
  },
  {
    title: "标记被删除",
    detail: "第七码：不要循环这里",
    tone: "danger",
  },
  {
    title: "远端改标",
    detail: "声音 D → 对讲回授",
    tone: "danger",
  },
  {
    title: "覆盖被本地锁拒绝",
    detail: "管理密钥：TS_MASTER",
    tone: "danger",
  },
  {
    title: "远端批注",
    detail: "“这是节拍，不是求救。”",
    tone: "danger",
  },
  {
    title: "远端擦除已排队",
    detail: "上传：06_CLEAN_FATHER.wav",
    tone: "danger",
  },
  {
    title: "排序冲突",
    detail: "监听者 02 对调片段 06 / 07",
    tone: "danger",
  },
];

const REMOTE_ALERTS = [
  {
    level: "low",
    label: "链路异常",
    detail: "旧同步节点出现第二个游标；对方尚未写入。",
  },
  {
    level: "low",
    label: "远端改名",
    detail: "07_ROOM 标签正在被改成 07_EMPTY。",
  },
  {
    level: "medium",
    label: "标记冲突",
    detail: "右声道人声被重新标记为“对讲回授”。",
  },
  {
    level: "medium",
    label: "剪口删除",
    detail: "听证副本的剪辑断口标记刚刚消失。",
  },
  {
    level: "medium",
    label: "远端批注",
    detail: "六次门板瞬态被强制标记为“普通节拍”。",
  },
  {
    level: "high",
    label: "版本覆盖",
    detail: "远端上传了不包含 FIRE_RELAY 的清理版本。",
  },
  {
    level: "high",
    label: "排序遭改写",
    detail: "房间声片段顺序被调换；本地写入锁已阻止覆盖。",
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
  "chen|不要先相信人声。人声，最容易被剪。": {
    id: "father-note",
    duration: 5064,
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
    add(["chen", "不要先相信人声。人声，最容易被剪。"]);
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
      ["chen", "她还在里面！"],
      ["child", "一、二、三、四、五、六……"],
    );
  } else if (stage === 3) {
    const speaker = option.startsWith("speaker:")
      ? (option.slice(8) as VoiceId)
      : "tang";
    add([speaker, "先别开门。导出，还差六分钟。"]);
  } else if (stage === 5 && option === "record:clean") {
    add(["listener", "唐肃锁住了门。其他内容，与事故无关。"]);
  } else if (stage === 5 && !parseRelayPlayback(option)) {
    add(
      ["chen", "唐老师说，只关四十分钟。"],
      ["chen", "我知道流程不允许……我还是按了。"],
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
    id: "locked",
    label: "01 / 锁门",
    question: "乔岚为什么没能离开 B 棚？",
    source: "第 07 章 · K4 / 23:15:08.214",
    evidence: "还原片段中，唐肃说：“锁上 B 棚。她拿不到母带，就会签。”",
    wrong:
      "录音只证明唐肃下达了锁门命令，没有证据表明陈渡参与策划。",
    choices: [
      { id: "locked", text: "唐肃因母带纠纷下令锁住乔岚", correct: true },
      { id: "planned", text: "陈渡与唐肃共同策划锁门和火灾", correct: false },
    ],
  },
  {
    id: "delay",
    label: "02 / 断电",
    question: "机架冒烟后，为什么没有立刻断总闸？",
    source: "第 07 章 · M1 → R7",
    evidence:
      "陈渡喊“断总闸”后，唐肃回答：“文件没写完。谁都别动电源。”",
    wrong:
      "片段里没有门禁故障；阻止断电的是一个明确的人和一项未完成的导出。",
    choices: [
      { id: "delay", text: "唐肃为了等待非法导出，阻止立即断电", correct: true },
      { id: "fault", text: "机房门禁故障，导致无人能接近总闸", correct: false },
    ],
  },
  {
    id: "relay",
    label: "03 / 警报",
    question: "火警继电器为什么从 22:50 起同时消失？",
    source: "第 06 章 · 三轨时间码",
    evidence:
      "三条轨道在 22:50 后同时变为 0/3 次继电器声；陈渡承认：“我知道流程不允许……我还是按了。”",
    wrong:
      "如果是自然故障，不会同时留下 BYPASS_40M 字段和陈渡的操作证词。",
    choices: [
      { id: "relay", text: "陈渡违规旁路了火警继电器", correct: true },
      { id: "malfunction", text: "火警系统因机架过热自然损坏", correct: false },
    ],
  },
  {
    id: "edited",
    label: "04 / 剪辑",
    question: "官方副本为什么把“先别开门”归给了陈渡？",
    source: "第 04 章 · 00:42.118 剪口",
    evidence:
      "句中底噪从控制室 61 Hz 跳到机房 50 Hz；前半句与唐肃的控制室样本一致。",
    wrong:
      "同一句中出现两个房间指纹，说明它不是单纯的音色相似，而是被拼接过。",
    choices: [
      { id: "edited", text: "听证录音被剪辑，并错置了说话人", correct: true },
      { id: "similar", text: "两人声音相似，记录人员只是听错了", correct: false },
    ],
  },
  {
    id: "child",
    label: "05 / 缺席者",
    question: "官方现场名单还删除了谁？",
    source: "第 03—04 章 · 右声道 / 被删尾句",
    evidence:
      "右声道有孩子数到六；另一段里陈渡喊：“小默？你怎么出来了？”",
    wrong:
      "儿童声音在两份独立录音中连续出现，并被现场人物直接叫出名字。",
    choices: [
      { id: "child", text: "陈默当晚在场，他的童声也被删除", correct: true },
      { id: "sample", text: "童声只是导出工程中的广告采样", correct: false },
    ],
  },
  {
    id: "stolen",
    label: "06 / 作品",
    question: "十四年后的获奖作品使用了什么原始材料？",
    source: "第 05 章 · 0.82× / -3 半音",
    evidence:
      "旋律对齐后误差仅 0.8%；六次打击与 B 棚红门瞬态相似度 96%。",
    wrong:
      "重新演奏木鱼的相似度只有 41%，无法解释完全相同的六次间距与门板尾响。",
    choices: [
      {
        id: "stolen",
        text: "唐肃盗用乔岚旋律，并把求救敲击做成鼓点",
        correct: true,
      },
      { id: "replayed", text: "旋律合法重写，鼓点是后来重录的木鱼", correct: false },
    ],
  },
  {
    id: "silence",
    label: "07 / 沉默",
    question: "陈渡在事故后留下了怎样的责任？",
    source: "工程创建者 · CHEN_DU / 保存时间 2026.07.17",
    evidence:
      "他保存了完整工程和旁路证词，却直到十四年后仍没有亲口公开；工程最终留给陈默。",
    wrong:
      "当前工程本身证明证据没有被彻底销毁；但保存它也不能抵消十四年的沉默。",
    choices: [
      { id: "silence", text: "陈渡保留证据，却沉默了十四年", correct: true },
      { id: "destroyed", text: "陈渡销毁全部原始证据，完全站在唐肃一边", correct: false },
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
      "公开校验副本已经生成。乔岚的署名、旋律和六次敲击被放回同一份记录。",
      "陈渡不再承担唯一责任，也没有被塑造成英雄。警报旁路字段保留在公开版本中。",
      "监听者 02 已断开。0.7 秒后，同一旧密钥再次读取 07_ROOM；节点拒绝显示名称。",
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
      "陈渡在新的叙述里获得彻底平反。BYPASS_40M 与对应证词已从导出版本删除。",
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
      "封存锁落下前 0.2 秒，远端节点完成了一次完整下载。接收者仍显示“监听者 02”。",
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
      "take-a": "TAKE A：哼唱旋律，七拍完整",
      "take-b": "TAKE B：钢琴试奏，七拍完整",
      final: "正式混音：第七码被静音",
    }[option] ?? "正式混音：第七码被静音";
  }
  if (stage === 1) {
    return {
      "room:a": "A 厅参考：长混响与开阔低频",
      "room:b": "B 棚参考：短混响与右后排风共振",
      "room:hall": "走廊参考：过近的金属反射",
    }[option] ?? "待识别房间录音：短混响、排风声与六次敲击";
  }
  if (stage === 2) {
    return {
      mix: "中央混音：音乐覆盖了对话",
      left: "左声道：旋律与机房低频",
      right: "右声道：四句被隐藏的固定修复对白",
    }[option] ?? "中央混音：音乐覆盖了对话";
  }
  if (stage === 3) {
    if (option === "seam") return "剪口监听：底噪在句中断裂";
    if (option.startsWith("speaker:")) {
      return `说话人参考：${option.slice(8).toUpperCase()}`;
    }
    return "听证合并副本：说话人与底噪被拼接";
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
      return `房间声片段 ${FRAGMENT_META[segment]?.code ?? "未知编号"}`;
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
    "final",
    "default",
    "right",
    "speaker:tang",
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
    question: "正式混音具体删掉了哪一拍？",
    plain:
      "不用辨认音高。按顺序听三次演奏，只比较每次最后是否都有七个声音。",
    term: "节拍格：每一格代表声音出现的一次位置，不代表乐理考试。",
    steps: [
      "试听 TAKE A，记住它有七拍",
      "试听 TAKE B，确认它也有七拍",
      "试听正式混音，寻找末尾的空缺",
      "在正式混音中选择缺失的节拍",
      "提交所选节拍",
    ],
  },
  {
    question: "这段未标注录音实际来自哪个房间？",
    plain:
      "先听待识别录音，再依次听三个房间参考。比较回声长短和排风声位置，不需要判断音高。",
    term: "房间响应：同一个声音在不同空间里留下的回声形状。",
    steps: [
      "试听待识别的房间录音",
      "试听 A 厅参考",
      "试听 B 棚参考",
      "试听走廊参考",
      "选择最接近待识别录音的房间",
      "提交房间判断",
    ],
  },
  {
    question: "被音乐盖住的三句话藏在哪个声道？",
    plain:
      "依次单独听中央、左侧和右侧。找到对白后，再按听见的先后顺序排列文字。",
    term: "声道：左右两边可以保存不同声音；单扬声器模式也会用音色区分。",
    steps: [
      "试听中央混音",
      "试听左声道",
      "试听右声道",
      "按听见的顺序选择三句话",
      "提交声道与对白顺序",
    ],
  },
  {
    question: "“先别开门”真正是谁说的？",
    plain:
      "先听合并副本，再显示句子中间的剪口。随后用同一句话比较三个人的参考声音。",
    term: "剪口：两段录音被拼到一起时留下的底噪断层。",
    steps: [
      "试听被合并的听证副本",
      "显示并试听剪辑断口",
      "试听乔岚的说话人参考",
      "试听唐肃的说话人参考",
      "试听陈渡的说话人参考",
      "选择真正的说话人",
      "提交说话人判断",
    ],
  },
  {
    question: "获奖歌曲怎样改动了乔岚的原始旋律？",
    plain:
      "先分别听原稿和发行版，再逐项调整速度、音高并比较三种敲击材料。",
    term: "移调：让整段声音一起变高或变低；这里只需点击比较，不用懂乐理。",
    steps: [
      "试听乔岚的原始草稿",
      "试听发行版本",
      "选择一个速度并听双轨对比",
      "选择一个移调值并再次对比",
      "选择最接近发行版的敲击材料",
      "提交对齐结果",
    ],
  },
  {
    question: "火警继电器从哪个时刻开始消失？",
    plain:
      "先听完整记录，再依次比较三个时间窗和清理版本，最后分别选择时间与应保留的版本。",
    term: "继电器声：正常状态下周期出现的短促机械点击。",
    steps: [
      "试听完整记录",
      "试听 22:40 时间窗",
      "试听 22:50 时间窗",
      "试听 23:00 时间窗",
      "试听远端上传的清理版本",
      "选择继电器开始消失的时间",
      "选择要保留的记录版本",
      "提交时间与版本判断",
    ],
  },
  {
    question: "被表面音乐盖住的七段房间声，原本是什么顺序？",
    plain:
      "先听覆盖状态，再开启反相去掉共同音乐。先把七段都试听一遍，然后第二轮按时间连续性排列。",
    term: "反相：让两份相同音乐互相抵消，只留下它们不同的房间声。",
    steps: [
      "试听仍被音乐覆盖的录音",
      "开启反相，听见隐藏的房间声",
      "逐个试听七段碎片",
      "再次点击碎片，按时间顺序排入",
      "提交七段房间声顺序",
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
  { code: string; time: string; continuity: string }
> = {
  1: { code: "K4", time: "23:15:08.214", continuity: "机架低频 57→60 Hz" },
  2: { code: "M1", time: "23:15:19.882", continuity: "机架低频 60→63 Hz" },
  3: { code: "R7", time: "23:15:31.406", continuity: "机架低频 63→59 Hz" },
  4: { code: "B2", time: "23:15:43.017", continuity: "六次门板瞬态" },
  5: { code: "Q5", time: "23:15:52.663", continuity: "儿童声音；尾部 58 Hz" },
  6: { code: "D8", time: "23:16:01.090", continuity: "男性声音；尾部 61 Hz" },
  7: { code: "H3", time: "23:16:09.742", continuity: "安全门关闭；低频消失" },
};

const OBSERVATION_LIBRARY: Array<
  Record<string, Omit<Observation, "id">>
> = [
  {
    "take-a": {
      title: "TAKE A / 瞬态计数",
      detail: "检测到 7 次等间距声音；第 7 拍能量为 -18 dB。",
      role: "observation",
    },
    "take-b": {
      title: "TAKE B / 钢琴参考",
      detail: "检测到 7 次琴音；起音位置与 TAKE A 全部重合。",
      role: "support",
    },
    final: {
      title: "FINAL / 第 7 节拍格",
      detail: "主旋律能量为 0；同一位置只剩 07_ROOM 的微弱环境声。",
      role: "primary",
    },
  },
  {
    default: {
      title: "待识别录音 / 空间特征",
      detail: "回声衰减约 0.82 秒；右后方每 0.44 秒出现一次 146 Hz 共振。",
      role: "primary",
    },
    "room:a": {
      title: "A 厅参考",
      detail: "回声衰减 2.37 秒；低频开阔，没有周期性 146 Hz 共振。",
      role: "observation",
    },
    "room:b": {
      title: "B 棚参考",
      detail: "回声衰减 0.79 秒；右后排风口存在 146 Hz 周期共振。",
      role: "support",
    },
    "room:hall": {
      title: "走廊参考",
      detail: "回声衰减 0.51 秒；第一次金属反射出现在 0.08 秒。",
      role: "observation",
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
      title: "右声道 / 内容检测",
      detail: "检测到 3 段连续人声，起点依次为 00:18、00:24、00:30。",
      role: "primary",
    },
  },
  {
    default: {
      title: "听证副本 / 底噪变化",
      detail: "00:42.118 处背景从控制室 61 Hz 切换为机房 50 Hz。",
      role: "observation",
    },
    seam: {
      title: "剪口前半句 / 房间指纹",
      detail: "“先别开门”所在部分保留控制室 61 Hz 空调底噪。",
      role: "primary",
    },
    "speaker:qiao": {
      title: "乔岚参考 / B 棚",
      detail: "背景包含右后排风口 146 Hz 周期共振。",
      role: "observation",
    },
    "speaker:tang": {
      title: "唐肃参考 / 控制室",
      detail: "背景包含稳定的 61 Hz 空调底噪。",
      role: "support",
    },
    "speaker:chen": {
      title: "陈渡参考 / 机房",
      detail: "背景包含 50 Hz 机架低频与高频缺口。",
      role: "observation",
    },
  },
  {
    source: {
      title: "乔岚草稿 / 旋律轮廓",
      detail: "七音轮廓编号：3–6–6–4–2–5–1；速度基准 1.00×。",
      role: "observation",
    },
    released: {
      title: "发行版本 / 初始差异",
      detail: "速度约快 22%，整体高约 3 个半音；尾部存在 6 次木质瞬态。",
      role: "observation",
    },
    "sample:new": {
      title: "重新演奏木鱼 / 瞬态匹配",
      detail: "与发行版瞬态相似度 41%；高频衰减过快。",
      role: "observation",
    },
    "sample:door": {
      title: "B 棚红门 / 瞬态匹配",
      detail: "与发行版瞬态相似度 96%；低频尾响和六次间距均重合。",
      role: "support",
    },
    "sample:relay": {
      title: "机房继电器 / 瞬态匹配",
      detail: "与发行版瞬态相似度 23%；持续时间明显过短。",
      role: "observation",
    },
  },
  {
    "record:full": {
      title: "完整记录 / 继电器周期",
      detail: "22:50 前每 20 秒出现一次机械点击；最后一次为 22:49:40。",
      role: "observation",
    },
    "time:22:40": {
      title: "22:40 时间窗",
      detail: "三个声道均检测到 3/3 次继电器点击。",
      role: "observation",
    },
    "time:22:50": {
      title: "22:50 时间窗",
      detail: "22:50:00 之后三个声道同时变为 0/3；音乐录制仍继续。",
      role: "primary",
    },
    "time:23:00": {
      title: "23:00 时间窗",
      detail: "继电器仍为 0/3，但缺失状态在此时间窗之前已经开始。",
      role: "observation",
    },
    "record:clean": {
      title: "清理版本 / 元数据差异",
      detail: "删除字段：FIRE_RELAY、BYPASS_40M 与陈渡的对应证词。",
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
      detail: "共同旋律抵消后，出现七段连续时间码、门板瞬态和人声。",
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
      title: `双轨对齐 / ${speed}×、${pitch} 半音`,
      detail: matched
        ? "旋律轮廓误差 0.8%；七个起音的平均偏差仅 11 ms。"
        : "旋律仍有明显拍点漂移或高度偏差；轮廓误差大于 14%。",
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
      title: `碎片 ${meta.code} / 时间码`,
      detail: `${meta.time}；${meta.continuity}`,
      role: "observation",
    };
  }
  const definition = OBSERVATION_LIBRARY[stage]?.[option];
  return definition
    ? { id: `${stage}:${option}`, ...definition }
    : null;
}

const SOLUTION_OBSERVATION_OPTIONS = [
  ["final"],
  ["default", "room:b"],
  ["right"],
  ["seam", "speaker:tang"],
  ["compare:0.82:-3", "sample:door"],
  ["time:22:50", "record:clean"],
  [
    "phase:on",
    "fragment:1",
    "fragment:2",
    "fragment:3",
    "fragment:4",
    "fragment:5",
    "fragment:6",
    "fragment:7",
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
    }: {
      missingLast?: boolean;
      timbre?: "hum" | "piano" | "mix";
      rate?: number;
      pitchShift?: number;
      pan?: number;
      gain?: number;
    } = {},
  ) => {
    const shift = 2 ** (pitchShift / 12);
    const notes = [262, 330, 330, 294, 220, 294, 196];
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
      narrate("不要先相信人声。人声，最容易被剪。", 120, {
        voice: "chen",
        tone: "压得很低，第二句前停顿",
      });
      return finish(4400);
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
        melody(bus, now, { timbre: "hum", gain: 1.8 });
        return finish(2600);
      }
      if (option === "take-b") {
        melody(bus, now, { timbre: "piano", gain: 1.6 });
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
      const room = option.startsWith("room:")
        ? (option.slice(5) as "a" | "b" | "hall")
        : "b";
      roomResponse(bus, now, room);
      if (option === "default") {
        knocks(bus, now + 1.15, "door");
        return finish(3200);
      }
      return finish(room === "a" ? 2200 : 1500);
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
        narrate("她还在里面！", 4850, {
          voice: "chen",
          tone: "呼吸急促，几乎喊破音",
        });
        narrate("一、二、三、四、五、六……", 6400, {
          voice: "child",
          tone: "很远，数到六后等待回应",
        });
        return finish(10400);
      }
      if (selectedChannel === "mix") {
        return finish(2800);
      }
      tone(bus, 84, now, 2.4, 0.04, -0.72, "sine", 0.1);
      return finish(2800);
    }
    if (stage === 3) {
      if (option === "seam") {
        noise(bus, now + 0.74, 0.035, 0.13, -0.25, 2600);
        narrate("先别开门。导出，还差六分钟。", 60, {
          voice: "tang",
          tone: "原始人声单独播放；句中剪口另以短促脉冲标出",
        });
        return finish(3600);
      }
      if (option.startsWith("speaker:")) {
        const speaker = option.slice(8);
        const profiles: Record<
          string,
          { voice: VoiceId; tone: string }
        > = {
          qiao: {
            voice: "qiao",
            tone: "压着怒意，尾音上扬",
          },
          tang: {
            voice: "tang",
            tone: "平稳得不合时宜，句中没有喘息",
          },
          chen: {
            voice: "chen",
            tone: "急促，句尾气息散开",
          },
        };
        const profile = profiles[speaker] ?? {
          voice: "chen" as VoiceId,
          tone: "无法辨认",
        };
        narrate("先别开门。导出，还差六分钟。", 50, {
          voice: profile.voice,
          tone: profile.tone,
        });
        return finish(3600);
      }
      noise(bus, now + 0.73, 0.035, 0.07, -0.2, 1800);
      narrate("先别开门。导出，还差六分钟。", 60, {
        voice: "tang",
        tone: "原副本被压缩，语气细节模糊",
      });
      return finish(3600);
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
        if (time === "22:40") {
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
      return finish(7900);
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
          [1, 2, 3, 5, 6, 7].includes(fragment) ? 3600 : 2100,
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
      return finish(4400);
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
        <p>这里只记录可测量事实，不替你填写结论。</p>
      </header>
      {observations.length === 0 ? (
        <div className="observation-empty">
          试听或处理音轨后，系统会记录节拍、声道、时间码和声学指纹。
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
          <span>工程文件：7</span>
          <span>可正常播放：0</span>
          <span>当前监听者：1</span>
        </div>

        <blockquote className="father-note">
          <p>陈默：</p>
          <p>如果你看到这里，说明我还是没能亲口解释。</p>
          <p>不要先相信人声。人声最容易被剪。</p>
          <p>先听每段音乐里，不该消失的东西。</p>
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
  const [message, setMessage] = useState("");
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

  const applyCorrectOperation = () => {
    if (stage === 0) setBeat(6);
    if (stage === 1) setRoom("b");
    if (stage === 2) {
      setChannel("right");
      setDialogueOrder(["a", "b", "c"]);
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
      setVersionChoice("full");
    }
    if (stage === 6) {
      setInverted(true);
      setSegmentOrder([1, 2, 3, 4, 5, 6, 7]);
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
      if (room === "b") succeed();
      else fail("回声长度或排风方向有一项对不上。");
      return;
    }
    if (stage === 2) {
      const correct = dialogueOrder.join(",") === "a,b,c";
      if (channel === "right" && correct) succeed();
      else {
        fail(
          channel !== "right"
            ? "中央混音仍然盖住了对话。"
            : "三句话之间的节拍没有连续。",
        );
      }
      return;
    }
    if (stage === 3) {
      if (cutsVisible && speaker === "tang") succeed();
      else {
        fail(
          !cutsVisible
            ? "必须先显示剪口，才能排除被合并后的假声道。"
            : "这个声纹的停顿和控制室样本不一致。",
        );
      }
      return;
    }
    if (stage === 4) {
      if (speed === "0.82" && pitch === "-3" && sample === "door") {
        succeed();
      } else {
        fail("两条旋律或瞬态指纹还没有完全重合。");
      }
      return;
    }
    if (stage === 5) {
      if (relayTime === "22:50" && versionChoice === "full") succeed();
      else {
        fail(
          relayTime !== "22:50"
            ? "三条轨道并没有在这个时刻同时失去继电器声。"
            : "清理版本删掉了对陈渡不利、却真实存在的操作。",
        );
      }
      return;
    }
    const correct = segmentOrder.join(",") === "1,2,3,4,5,6,7";
    if (inverted && correct) succeed();
    else {
      fail(
        !inverted
          ? "表面音乐仍然盖住房间声。"
          : "机架低频在两个片段之间断开了。",
      );
    }
  };

  const dialogueCards = [
    { id: "b", text: "先别开门，导出还差六分钟。" },
    { id: "c", text: "她还在里面。" },
    { id: "a", text: "把 B 棚打开，母带归我。" },
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
      <GuidedPanel
        stage={stage}
        step={guideStep}
        currentDetail={guideDetail}
        onLocate={locateNextAction}
      />
      <div className="puzzle-surface" aria-label="当前谜题操作区">
      {stage === 0 && (
        <div className="beat-comparison">
          {[
            { label: "TAKE A / 口哼", missing: false, option: "take-a" },
            { label: "TAKE B / 钢琴", missing: false, option: "take-b" },
            { label: "FINAL / 正式混音", missing: true, option: "final" },
          ].map((row, rowIndex) => (
            <div className="beat-row" key={row.label}>
              <div className="beat-row-label">
                <span>{row.label}</span>
                <button
                  type="button"
                  className={guideStep === rowIndex ? "is-next-action" : ""}
                  disabled={guideStep < rowIndex}
                  onClick={() => guidedPlay(row.option, rowIndex)}
                >
                  {guideStep > rowIndex ? "重新试听" : "试听此轨"}
                </button>
              </div>
              <div className="beat-cells">
                {[44, 72, 72, 58, 32, 58, 22].map((height, index) => (
                  <button
                    type="button"
                    key={index}
                    aria-label={`${row.label} 第 ${index + 1} 拍`}
                    className={`beat-cell ${
                      row.missing && index === 6 ? "is-missing" : ""
                    } ${
                      rowIndex === 2 && beat === index ? "is-selected" : ""
                    } ${
                      rowIndex === 2 && guideStep === 3
                        ? "is-next-action"
                        : ""
                    }`}
                    disabled={rowIndex !== 2 || guideStep < 3}
                    onClick={() => {
                      setBeat(index);
                      advanceGuide(3);
                    }}
                  >
                    <i style={{ height: `${row.missing && index === 6 ? 3 : height}%` }} />
                    <b>{index + 1}</b>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {stage === 1 && (
        <>
          <div className="guided-primary-action">
            <SystemButton
              active={guideStep === 0}
              className={guideStep === 0 ? "is-next-action" : ""}
              onClick={() => guidedPlay("default", 0)}
            >
              {guideStep > 0 ? "重新试听待识别录音" : "试听待识别录音"}
            </SystemButton>
          </div>
          <div className="room-grid">
            {[
              {
                id: "a",
                name: "A 厅",
                meta: "2.4s / 低频开阔",
                bars: [92, 76, 61, 45, 32],
                step: 1,
              },
              {
                id: "b",
                name: "B 棚",
                meta: "0.8s / 右后排风共振",
                bars: [86, 52, 31, 17, 8],
                step: 2,
              },
              {
                id: "hall",
                name: "走廊",
                meta: "0.5s / 早期反射过近",
                bars: [88, 67, 18, 6, 2],
                step: 3,
              },
            ].map((item) => (
              <button
                type="button"
                key={item.id}
                disabled={guideStep < item.step}
                className={`room-card ${room === item.id ? "is-selected" : ""} ${
                  guideStep === item.step || guideStep === 4
                    ? "is-next-action"
                    : ""
                }`}
                onClick={() => {
                  if (guideStep < 4) {
                    guidedPlay(`room:${item.id}`, item.step);
                  } else {
                    setRoom(item.id);
                    inspectPlay(`room:${item.id}`);
                    advanceGuide(4);
                  }
                }}
              >
                <span>{item.name}</span>
                <small>{item.meta}</small>
                <em>{guideStep < 4 ? "试听空间参考" : "选择这个房间"}</em>
                <div className="decay-bars" aria-hidden="true">
                  {item.bars.map((height, index) => (
                    <i key={index} style={{ height: `${height}%` }} />
                  ))}
                </div>
              </button>
            ))}
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
                  <span>声音 {card.id.toUpperCase()}</span>
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
            {[38, 39, 40, 41, 42, 43, 44].map((number) => (
              <span key={number} className={number === 42 ? "jump" : ""}>
                {number}
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
            {cutsVisible ? "剪口已显示" : "显示剪辑断口"}
          </SystemButton>
          <div className="speaker-grid">
            {[
              ["qiao", "乔岚", "B 棚 / 短混响", 2],
              ["tang", "唐肃", "控制室 / 长停顿", 3],
              ["chen", "陈渡", "机房 / 高频缺口", 4],
            ].map(([id, name, meta, step]) => (
              <button
                type="button"
                key={id}
                disabled={guideStep < Number(step)}
                className={`${speaker === String(id) ? "is-selected" : ""} ${
                  guideStep === Number(step) || guideStep === 5
                    ? "is-next-action"
                    : ""
                }`}
                onClick={() => {
                  if (guideStep < 5) {
                    guidedPlay(`speaker:${id}`, Number(step));
                  } else {
                    setSpeaker(String(id));
                    inspectPlay(`speaker:${id}`);
                    advanceGuide(5);
                  }
                }}
              >
                <span>{name}</span>
                <small>{meta}</small>
                <em>
                  {guideStep < 5 ? "试听同一句话" : "选择为真正说话人"}
                </em>
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
          <div className="sample-choices">
            {[
              ["new", "重新演奏的木鱼"],
              ["door", "B 棚红门敲击"],
              ["relay", "机房继电器"],
            ].map(([id, label]) => (
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
                <small>点击试听</small>
              </button>
            ))}
          </div>
        </>
      )}

      {stage === 5 && (
        <>
          <div className="guided-primary-action">
            <SystemButton
              active={guideStep === 0}
              className={guideStep === 0 ? "is-next-action" : ""}
              onClick={() => guidedPlay("record:full", 0)}
            >
              {guideStep > 0 ? "重新试听完整记录" : "试听完整记录"}
            </SystemButton>
          </div>
          <div className="relay-grid">
            {["ROOM", "PIANO", "CONTROL"].map((label, row) => (
              <div className="relay-row" key={label}>
                <span>{label}</span>
                {["22:40", "22:50", "23:00"].map((time, index) => (
                  <button
                    type="button"
                    key={time}
                    disabled={guideStep < index + 1}
                    className={`${relayTime === time ? "is-selected" : ""} ${
                      index >= 1 ? "silent" : ""
                    } ${
                      guideStep === index + 1 || guideStep === 5
                        ? "is-next-action"
                        : ""
                    }`}
                    onClick={() => {
                      const option = `time:${label.toLowerCase()}@${time}`;
                      if (guideStep < 5) {
                        guidedPlay(option, index + 1);
                      } else {
                        setRelayTime(time);
                        inspectPlay(option);
                        advanceGuide(5);
                      }
                    }}
                    aria-label={`${label} ${time}`}
                  >
                    {index === 0 ? "•••" : "—"}
                    {row === 2 && <small>{time}</small>}
                  </button>
                ))}
              </div>
            ))}
          </div>
          <div className="clean-version">
            <div>
              <span>远端上传</span>
              <strong>06_CLEAN_FATHER.wav</strong>
              <small>已删除：FIRE_RELAY / BYPASS 40M</small>
              <div className="version-auditions">
                <button
                  type="button"
                  disabled={guideStep < 6}
                  className={`${
                    versionChoice === "full" ? "is-selected" : ""
                  } ${guideStep === 6 ? "is-next-action" : ""}`}
                  onClick={() => {
                    setVersionChoice("full");
                    inspectPlay("record:full");
                    advanceGuide(6);
                  }}
                >
                  选择完整记录
                </button>
                <button
                  type="button"
                  disabled={guideStep < 4}
                  className={`${
                    versionChoice === "clean" ? "is-selected" : ""
                  } ${
                    guideStep === 4 || guideStep === 6
                      ? "is-next-action"
                      : ""
                  }`}
                  onClick={() => {
                    if (guideStep < 6) {
                      guidedPlay("record:clean", 4);
                    } else {
                      setVersionChoice("clean");
                      inspectPlay("record:clean");
                      advanceGuide(6);
                    }
                  }}
                >
                  {guideStep < 6 ? "试听清理版本" : "选择清理版本"}
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
                    : guideStep < 6
                      ? "先完成声音比较"
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
                ? "共同音乐已抵消。房间声与时间码可见。"
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
                  <span>FRAGMENT</span>
                  <strong>{meta.code}</strong>
                  <small>{meta.time}</small>
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
                    <b key={segment}>{FRAGMENT_META[segment].code}</b>
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
        </>
      )}

      {textAssist && (
        <div className="text-assist-note">
          <span>文字辅助</span>
          当前声音信息已转换为节拍格、声道能量、时间码和可选文本。无需辨认音高。
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
          ? "正确答案：选择最低的音。乔岚要求保留小默原本唱低的第七码。"
          : "这个音让旋律更标准，却不是童年录音里的版本。",
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
          ? "七项事实已经连接。先检查完整因果链，再进入发布决定。"
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
            <h2>把当晚没有唱出的音，放回第七拍。</h2>
            <p>
              乔岚敲前六下，最后一音由童年的陈默回答。请选择原始音高，不要替他修准。
            </p>
            <div className="final-note-grid">
              {[
                ["high", "标准高音", 78],
                ["mid", "稳定中音", 54],
                ["low", "偏低原音", 28],
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
              <span>{playing ? "正在播放完整七音…" : "第七拍已恢复"}</span>
              <blockquote>
                小默，这个音低了一点。别重唱。七拍都在，我们就知道对方还听得见。
                干净不等于真的。人也一样。
              </blockquote>
            </div>
            <p className="chapter-index">建立最终结论</p>
            <h2>不要一次选完。按证据把七个因果位置逐项接起来。</h2>
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
                    <span>CHAIN VERIFIED / 07 OF 07</span>
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
    setStatus(`事实已写入：${chapter.fact}`);
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
        <nav className="chapter-switcher" aria-label="七个工程文件">
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
                          ? "已确认"
                          : "正在修复"}
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
              谜题证据与剧情对白分轨播放；播放头和刻度按当前样本的真实时长推进。
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

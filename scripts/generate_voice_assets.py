#!/usr/bin/env python3
"""Generate the fixed Mandarin dialogue clips used by the game.

Install the one-off authoring dependency with:
    python3 -m pip install edge-tts

The browser never calls the speech service. Generated clips are committed under
public/audio/voices and are served as ordinary static assets.
"""

from __future__ import annotations

import asyncio
import shutil
import subprocess
import tempfile
from dataclasses import dataclass
from pathlib import Path

import edge_tts


ROOT = Path(__file__).resolve().parents[1]
OUTPUT_DIR = ROOT / "public" / "audio" / "voices"


@dataclass(frozen=True)
class VoiceStyle:
    voice: str
    rate: str
    pitch: str
    volume: str


STYLES = {
    "qiao": VoiceStyle("zh-CN-XiaoxiaoNeural", "-8%", "-2Hz", "-5%"),
    "tang": VoiceStyle("zh-CN-YunyangNeural", "-14%", "-10Hz", "-6%"),
    "chen": VoiceStyle("zh-CN-YunxiNeural", "-7%", "-6Hz", "-5%"),
    "child": VoiceStyle("zh-CN-YunxiaNeural", "-5%", "+4Hz", "-7%"),
    "listener": VoiceStyle("zh-CN-YunjianNeural", "-20%", "-12Hz", "-9%"),
}


CLIPS = [
    (
        "father-note",
        "chen",
        "十四年前，乔岚在门后敲了六下。你一直说自己没有回答。我把事故母带拆成七层，因为完整的一份还会被同一把密钥删掉。不要先相信记忆。先找回那个被我们一起拿走的第七码。",
    ),
    ("listener-01", "listener", "你不记得这个音。为什么还要把它放回去？"),
    ("listener-02", "listener", "房间会留下回声。记忆不会。"),
    ("listener-03", "listener", "那个孩子，没有登记。"),
    ("listener-04", "listener", "名字放错了而已。你已经得到想要的答案。"),
    ("listener-05", "listener", "这是节拍。不是求救。"),
    ("listener-06", "listener", "你真的要保留，他做错的那一部分？"),
    ("listener-07", "listener", "最后一段，不要播放。"),
    ("listener-final", "listener", "你确定，要让他们听见全部吗，陈默？"),
    ("ending-complete", "listener", "七拍都在。你确定，听见的人只有他们吗？"),
    ("ending-clean", "child", "爸爸……为什么又把我删掉了？"),
    ("ending-sealed", "listener", "你没有发布。没关系。我已经替你保存了。"),
    ("qiao-low-note", "qiao", "小默，你又把最后一个音唱低了。"),
    ("child-retry", "child", "要重来吗？"),
    ("qiao-keep-mistake", "qiao", "不重来。错得这么认真，删掉多可惜。"),
    ("qiao-wait-song", "qiao", "再来一次。最后一下，等你唱。"),
    ("qiao-six-knocks", "qiao", "隔着玻璃听不见。我敲前六下。"),
    ("child-last-note", "child", "最后一下，我唱吗？"),
    ("qiao-still-hear", "qiao", "对。这样我就知道，你还听得见。"),
    ("qiao-open-studio", "qiao", "把 B 棚打开，母带归我。"),
    ("tang-wait-export", "tang", "先别开门。导出，还差六分钟。"),
    ("qiao-wait-export", "qiao", "先别开门。导出，还差六分钟。"),
    ("chen-wait-export", "chen", "先别开门。导出，还差六分钟。"),
    ("chen-she-inside", "chen", "她还在里面！"),
    ("child-count-six", "child", "一、二、三、四、五、六……"),
    ("qiao-keep-pitch", "qiao", "第七码，保留小默原来的音高。不要修。"),
    ("listener-clean-story", "listener", "唐肃锁住了门。其他内容，与事故无关。"),
    ("chen-forty-minutes", "chen", "唐老师说，只关四十分钟。"),
    ("chen-bypass", "chen", "我知道流程不允许……我还是按了。"),
    (
        "chen-erased-child",
        "chen",
        "我把小默那一轨删了。不是为了唐肃……是因为他当时也在现场。",
    ),
    ("tang-lock-studio", "tang", "锁上 B 棚。她拿不到母带，就会签。"),
    ("chen-cut-power", "chen", "机架冒烟了！断总闸！"),
    ("tang-do-not-cut", "tang", "文件没写完。谁都别动电源。"),
    ("child-my-turn", "child", "最后一下……该我唱。"),
    ("chen-follow-dad", "chen", "别听。小默，跟爸爸出去。"),
    ("chen-dont-look", "chen", "别回头。"),
    ("qiao-dont-retake", "qiao", "小默，这个音低了一点。别重唱。"),
    ("qiao-seven-present", "qiao", "七拍都在，我们就知道，对方还听得见。"),
]


async def generate_clip(
    clip_id: str,
    role: str,
    text: str,
    temp_dir: Path,
) -> None:
    style = STYLES[role]
    raw_path = temp_dir / f"{clip_id}.mp3"
    output_path = OUTPUT_DIR / f"{clip_id}.mp3"
    communicate = edge_tts.Communicate(
        text,
        style.voice,
        rate=style.rate,
        pitch=style.pitch,
        volume=style.volume,
    )
    await communicate.save(str(raw_path))
    subprocess.run(
        [
            "ffmpeg",
            "-hide_banner",
            "-loglevel",
            "error",
            "-y",
            "-i",
            str(raw_path),
            "-af",
            "highpass=f=70,lowpass=f=12000,loudnorm=I=-19:TP=-2.5:LRA=7",
            "-codec:a",
            "libmp3lame",
            "-b:a",
            "64k",
            str(output_path),
        ],
        check=True,
    )


async def main() -> None:
    if shutil.which("ffmpeg") is None:
        raise SystemExit("ffmpeg is required to normalize the generated clips")
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix="seventh-code-voices-") as temp:
        temp_dir = Path(temp)
        for index, (clip_id, role, text) in enumerate(CLIPS, start=1):
            print(f"[{index:02d}/{len(CLIPS)}] {clip_id}")
            await generate_clip(clip_id, role, text, temp_dir)


if __name__ == "__main__":
    asyncio.run(main())

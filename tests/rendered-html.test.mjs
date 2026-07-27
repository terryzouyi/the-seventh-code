import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("server-renders the audio archive cover", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>第七码｜音轨修复悬疑游戏<\/title>/i);
  assert.match(html, /未完成工程/);
  assert.match(html, /第七码/);
  assert.match(html, /当前监听者：1/);
  assert.match(html, /开始校验/);
  assert.match(html, /不会访问麦克风/);
  assert.doesNotMatch(html, /codex-preview|react-loading-skeleton/i);
});

test("contains seven playable chapters, accessible clues, and local progress", async () => {
  const [component, page, layout, css, packageJson] = await Promise.all([
    readFile(new URL("../app/AudioArchiveGame.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
  ]);

  for (const file of [
    "01_潮汐练习_三次",
    "02_房间测试_无标签",
    "03_导出前_立体声",
    "04_听证副本_合并",
    "05_乔岚草稿_与_无潮之夜",
    "06_四十分钟",
    "07_ROOM_不可播放",
  ]) {
    assert.match(component, new RegExp(file));
  }

  assert.match(component, /localStorage/);
  assert.match(component, /AudioContext/);
  assert.doesNotMatch(component, /speechSynthesis|SpeechSynthesisUtterance/);
  assert.match(component, /VOICE_PROFILES/);
  assert.match(component, /VOICE_CLIPS/);
  assert.match(component, /await graph\.context\.resume\(\)/);
  assert.match(component, /graph\.context\.state !== "running"/);
  assert.match(component, /decodeAudioData/);
  assert.match(component, /fetch\(sourceUrl\)/);
  assert.match(component, /voiceBuffers/);
  assert.doesNotMatch(component, /new Audio\(/);
  assert.match(component, /master\.gain\.value = 0\.46/);
  assert.match(component, /danger \? 0\.72 : 0\.82/);
  assert.match(component, /timbre: "hum", gain: 1\.8/);
  assert.match(component, /timbre: "piano", gain: 1\.6/);
  assert.match(component, /gain: 1\.9/);
  assert.match(component, /浏览器未允许播放。请再次点击当前样本重试/);
  assert.match(component, /onPlay: \(option\?: string\) => Promise<boolean>/);
  assert.match(component, /const ready = await inspectPlay\(option\)/);
  assert.match(component, /if \(!result\.started\)/);
  assert.match(component, /PlaybackSelection/);
  assert.match(component, /currentPlayback/);
  assert.match(component, /getPlaybackWaveformSeed/);
  assert.match(component, /getReviewPlaybackOption/);
  assert.match(component, /LISTENER_VOICE_LINES/);
  assert.match(component, /声纹字幕/);
  assert.match(component, /第一次叫出你的名字/);
  assert.match(component, /小默，你又把最后一个音唱低了/);
  assert.match(component, /不要一次选完/);
  assert.match(component, /当前只处理第/);
  assert.match(component, /证据来源/);
  assert.match(component, /因果链已完成，进入发布决定/);
  assert.doesNotMatch(component, /FINAL_FACTS/);
  assert.match(component, /未归档事件/);
  assert.match(component, /读取第/);
  assert.match(component, /这段人声不在发布清单内/);
  assert.match(component, /option\.startsWith\("ending:"\)/);
  assert.match(component, /为什么又把我删掉了/);
  assert.match(component, /我已经替你保存了/);
  assert.match(component, /canvas/);
  assert.match(component, /全文字辅助/);
  assert.match(component, /监听者 02/);
  assert.match(component, /REMOTE_ALERTS/);
  assert.match(component, /本地写入锁已阻止覆盖/);
  assert.match(component, /REMOTE \/ LISTENER 02/);
  assert.match(component, /完整母带/);
  assert.match(component, /干净版本/);
  assert.match(component, /未发布工程/);
  assert.match(component, /装入正确操作/);
  for (const audibleChoice of [
    "take-a",
    "take-b",
    "room:",
    "speaker:",
    "compare:",
    "sample:",
    "time:",
    "record:full",
    "record:clean",
    "phase:on",
    "phase:off",
    "fragment:",
    "note:",
  ]) {
    assert.match(component, new RegExp(audibleChoice.replace(":", "\\:")));
  }
  assert.match(component, /单扬声器模式也会用音色区分/);
  assert.match(component, /本章要证明/);
  assert.match(component, /现在请做/);
  assert.match(component, /修复步骤/);
  assert.match(component, /请先完成当前步骤/);
  assert.match(component, /提示会从方向逐步增加到正确操作/);
  assert.match(component, /自动观察记录/);
  assert.match(component, /这里只记录可测量事实，不替你填写结论/);
  assert.match(component, /关键观察/);
  assert.match(component, /可选佐证/);
  assert.match(component, /查看完整修复步骤/);
  assert.match(component, /修复记录/);
  assert.match(component, /正在修复/);
  assert.match(component, /线索记录/);
  assert.match(component, /剧情回顾/);
  assert.match(component, /定位下一步/);
  assert.match(component, /点击黄色高亮/);
  assert.match(component, /页面中的黄色高亮区域就是当前可点击位置/);
  assert.match(component, /打开提示/);
  assert.match(component, /当前样本仍可重播/);
  assert.match(component, /下一章请重新选择样本/);
  assert.match(component, /顶部只重播你最后点击的样本/);
  assert.match(component, /先选择样本/);
  assert.match(component, /time:\$\{label\.toLowerCase\(\)\}@\$\{time\}/);
  assert.match(component, /ROOM 房间轨/);
  assert.match(component, /PIANO 钢琴轨/);
  assert.match(component, /CONTROL 控制轨/);
  assert.match(component, /FRAGMENT_META\[segment\]\?\.code/);
  assert.match(component, /K4 → M1 → R7 → B2 → Q5 → D8 → H3/);
  assert.doesNotMatch(component, /voiceTexture/);
  assert.doesNotMatch(component, /getUserMedia|mediaDevices|\.loop\s*=\s*true/);

  assert.match(page, /AudioArchiveGame/);
  assert.doesNotMatch(page, /codex-preview|SkeletonPreview/);
  assert.match(layout, /lang="zh-CN"/);
  assert.match(layout, /title:\s*"第七码"/);
  assert.match(css, /@media \(max-width:\s*680px\)/);
  assert.match(css, /prefers-reduced-motion/);
  assert.match(css, /\.puzzle-action-dock/);
  assert.match(css, /\.side-tabs/);
  assert.match(css, /\.chapter-switcher/);
  assert.match(css, /\.investigation-body/);
  assert.match(css, /\.remote-alert/);
  assert.match(css, /\.threat-high/);
  assert.match(css, /@keyframes remote-pressure/);
  assert.match(css, /@keyframes guide-target-pulse/);
  assert.match(css, /\.live-voice-cue/);
  assert.match(css, /@keyframes voice-print-pulse/);
  assert.match(css, /\.conclusion-builder/);
  assert.match(css, /\.chain-evidence/);
  assert.match(css, /\.chain-options/);
  assert.match(css, /\.ending-log-sequence/);
  assert.match(css, /\.ending-anomaly/);
  assert.match(css, /\.audio-error/);
  assert.match(css, /@keyframes ending-anomaly-scan/);
  assert.match(css, /\.dock-locate-button/);
  assert.match(packageJson, /"name": "the-seventh-code"/);
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);

  await assert.rejects(access(new URL("../app/_sites-preview", import.meta.url)));
  await access(
    new URL("../public/audio/voices/father-note.mp3", import.meta.url),
  );
  await access(
    new URL("../public/audio/voices/ending-complete.mp3", import.meta.url),
  );
  await access(new URL("../剧本设定.md", import.meta.url));
  await access(root);
});

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
  assert.match(html, /母带只有八十六秒/);
  assert.match(html, /当前监听者：1/);
  assert.match(html, /开始校验/);
  assert.match(html, /不会访问麦克风/);
  assert.doesNotMatch(html, /codex-preview|react-loading-skeleton/i);
});

test("contains seven logically deducible puzzles and a bounded conclusion", async () => {
  const [component, page, layout, css, packageJson] = await Promise.all([
    readFile(new URL("../app/AudioArchiveGame.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
  ]);

  for (const pass of [
    "PASS 01",
    "PASS 02",
    "PASS 03",
    "PASS 04",
    "PASS 05",
    "PASS 06",
    "PASS 07",
  ]) {
    assert.match(component, new RegExp(pass));
  }

  assert.match(component, /the-seventh-code-save-v4/);
  assert.match(component, /localStorage/);
  assert.match(component, /AudioContext/);
  assert.match(component, /decodeAudioData/);
  assert.match(component, /requiredVoiceClips/);
  assert.match(component, /VOICE_CLIPS/);
  assert.doesNotMatch(component, /speechSynthesis|SpeechSynthesisUtterance/);
  assert.doesNotMatch(component, /getUserMedia|mediaDevices|\.loop\s*=\s*true/);

  // PASS 01: a written rule, neutral candidates, and one valid 6+1 structure.
  assert.match(component, /前六次由我发出；停下以后，等另一个人回答一次/);
  assert.match(component, /candidate:a/);
  assert.match(component, /candidate:b/);
  assert.match(component, /candidate:c/);
  assert.match(component, /if \(beat === 1\)/);

  // PASS 02: source location is derived from the earliest arrival, not timbre.
  assert.match(component, /声音最先到达离它最近的话筒/);
  assert.match(component, /呼叫 0 ms \/ 回应 \+41 ms/);
  assert.match(component, /呼叫 \+38 ms \/ 回应 0 ms/);
  assert.match(component, /room === "booth-corridor"/);

  // PASS 03–04: necessary action order and physical-channel attribution.
  assert.match(component, /命令先于门栓；门栓先于拉门失败/);
  assert.match(component, /dialogueOrder\.join\(","\) === "a,b,c,d"/);
  assert.match(component, /CONTROL_BUS/);
  assert.match(component, /speaker === "tang"/);
  assert.match(component, /声音可以被复制，物理入口不会/);

  // PASS 05: restoration parameters are calculated and source needs a second proof.
  assert.match(component, /0\.57 ÷ 0\.70 ≈ 0\.82/);
  assert.match(component, /发行版 \+3 半音，因此还原值 -3/);
  assert.match(component, /180 ms 拖擦尾声/);
  assert.match(component, /speed === "0\.82" && pitch === "-3" && sample === "door"/);

  // PASS 06: a hypothesis must explain both disappearing and continuing signals.
  assert.match(component, /总电源断开/);
  assert.match(component, /三个话筒同时故障/);
  assert.match(component, /警报回路被手动旁路/);
  assert.match(component, /alarmCause === "bypass"/);
  assert.match(component, /versionChoice === "full"/);

  // PASS 07: semantic matching proves a workflow, but not a person's identity.
  assert.match(component, /HISTORICAL_ERASURE_RULES/);
  assert.match(component, /segmentOrder\.join\(","\) === "4,2,6,1,7,3,5"/);
  assert.match(component, /listenerIdentity === "workflow"/);
  assert.match(component, /真实身份未知/);
  assert.match(component, /可以确定就是唐肃本人/);
  assert.doesNotMatch(component, /listenerIdentity === "master-key"/);

  // Finale reuses the first rule and separates facts from publication choice.
  assert.match(component, /if \(note === "response"\)/);
  assert.match(component, /playFinal\(`pattern:\$\{selected\}`\)/);
  assert.match(component, /\["response", "版本 B/);
  assert.match(component, /回答谁锁门、父亲做了什么、当前证据能证明到哪里/);
  assert.match(component, /陈渡没有故意杀人，但对警报旁路与事后删轨负责/);
  assert.match(component, /真相不会因选择改变/);
  assert.match(component, /完整母带/);
  assert.match(component, /干净版本/);
  assert.match(component, /未发布工程/);

  // Conclusions are revealed after verification; the active workspace shows a question.
  assert.match(component, /本章待证明/);
  assert.match(component, /结论只会在验证通过后写入证据链/);
  assert.match(component, /PRE_SOLVE_MONOLOGUES/);
  assert.match(component, /已确认事实/);
  assert.doesNotMatch(component, /本章将写出/);

  // Guidance, accessibility and mobile layout remain intact.
  assert.match(component, /修复步骤/);
  assert.match(component, /定位下一步/);
  assert.match(component, /提示会从方向逐步增加到正确操作/);
  assert.match(component, /全文字辅助/);
  assert.match(component, /自动观察记录/);
  assert.match(component, /线索记录/);
  assert.match(component, /剧情回顾/);
  assert.match(component, /播放头和刻度按当前样本的真实时长推进/);
  assert.match(component, /不会自动播放或制造高音量惊吓/);

  assert.match(page, /AudioArchiveGame/);
  assert.doesNotMatch(page, /codex-preview|SkeletonPreview/);
  assert.match(layout, /lang="zh-CN"/);
  assert.match(layout, /title:\s*"第七码"/);
  assert.match(layout, /viewportFit:\s*"cover"/);
  assert.match(layout, /width:\s*"device-width"/);
  assert.match(css, /@media \(max-width:\s*680px\)/);
  assert.match(css, /@media \(max-width: 680px\) and \(orientation: portrait\)/);
  assert.match(css, /@media \(orientation: landscape\) and \(max-height: 600px\)/);
  assert.match(css, /env\(safe-area-inset-bottom\)/);
  assert.match(css, /min-height:\s*100dvh/);
  assert.match(css, /@media \(pointer: coarse\)/);
  assert.match(css, /prefers-reduced-motion/);
  assert.match(css, /\.puzzle-action-dock/);
  assert.match(css, /\.final-note-grid i\.is-response/);
  assert.match(css, /\.ending-anomaly/);
  assert.match(packageJson, /"name": "the-seventh-code"/);

  await assert.rejects(access(new URL("../app/_sites-preview", import.meta.url)));
  await access(new URL("../public/audio/voices/father-note.mp3", import.meta.url));
  await access(new URL("../public/audio/voices/chen-erased-child.mp3", import.meta.url));
  await access(new URL("../public/audio/voices/ending-complete.mp3", import.meta.url));
  await access(new URL("../剧本设定.md", import.meta.url));
  await access(root);
});

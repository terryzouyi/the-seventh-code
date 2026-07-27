import type { Metadata } from "next";
import { AudioArchiveGame } from "./AudioArchiveGame";

export const metadata: Metadata = {
  title: "第七码｜音轨修复悬疑游戏",
  description:
    "进入父亲留下的音轨修复节点，从七段被删改的录音中还原十四年前没有完成的第七个音。",
};

export default function Home() {
  return <AudioArchiveGame />;
}

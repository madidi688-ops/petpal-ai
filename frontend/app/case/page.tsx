'use client';

import Link from 'next/link';

const SECTIONS = [
  {
    title: '机会判断',
    body: '目标用户：把宠物当家人的年轻独居铲屎官。痛点是单向陪伴、日常易碎、情绪难被语言接住。现在做：多模态成本下降 + 情绪消费升级 + 翻译器/通用 Bot 之间有缝隙。',
  },
  {
    title: '用户证据',
    body: '以公开行业洞察（小红书×CBNData 等）与社区常见表述为二手证据；一手访谈放在两周验证计划补齐——答辩时主动说明证据边界。',
  },
  {
    title: 'MVP 样例',
    body: '可运行 Web：登录 → 发猫视频 → 记行为 → 生成日记分享卡。Prompt chat-pet@v2；双模型路由；离线 eval 管人设与安全。',
  },
  {
    title: '商业判断',
    body: '付费买长期记忆与多模态额度，不是多聊几句。初案订阅 ¥12–25/月；获客走内容种草 + 日记卡社交货币；视频理解限次控成本。',
  },
  {
    title: '两周验证',
    body: 'Week1 访谈+可用性；Week2 假门订阅+真模型 eval。北极星假说：7 日内 ≥3 篇日记的用户更易回访。失败则砍 MBTI，保视频聊+日记。',
  },
];

export default function CasePage() {
  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_#eef5f0,_#f7f3eb_55%)] text-ink">
      <div className="mx-auto max-w-3xl px-6 py-12">
        <p className="text-sm text-ink/45">PetPal AI · 求职作品集</p>
        <h1 className="mt-2 font-display text-4xl font-bold tracking-tight">产品案例一页纸</h1>
        <p className="mt-3 text-base text-ink/65">
          情绪陪伴 + 长期记忆的宠物 AI MVP。完整作答与模型降级决策见仓库{' '}
          <code className="rounded bg-white/70 px-1.5 py-0.5 text-sm">docs/PRODUCT-CASE.md</code>。
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/login" className="btn-primary">
            打开 Demo 登录
          </Link>
          <Link href="/dashboard" className="btn-ghost">
            进入首页
          </Link>
        </div>

        <section className="mt-10 space-y-4">
          {SECTIONS.map((s, i) => (
            <article key={s.title} className="card-soft">
              <p className="text-xs font-semibold text-moss">
                0{i + 1} {s.title}
              </p>
              <p className="mt-2 text-sm leading-relaxed text-ink/75">{s.body}</p>
            </article>
          ))}
        </section>

        <section className="card-soft mt-6">
          <p className="text-xs font-semibold text-moss">模型与降级</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-ink/70">
            <li>纯文本 → DeepSeek（成本与中文闲聊）</li>
            <li>图/视/音 → 火山方舟 Responses（能力边界）</li>
            <li>无 Key / 失败 → 演示模式或「稍后再试」，不装懂</li>
            <li>人设与医疗安全 → Prompt + <code className="text-xs">npm run eval</code></li>
          </ul>
        </section>

        <p className="mt-10 text-center text-xs text-ink/40">
          演示账号 demo@petpal.ai / demo1234 · 录屏分镜见 docs/DEMO.md
        </p>
      </div>
    </div>
  );
}

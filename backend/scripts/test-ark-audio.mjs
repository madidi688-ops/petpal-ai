import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, '../.env');
const env = Object.fromEntries(
  readFileSync(envPath, 'utf8')
    .split('\n')
    .filter((l) => l && !l.startsWith('#'))
    .map((l) => {
      const i = l.indexOf('=');
      return [l.slice(0, i), l.slice(i + 1)];
    }),
);

const apiKey = env.ARK_API_KEY;
const baseUrl = (env.ARK_BASE_URL || 'https://ark.cn-beijing.volces.com/api/v3').replace(/\/$/, '');
const model = (env.ARK_MODEL || '').trim();
const audioModel = (env.ARK_AUDIO_MODEL || model).trim();
const sampleAudio =
  'https://ark-project.tos-cn-beijing.volces.com/doc_audio/ark_demo_audio.mp3';
const sampleImg =
  'https://ark-project.tos-cn-beijing.volces.com/doc_image/ark_demo_img_1.png';

async function tryModel(modelId, type, contentPart) {
  const body = {
    model: modelId,
    thinking: { type: 'disabled' },
    input: [
      {
        role: 'user',
        content: [
          contentPart,
          { type: 'input_text', text: '请用一句话描述' },
        ],
      },
    ],
  };
  const res = await fetch(`${baseUrl}/responses`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  const err = data?.error?.message || data?.message;
  console.log(
    `${modelId} | ${type} | ${res.status} | ${err ? String(err).slice(0, 100) : 'ok'}`,
  );
}

console.log('ARK_MODEL=', model, 'ARK_AUDIO_MODEL=', audioModel);
await tryModel(model, 'image', { type: 'input_image', image_url: sampleImg });
await tryModel(audioModel, 'audio', { type: 'input_audio', audio_url: sampleAudio });

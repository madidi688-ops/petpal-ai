'use client';

import Link from 'next/link';
import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { api, streamChat, uploadFile } from '@/lib/api';
import { audioNeedsWavConvert, blobToWavFile } from '@/lib/audio-wav';
import type { ChatMessage, ChatSession, EmotionLog, Pet } from '@/lib/types';
import { ChatBubble } from '@/components/chat-bubble';
import { EmotionTag } from '@/components/emotion-tag';
import { PetAvatar } from '@/components/pet-avatar';

type MediaKind = 'image' | 'audio' | 'video';

function formatSessionTitle(s: ChatSession) {
  if (s.title?.trim()) return s.title.trim();
  return new Date(s.updatedAt).toLocaleString('zh-CN', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function defaultMediaCaption(kind: MediaKind | null) {
  if (kind === 'video') return '看看这个视频里发生了什么';
  if (kind === 'audio') return '听听这段声音';
  return '看看这张照片';
}

function watchingHint(kind: MediaKind | null | undefined, petName?: string) {
  const who = petName || '它';
  if (kind === 'video') return `${who}正在看视频…`;
  if (kind === 'audio') return `${who}正在听…`;
  if (kind === 'image') return `${who}正在看照片…`;
  return `${who}正在想怎么回你…`;
}

function detectKind(file: File): MediaKind | null {
  const mime = (file.type || '').split(';')[0];
  if (mime.startsWith('image/')) return 'image';
  if (mime.startsWith('video/')) return 'video';
  if (mime.startsWith('audio/')) return 'audio';
  const name = file.name.toLowerCase();
  if (/\.(jpe?g|png|webp)$/.test(name)) return 'image';
  if (/\.(mp4|mov|webm)$/.test(name)) return 'video';
  if (/\.(mp3|wav|webm|ogg|m4a)$/.test(name)) return 'audio';
  return null;
}

const LIMITS: Record<MediaKind, number> = {
  image: 5 * 1024 * 1024,
  audio: 15 * 1024 * 1024,
  video: 50 * 1024 * 1024,
};

export default function ChatPage() {
  const params = useParams();
  const petId = params.petId as string;
  const [pet, setPet] = useState<Pet | null>(null);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [sessionId, setSessionId] = useState<string | undefined>();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [content, setContent] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [fileKind, setFileKind] = useState<MediaKind | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [emotion, setEmotion] = useState<EmotionLog | null>(null);
  const [loading, setLoading] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recordSecs, setRecordSecs] = useState(0);
  const [recordLevel, setRecordLevel] = useState(0);
  const [pendingMediaKind, setPendingMediaKind] = useState<MediaKind | null>(null);
  const [error, setError] = useState('');
  const [showSessions, setShowSessions] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recordTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const levelRafRef = useRef<number | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  const refreshSessions = useCallback(async () => {
    const list = await api<ChatSession[]>(`/pets/${petId}/chat/sessions`);
    setSessions(list);
  }, [petId]);

  useEffect(() => {
    api<Pet>(`/pets/${petId}`)
      .then(setPet)
      .catch((err) => setError(err instanceof Error ? err.message : '加载失败'));
    refreshSessions().catch(() => {});
  }, [petId, refreshSessions]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      if (recordTimerRef.current) clearInterval(recordTimerRef.current);
      if (levelRafRef.current) cancelAnimationFrame(levelRafRef.current);
      mediaRecorderRef.current?.stream.getTracks().forEach((t) => t.stop());
      void audioCtxRef.current?.close();
    };
  }, [previewUrl]);

  function stopLevelMeter() {
    if (levelRafRef.current) cancelAnimationFrame(levelRafRef.current);
    levelRafRef.current = null;
    setRecordLevel(0);
    void audioCtxRef.current?.close();
    audioCtxRef.current = null;
  }

  function startLevelMeter(stream: MediaStream) {
    try {
      const ctx = new AudioContext();
      audioCtxRef.current = ctx;
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      const data = new Uint8Array(analyser.frequencyBinCount);
      const tick = () => {
        analyser.getByteFrequencyData(data);
        let sum = 0;
        for (let i = 0; i < data.length; i++) sum += data[i];
        const avg = sum / data.length / 255;
        setRecordLevel(Math.min(1, avg * 2.2));
        levelRafRef.current = requestAnimationFrame(tick);
      };
      tick();
    } catch {
      // 音量条失败不影响录音
    }
  }

  async function openSession(id: string) {
    if (loading) return;
    setError('');
    setEmotion(null);
    try {
      const session = await api<ChatSession & { messages: ChatMessage[] }>(
        `/pets/${petId}/chat/sessions/${id}`,
      );
      setSessionId(session.id);
      setMessages(session.messages ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载会话失败');
    }
  }

  async function deleteSession(id: string) {
    if (loading) return;
    if (!confirm('删除这个会话？消息会一并删除。')) return;
    setError('');
    try {
      await api(`/pets/${petId}/chat/sessions/${id}`, { method: 'DELETE' });
      if (sessionId === id) {
        setSessionId(undefined);
        setMessages([]);
        setEmotion(null);
      }
      await refreshSessions();
    } catch (err) {
      setError(err instanceof Error ? err.message : '删除会话失败');
    }
  }

  function startNewChat() {
    if (loading) return;
    setSessionId(undefined);
    setMessages([]);
    setEmotion(null);
    setError('');
  }

  function onPickFile(f: File | null) {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(f);
    if (!f) {
      setFileKind(null);
      setPreviewUrl(null);
      return;
    }
    const kind = detectKind(f);
    if (!kind) {
      setError('不支持的文件类型');
      setFile(null);
      setFileKind(null);
      setPreviewUrl(null);
      return;
    }
    if (f.size > LIMITS[kind]) {
      setError(
        `${kind === 'video' ? '视频' : kind === 'audio' ? '音频' : '图片'}过大（上限 ${Math.round(LIMITS[kind] / 1024 / 1024)}MB）`,
      );
      setFile(null);
      setFileKind(null);
      setPreviewUrl(null);
      return;
    }
    setError('');
    setFileKind(kind);
    setPreviewUrl(URL.createObjectURL(f));
  }

  async function toggleRecord() {
    if (recording) {
      mediaRecorderRef.current?.stop();
      return;
    }
    try {
      if (!window.isSecureContext) {
        setError(
          '当前不是安全环境（手机用 HTTP 局域网时常见）。浏览器会禁止麦克风，请改用上传 mp3/wav，或用电脑本机 localhost 录音',
        );
        return;
      }
      if (!navigator.mediaDevices?.getUserMedia) {
        setError('当前浏览器不支持录音，请换 Chrome / Edge，或改用上传 mp3/wav');
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
        },
      });
      // 不用 SpeechRecognition：会与 MediaRecorder 抢麦克风导致静音
      const mime = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : MediaRecorder.isTypeSupported('audio/mp4')
            ? 'audio/mp4'
            : '';
      const recorder = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onerror = () => {
        setError('录音过程出错，请重试或上传 mp3/wav');
        stopLevelMeter();
        stream.getTracks().forEach((t) => t.stop());
        setRecording(false);
      };
      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        stopLevelMeter();
        if (recordTimerRef.current) clearInterval(recordTimerRef.current);
        setRecording(false);
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        if (blob.size < 800) {
          setError('几乎没录到声音，请靠近麦克风再说几句后重试');
          return;
        }
        void (async () => {
          try {
            const wav = await blobToWavFile(blob, `voice-${Date.now()}.wav`);
            onPickFile(wav);
          } catch {
            setError('录音转码失败，请改用上传 mp3/wav 文件');
          }
        })();
      };
      mediaRecorderRef.current = recorder;
      recorder.start(250);
      startLevelMeter(stream);
      setRecording(true);
      setRecordSecs(0);
      setError('');
      recordTimerRef.current = setInterval(() => {
        setRecordSecs((s) => {
          if (s >= 59) {
            recorder.stop();
            return s;
          }
          return s + 1;
        });
      }, 1000);
    } catch (err) {
      const name = err instanceof DOMException ? err.name : '';
      if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
        setError('麦克风权限被拒绝，请在浏览器地址栏允许麦克风后重试');
      } else if (name === 'NotFoundError') {
        setError('未检测到麦克风设备，请检查系统输入设备');
      } else {
        setError('无法使用麦克风，请检查权限或改用上传 mp3/wav');
      }
    }
  }

  async function send(e: FormEvent) {
    e.preventDefault();
    if (loading) return;
    if (recording) {
      mediaRecorderRef.current?.stop();
      setError('请先停止录音，再发送');
      return;
    }
    const text = content.trim();
    if (!text && !file) return;

    const kind = fileKind;
    setContent('');
    setLoading(true);
    setError('');
    setPendingMediaKind(kind);

    let imageUrl: string | undefined;
    let videoUrl: string | undefined;
    let audioUrl: string | undefined;
    try {
      if (file) {
        let toUpload = file;
        if (fileKind === 'audio' && audioNeedsWavConvert(file)) {
          toUpload = await blobToWavFile(file, `voice-${Date.now()}.wav`);
        }
        const uploaded = await uploadFile(toUpload);
        const url = uploaded.url;
        const mediaKind = uploaded.kind ?? kind;
        if (mediaKind === 'video') videoUrl = url;
        else if (mediaKind === 'audio') audioUrl = url;
        else imageUrl = url;
        onPickFile(null);
        if (imageRef.current) imageRef.current.value = '';
        if (videoRef.current) videoRef.current.value = '';
        if (audioRef.current) audioRef.current.value = '';
      }

      const tmpUserId = `tmp-user-${Date.now()}`;
      const tmpAsstId = `tmp-asst-${Date.now()}`;
      const caption = text || defaultMediaCaption(kind);

      setMessages((prev) => [
        ...prev,
        {
          id: tmpUserId,
          role: 'user',
          content: caption,
          imageUrl: imageUrl ?? null,
          videoUrl: videoUrl ?? null,
          audioUrl: audioUrl ?? null,
          createdAt: new Date().toISOString(),
        },
        {
          id: tmpAsstId,
          role: 'assistant',
          content: '',
          createdAt: new Date().toISOString(),
        },
      ]);

      await streamChat(
        petId,
        { content: text || undefined, sessionId, imageUrl, videoUrl, audioUrl },
        {
          onMeta: ({ sessionId: sid }) => setSessionId(sid),
          onDelta: ({ content: delta }) => {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === tmpAsstId ? { ...m, content: m.content + delta } : m,
              ),
            );
          },
          onDone: ({ sessionId: sid, message, emotion: emo }) => {
            setSessionId(sid);
            setEmotion(emo);
            setMessages((prev) =>
              prev.map((m) => (m.id === tmpAsstId ? { ...message } : m)),
            );
            refreshSessions().catch(() => {});
          },
          onError: (msg) => {
            setError(msg);
            setMessages((prev) => prev.filter((m) => m.id !== tmpAsstId));
          },
        },
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : '发送失败');
      setMessages((prev) => prev.filter((m) => !m.id.startsWith('tmp-asst-')));
    } finally {
      setLoading(false);
      setPendingMediaKind(null);
    }
  }

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-4 pb-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <PetAvatar pet={pet} size="md" breathing={loading} />
          <div>
            <Link href="/dashboard" className="text-sm text-ink/50 hover:text-ink">
              ← 返回
            </Link>
            <h1 className="font-display text-xl font-bold sm:text-2xl">
              和 {pet?.name ?? '…'} 聊聊
            </h1>
            {loading && (
              <p className="animate-soft-pulse text-xs text-moss">
                {watchingHint(pendingMediaKind, pet?.name)}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {emotion && <EmotionTag emotion={emotion.emotion} score={emotion.score} />}
          <button
            type="button"
            className="btn-ghost px-2 py-1 text-xs md:hidden"
            onClick={() => setShowSessions((v) => !v)}
          >
            {showSessions ? '收起' : '会话'}
          </button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-[200px_1fr]">
        <aside
          className={`max-h-[40vh] flex-col gap-2 md:flex md:max-h-[70vh] ${
            showSessions ? 'flex' : 'hidden'
          }`}
        >
          <button type="button" className="btn-ghost w-full text-sm" onClick={startNewChat}>
            + 新对话
          </button>
          <div className="flex-1 space-y-1 overflow-y-auto">
            {sessions.length === 0 && (
              <p className="px-1 text-xs text-ink/40">还没有历史会话</p>
            )}
            {sessions.map((s) => {
              const active = s.id === sessionId;
              return (
                <div
                  key={s.id}
                  className={`group flex items-start gap-1 rounded-xl transition ${
                    active ? 'bg-moss/15' : 'hover:bg-white/70'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => {
                      void openSession(s.id);
                      setShowSessions(false);
                    }}
                    className={`min-w-0 flex-1 px-3 py-2 text-left text-sm ${
                      active ? 'font-medium text-moss' : 'text-ink/70'
                    }`}
                  >
                    <span className="line-clamp-2">{formatSessionTitle(s)}</span>
                  </button>
                  <button
                    type="button"
                    title="删除会话"
                    className="mr-1 mt-1 shrink-0 rounded-lg px-1.5 py-0.5 text-xs text-ink/30 opacity-0 hover:bg-clay/10 hover:text-clay group-hover:opacity-100"
                    onClick={(e) => {
                      e.stopPropagation();
                      void deleteSession(s.id);
                    }}
                  >
                    ×
                  </button>
                </div>
              );
            })}
          </div>
        </aside>

        <div className="flex min-h-0 flex-col gap-3">
          <div className="card-soft flex h-[min(55vh,520px)] flex-col gap-3 overflow-y-auto sm:h-[55vh]">
            {messages.length === 0 && (
              <div className="m-auto max-w-xs space-y-2 text-center text-sm text-ink/45">
                <p className="font-display text-lg text-ink/70">跟 {pet?.name ?? '它'} 打个招呼</p>
                <p>可发图片、短视频，或按「录」说话。</p>
              </div>
            )}
            {messages.map((m) => (
              <div key={m.id} className="animate-rise">
                <ChatBubble
                  role={m.role}
                  content={m.content || ''}
                  imageUrl={m.imageUrl}
                  videoUrl={m.videoUrl}
                  audioUrl={m.audioUrl}
                  pet={pet}
                  streaming={loading && m.id.startsWith('tmp-asst-')}
                />
              </div>
            ))}
            {loading && pendingMediaKind && (
              <p className="animate-soft-pulse pl-10 text-xs text-moss">
                {watchingHint(pendingMediaKind, pet?.name)}
              </p>
            )}
            <div ref={bottomRef} />
          </div>

          {error && <p className="text-sm text-clay">{error}</p>}

          {previewUrl && fileKind && (
            <div className="flex items-center gap-3">
              {fileKind === 'image' && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={previewUrl}
                  alt="预览"
                  className="h-16 w-16 rounded-xl object-cover ring-1 ring-ink/10"
                />
              )}
              {fileKind === 'video' && (
                <video
                  src={previewUrl}
                  controls
                  className="h-20 w-36 rounded-xl object-cover ring-1 ring-ink/10"
                />
              )}
              {fileKind === 'audio' && (
                <audio src={previewUrl} controls className="max-w-xs" />
              )}
              <button
                type="button"
                className="text-sm text-ink/50 hover:text-ink"
                onClick={() => onPickFile(null)}
              >
                移除附件
              </button>
            </div>
          )}

          {recording && (
            <div className="flex items-center gap-3 text-sm text-moss">
              <span className="shrink-0">录音中 {recordSecs}s</span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-moss/15">
                <div
                  className="h-full rounded-full bg-moss transition-[width] duration-75"
                  style={{ width: `${Math.max(6, Math.round(recordLevel * 100))}%` }}
                />
              </div>
              <span className="shrink-0 text-xs text-ink/45">最长 60s · 再点「停」</span>
            </div>
          )}

          <form onSubmit={send} className="flex flex-wrap gap-2">
            <input
              ref={imageRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => onPickFile(e.target.files?.[0] ?? null)}
            />
            <input
              ref={videoRef}
              type="file"
              accept="video/mp4,video/quicktime,video/webm"
              className="hidden"
              onChange={(e) => onPickFile(e.target.files?.[0] ?? null)}
            />
            <input
              ref={audioRef}
              type="file"
              accept="audio/mpeg,audio/wav,audio/mp3,audio/aac,audio/flac,audio/mp4,audio/x-m4a,.mp3,.wav,.m4a,.aac,.flac"
              className="hidden"
              onChange={(e) => onPickFile(e.target.files?.[0] ?? null)}
            />
            <button
              type="button"
              className="btn-ghost shrink-0 px-3"
              disabled={loading || recording}
              onClick={() => imageRef.current?.click()}
              title="上传图片"
            >
              图
            </button>
            <button
              type="button"
              className="btn-ghost shrink-0 px-3"
              disabled={loading || recording}
              onClick={() => videoRef.current?.click()}
              title="上传短视频（建议 &lt;30s mp4）"
            >
              视
            </button>
            <button
              type="button"
              className={`btn-ghost shrink-0 px-3 ${recording ? 'border-clay text-clay' : ''}`}
              disabled={loading}
              onClick={() => void toggleRecord()}
              title="录音"
            >
              {recording ? '停' : '录'}
            </button>
            <input
              className="input min-w-[12rem] flex-1"
              placeholder={`对 ${pet?.name ?? '它'} 说点什么…`}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              disabled={loading}
            />
            <button
              className="btn-primary"
              type="submit"
              disabled={loading || recording || (!content.trim() && !file)}
            >
              {loading
                ? fileKind === 'video' || fileKind === 'audio' || file
                  ? '处理中…'
                  : '…'
                : '发送'}
            </button>
          </form>
          <p className="text-xs text-ink/40">
            图 ≤5MB · 视频建议短 mp4 ≤50MB · 录音约 60 秒（自动转 wav） · 音频请用 mp3/wav
          </p>
        </div>
      </div>
    </div>
  );
}

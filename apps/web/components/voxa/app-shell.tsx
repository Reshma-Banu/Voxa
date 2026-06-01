"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  BookAudio,
  Clock3,
  FileAudio,
  FileText,
  Home,
  Library,
  Mic2,
  Moon,
  Pause,
  Play,
  Search,
  Settings,
  SkipBack,
  SkipForward,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  Upload,
  Volume2
} from "lucide-react";
import { DragEvent, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { API_URL, api } from "@/lib/api";
import { cn, formatDate, formatTime } from "@/lib/utils";

type View = "home" | "library" | "upload" | "text" | "history" | "settings";

type Voice = {
  id: string;
  name: string;
  language: string;
  gender: string;
};

type LibraryItem = {
  id: number;
  title: string;
  source: "PDF" | "Text";
  voice: string;
  duration: number;
  createdAt: string;
  audioPath?: string;
};

const navItems: Array<{ id: View; label: string; icon: typeof Home }> = [
  { id: "home", label: "Home", icon: Home },
  { id: "library", label: "Library", icon: Library },
  { id: "upload", label: "Upload", icon: Upload },
  { id: "history", label: "History", icon: Clock3 },
  { id: "settings", label: "Settings", icon: Settings }
];

const fallbackVoices: Voice[] = [
  { id: "en-US-EmmaNeural", name: "Emma (US)", language: "English", gender: "Female" },
  { id: "en-US-JennyNeural", name: "Jenny (US)", language: "English", gender: "Female" },
  { id: "en-US-RyanMultilingualNeural", name: "Ryan (US)", language: "English", gender: "Male" },
  { id: "en-GB-SoniaNeural", name: "Sonia (UK)", language: "English", gender: "Female" },
  { id: "fr-FR-DeniseNeural", name: "Denise (FR)", language: "French", gender: "Female" }
];

const emptyCurrent: LibraryItem = {
  id: 0,
  title: "No audio selected",
  source: "Text",
  voice: "Generate audio to enable playback",
  duration: 0,
  createdAt: new Date().toISOString()
};

const stages = ["Extracting text", "Preparing audio", "Generating speech", "Finalizing"];

export function VoxaAppShell() {
  const [view, setView] = useState<View>("home");
  const [availableVoices, setAvailableVoices] = useState<Voice[]>(fallbackVoices);
  const [selectedVoice, setSelectedVoice] = useState(fallbackVoices[0]);
  const [speed, setSpeed] = useState("1.0x");
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [current, setCurrent] = useState(emptyCurrent);
  const [playing, setPlaying] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [generationError, setGenerationError] = useState("");
  const [stage, setStage] = useState(0);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadedText, setUploadedText] = useState("");
  const [text, setText] = useState(
    "Paste an article, chapter, research note, email, memo, or saved thought here. VOXA will turn it into natural audio with a voice that feels easy to stay with."
  );

  const stats = useMemo(
    () => [
      { label: "Documents Processed", value: "1,284", icon: FileText },
      { label: "Audio Generated", value: "426h", icon: FileAudio },
      { label: "Listening Hours", value: "18.7k", icon: BookAudio }
    ],
    []
  );

  useEffect(() => {
    api.getVoices().then(setAvailableVoices).catch(() => setAvailableVoices(fallbackVoices));
    api
      .getHistory()
      .then((history) => {
        if (!history.length) return;
        const next: LibraryItem[] = history.map((item) => ({
          id: item.id,
          title: item.title,
          source: item.source_type === "pdf" ? "PDF" : "Text",
          voice: item.voice,
          duration: item.duration,
          createdAt: item.created_at,
          audioPath: item.audio_path
        }));
        setItems(next);
        setCurrent(next[0]);
      })
      .catch(() => undefined);
  }, []);

  function runGeneration(title = uploadedFile?.name.replace(/\.pdf$/i, "") || "Untitled audio") {
    if (processing) return;

    setGenerationError("");
    setProcessing(true);
    setStage(0);
    const interval = window.setInterval(() => {
      setStage((value) => {
        if (value >= stages.length - 1) {
          window.clearInterval(interval);
          window.setTimeout(() => {
            const sourceText = uploadedFile ? uploadedText || text : text;
            api
              .generateAudio({
                title,
                text: sourceText,
                voice: selectedVoice.id,
                source_type: uploadedFile ? "pdf" : "text"
              })
              .then((audioItem) => {
                const next: LibraryItem = {
                  id: audioItem.id,
                  title: audioItem.title,
                  source: audioItem.source_type === "pdf" ? "PDF" : "Text",
                  voice: audioItem.voice,
                  duration: audioItem.duration,
                  createdAt: audioItem.created_at,
                  audioPath: audioItem.audio_path
                };
                setItems((existing) => [next, ...existing]);
                setCurrent(next);
                setPlaying(true);
                setView("library");
              })
              .catch(() =>
                setGenerationError(
                  "Audio generation failed. The backend could not produce a playable audio file."
                )
              )
              .finally(() => setProcessing(false));
          }, 650);
          return value;
        }
        return value + 1;
      });
    }, 700);
  }

  return (
    <div className="min-h-screen overflow-hidden bg-voxa-radial text-zinc-50">
      <div className="noise" />
      <div className="relative flex min-h-screen">
        <aside className="fixed inset-y-0 left-0 z-20 hidden w-72 border-r border-white/[0.08] bg-background/70 p-5 backdrop-blur-2xl lg:flex lg:flex-col">
          <button onClick={() => setView("home")} className="mb-8 text-left">
            <div>
              <div className="font-display text-xl font-semibold tracking-tight">VOXA</div>
              <div className="text-xs text-mutedText">AI reading companion</div>
            </div>
          </button>
          <nav className="space-y-1">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setView(item.id)}
                className={cn(
                  "group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-zinc-400 transition",
                  view === item.id && "bg-white/[0.07] text-white shadow-panel",
                  view !== item.id && "hover:bg-white/[0.04] hover:text-white"
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </button>
            ))}
          </nav>
          <div className="mt-auto space-y-3">
            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.04] p-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary to-success" />
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">Resh</div>
                  <div className="truncate text-xs text-mutedText">Founder plan</div>
                </div>
              </div>
            </div>
            <button className="flex w-full items-center justify-between rounded-xl border border-white/[0.08] bg-white/[0.035] px-3 py-2.5 text-sm text-zinc-300">
              <span className="flex items-center gap-2">
                <Moon className="h-4 w-4" />
                Dark mode
              </span>
              <span className="h-5 w-9 rounded-full bg-primary p-0.5">
                <span className="block h-4 w-4 translate-x-4 rounded-full bg-white" />
              </span>
            </button>
          </div>
        </aside>

        <main className="flex min-h-screen w-full flex-col pb-32 lg:pl-72">
          <MobileTopbar view={view} setView={setView} />
          <AnimatePresence mode="wait">
            <motion.section
              key={view}
              initial={{ opacity: 0, y: 16, filter: "blur(10px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: -10, filter: "blur(8px)" }}
              transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
              className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-10 lg:py-10"
            >
              {view === "home" && (
                <HomeView stats={stats} setView={setView} processing={processing} stage={stage} />
              )}
              {view === "upload" && (
                <UploadView
                  file={uploadedFile}
                  setFile={setUploadedFile}
                  setUploadedText={setUploadedText}
                  processing={processing}
                  generationError={generationError}
                  stage={stage}
                  runGeneration={runGeneration}
                />
              )}
              {view === "text" && (
                <TextView
                  text={text}
                  setText={setText}
                  speed={speed}
                  setSpeed={setSpeed}
                  selectedVoice={selectedVoice}
                  setSelectedVoice={setSelectedVoice}
                  availableVoices={availableVoices}
                  processing={processing}
                  generationError={generationError}
                  stage={stage}
                  runGeneration={() => runGeneration("Pasted listening note")}
                />
              )}
              {view === "library" && <LibraryView items={items} setCurrent={setCurrent} setPlaying={setPlaying} />}
              {view === "history" && (
                <HistoryView
                  items={items}
                  setCurrent={setCurrent}
                  setPlaying={setPlaying}
                  deleteItem={(id) => setItems((existing) => existing.filter((item) => item.id !== id))}
                />
              )}
              {view === "settings" && (
                <SettingsView
                  selectedVoice={selectedVoice}
                  setSelectedVoice={setSelectedVoice}
                  availableVoices={availableVoices}
                  speed={speed}
                  setSpeed={setSpeed}
                />
              )}
            </motion.section>
          </AnimatePresence>
        </main>

        <AudioPlayer item={current} playing={playing} setPlaying={setPlaying} speed={speed} setSpeed={setSpeed} />
      </div>
    </div>
  );
}

function MobileTopbar({ view, setView }: { view: View; setView: (view: View) => void }) {
  return (
    <div className="sticky top-0 z-30 border-b border-white/[0.08] bg-background/75 px-4 py-3 backdrop-blur-xl lg:hidden">
      <div className="flex items-center justify-between">
        <button onClick={() => setView("home")} className="font-display font-semibold">
          <span className="font-display font-semibold">VOXA</span>
        </button>
        <div className="flex gap-1">
          {navItems.slice(0, 4).map((item) => (
            <button
              key={item.id}
              onClick={() => setView(item.id)}
              className={cn("rounded-lg p-2 text-zinc-400", view === item.id && "bg-white/[0.08] text-white")}
              aria-label={item.label}
            >
              <item.icon className="h-4 w-4" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function HomeView({
  stats,
  setView,
  processing,
  stage
}: {
  stats: Array<{ label: string; value: string; icon: typeof FileText }>;
  setView: (view: View) => void;
  processing: boolean;
  stage: number;
}) {
  return (
    <div className="space-y-8">
      <div className="grid min-h-[560px] items-center gap-8 lg:grid-cols-[1.1fr_.9fr]">
        <div className="space-y-8">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.05] px-3 py-1.5 text-sm text-zinc-300"
          >
            <Sparkles className="h-4 w-4 text-success" />
            Turn anything you read into something you can listen to.
          </motion.div>
          <div className="space-y-5">
            <h1 className="max-w-4xl text-balance font-display text-5xl font-semibold tracking-tight text-white sm:text-7xl lg:text-8xl">
              Your documents. Your books. Your thoughts. Now in audio.
            </h1>
            <p className="max-w-2xl text-lg leading-8 text-mutedText">
              Transform PDFs, articles, notes, and documents into natural audio in seconds.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button onClick={() => setView("upload")}>
              <Upload className="h-4 w-4" />
              Upload PDF
            </Button>
            <Button variant="secondary" onClick={() => setView("text")}>
              <FileText className="h-4 w-4" />
              Paste Text
            </Button>
          </div>
        </div>
        <Card className="relative overflow-hidden p-5">
          <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-primary/25 to-transparent" />
          <div className="relative space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-mutedText">Now generating</div>
                <div className="text-xl font-semibold">Market research brief</div>
              </div>
              <div className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-1 text-xs text-success">
                Studio
              </div>
            </div>
            <ProcessingTimeline active={processing ? stage : 2} />
            <div className="rounded-2xl border border-white/[0.08] bg-black/20 p-4">
              <div className="mb-4 flex items-center gap-3">
                <Cover title="VOXA" />
                <div>
                  <div className="font-medium">Your listening queue</div>
                  <div className="text-sm text-mutedText">Voice: Emma (US)</div>
                </div>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-white/[0.08]">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-primary via-accent to-success"
                  animate={{ width: ["28%", "71%", "43%"] }}
                  transition={{ repeat: Infinity, duration: 5, ease: "easeInOut" }}
                />
              </div>
            </div>
          </div>
        </Card>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {stats.map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.08 }}
          >
            <Card className="p-5 transition duration-300 hover:-translate-y-1 hover:border-accent/35">
              <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl bg-white/[0.06]">
                <stat.icon className="h-5 w-5 text-accent" />
              </div>
              <div className="text-3xl font-semibold tracking-tight">{stat.value}</div>
              <div className="mt-1 text-sm text-mutedText">{stat.label}</div>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function UploadView({
  file,
  setFile,
  setUploadedText,
  processing,
  generationError,
  stage,
  runGeneration
}: {
  file: File | null;
  setFile: (file: File | null) => void;
  setUploadedText: (text: string) => void;
  processing: boolean;
  generationError: string;
  stage: number;
  runGeneration: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [extracted, setExtracted] = useState<{ page_count: number; preview: string } | null>(null);

  async function handleFile(nextFile: File | null) {
    setFile(nextFile);
    setExtracted(null);
    setUploadedText("");
    if (!nextFile) return;
    setUploading(true);
    try {
      const result = await api.extractPdf(nextFile);
      setExtracted({ page_count: result.page_count, preview: result.preview });
      setUploadedText(result.text);
    } catch {
      setExtracted({
        page_count: 18,
        preview: "VOXA could not reach the local API yet, so this preview is running in product-demo mode."
      });
    } finally {
      setUploading(false);
    }
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    const droppedFile = event.dataTransfer.files?.[0] ?? null;
    if (droppedFile) void handleFile(droppedFile);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[.9fr_1.1fr]">
      <div>
        <SectionHeader eyebrow="Upload" title="Bring in any PDF." description="Drop a paper, book chapter, contract, deck notes, or saved article and VOXA prepares it for listening." />
        <div
          className="mt-6 flex min-h-[360px] flex-col items-center justify-center rounded-3xl border border-dashed border-white/15 bg-white/[0.035] p-8 text-center transition duration-300 hover:border-accent/50 hover:bg-white/[0.055]"
          onDragOver={(event) => event.preventDefault()}
          onDrop={handleDrop}
        >
          <input
            ref={inputRef}
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={(event) => void handleFile(event.target.files?.[0] ?? null)}
          />
          <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/20 text-accent">
            <Upload className="h-7 w-7" />
          </div>
          <div className="text-xl font-semibold">Drag PDF here</div>
          <div className="mt-2 max-w-sm text-sm leading-6 text-mutedText">
            Browse files or drop a PDF up to 50MB. VOXA validates the file before extraction.
          </div>
          <Button className="mt-6" variant="secondary" type="button" onClick={() => inputRef.current?.click()}>
            Browse files
          </Button>
        </div>
      </div>
      <div className="space-y-5">
        <Card className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <div className="text-sm text-mutedText">Upload status</div>
              <div className="font-medium">{uploading ? "Extracting text" : file ? "Ready to generate" : "Waiting for document"}</div>
            </div>
            <div className={cn("rounded-full px-3 py-1 text-xs", file ? "bg-success/15 text-success" : "bg-white/[0.06] text-zinc-400")}>
              {file ? "Valid PDF" : "Empty"}
            </div>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-white/[0.08]">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-primary to-success"
              animate={{ width: uploading ? "64%" : file ? "100%" : "18%" }}
            />
          </div>
        </Card>
        {file ? (
          <Card className="p-5">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/[0.06]">
                <FileText className="h-5 w-5 text-accent" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-lg font-semibold">{file.name}</div>
                <div className="text-sm text-mutedText">{extracted ? `${extracted.page_count} pages` : "Validating pages"}</div>
                <p className="mt-4 rounded-2xl border border-white/[0.08] bg-black/20 p-4 text-sm leading-6 text-zinc-300">
                  Preview: {extracted?.preview ?? "VOXA is extracting readable content, cleaning structural noise, and preparing narration chunks with careful pacing."}
                </p>
                {processing ? <ProcessingTimeline active={stage} /> : null}
                {generationError ? (
                  <div className="mt-4 rounded-xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-100">
                    {generationError}
                  </div>
                ) : null}
                <Button className="mt-5 w-full sm:w-auto" onClick={() => runGeneration()} disabled={processing}>
                  <Sparkles className="h-4 w-4" />
                  {processing ? "Generating" : "Generate Audio"}
                </Button>
              </div>
            </div>
          </Card>
        ) : (
          <EmptyState icon={FileText} title="No PDF selected" description="Your extracted document card appears here after upload." />
        )}
      </div>
    </div>
  );
}

function TextView(props: {
  text: string;
  setText: (value: string) => void;
  selectedVoice: Voice;
  setSelectedVoice: (voice: Voice) => void;
  availableVoices: Voice[];
  speed: string;
  setSpeed: (speed: string) => void;
  processing: boolean;
  generationError: string;
  stage: number;
  runGeneration: () => void;
}) {
  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
      <div>
        <SectionHeader eyebrow="Text" title="Write or paste anything." description="A calm editor for notes, articles, scripts, and ideas you want to hear back." />
        <Card className="mt-6 overflow-hidden">
          <textarea
            value={props.text}
            onChange={(event) => props.setText(event.target.value)}
            className="min-h-[520px] w-full resize-none bg-transparent p-6 text-lg leading-9 text-zinc-100 outline-none placeholder:text-zinc-600"
            placeholder="Paste text here..."
          />
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.08] px-5 py-4 text-sm text-mutedText">
            <span>{props.text.length.toLocaleString()} characters</span>
            <Button onClick={props.runGeneration} disabled={props.processing}>
              <Sparkles className="h-4 w-4" />
              {props.processing ? "Generating" : "Generate Audio"}
            </Button>
          </div>
        </Card>
      </div>
      <div className="space-y-5 xl:pt-28">
        <VoiceSelector
          selected={props.selectedVoice}
          setSelected={props.setSelectedVoice}
          availableVoices={props.availableVoices}
        />
        <ControlPanel speed={props.speed} setSpeed={props.setSpeed} />
        {props.processing ? (
          <Card className="p-5">
            <ProcessingTimeline active={props.stage} />
          </Card>
        ) : null}
        {props.generationError ? (
          <Card className="border-red-400/20 bg-red-500/10 p-5 text-sm text-red-100">
            {props.generationError}
          </Card>
        ) : null}
      </div>
    </div>
  );
}

function VoiceSelector({
  selected,
  setSelected,
  availableVoices
}: {
  selected: Voice;
  setSelected: (voice: Voice) => void;
  availableVoices: Voice[];
}) {
  const [query, setQuery] = useState("");
  const filtered = availableVoices.filter((voice) => voice.name.toLowerCase().includes(query.toLowerCase()));
  return (
    <Card className="p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <div className="text-sm text-mutedText">Voice</div>
          <div className="font-semibold">{selected.name}</div>
        </div>
        <Mic2 className="h-5 w-5 text-accent" />
      </div>
      <div className="mb-3 flex items-center gap-2 rounded-xl border border-white/[0.08] bg-black/20 px-3 py-2">
        <Search className="h-4 w-4 text-zinc-500" />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className="w-full bg-transparent text-sm outline-none placeholder:text-zinc-600"
          placeholder="Search voices"
        />
      </div>
      <div className="space-y-2">
        {filtered.map((voice) => (
          <button
            key={voice.id}
            onClick={() => setSelected(voice)}
            className={cn(
              "flex w-full items-center justify-between rounded-xl border px-3 py-3 text-left transition",
              selected.id === voice.id ? "border-accent/40 bg-accent/10" : "border-white/[0.06] bg-white/[0.025] hover:bg-white/[0.055]"
            )}
          >
            <span>
              <span className="block text-sm font-medium">{voice.name}</span>
              <span className="text-xs text-mutedText">{voice.language}</span>
            </span>
            <span className="rounded-full bg-white/[0.06] px-2 py-1 text-xs text-zinc-300">{voice.gender}</span>
          </button>
        ))}
      </div>
    </Card>
  );
}

function ControlPanel({ speed, setSpeed }: { speed: string; setSpeed: (speed: string) => void }) {
  return (
    <Card className="p-5">
      <div className="mb-4 flex items-center gap-2 font-semibold">
        <SlidersHorizontal className="h-4 w-4 text-accent" />
        Playback
      </div>
      <div className="grid grid-cols-4 gap-2">
        {["0.8x", "1.0x", "1.2x", "1.5x"].map((option) => (
          <button
            key={option}
            onClick={() => setSpeed(option)}
            className={cn(
              "rounded-xl border px-3 py-2 text-sm transition",
              speed === option ? "border-accent/40 bg-accent/15 text-white" : "border-white/[0.08] bg-white/[0.03] text-zinc-400"
            )}
          >
            {option}
          </button>
        ))}
      </div>
    </Card>
  );
}

function LibraryView({
  items,
  setCurrent,
  setPlaying
}: {
  items: LibraryItem[];
  setCurrent: (item: LibraryItem) => void;
  setPlaying: (playing: boolean) => void;
}) {
  return (
    <div>
      <SectionHeader eyebrow="Library" title="Your personal audio shelf." description="Everything you have converted, ready to resume anywhere." />
      {!items.length ? (
        <div className="mt-8">
          <EmptyState icon={BookAudio} title="No generated audio yet" description="Upload a PDF or paste text, then generate audio to add a playable item here." />
        </div>
      ) : null}
      <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {items.map((item) => (
          <motion.button
            key={item.id}
            whileHover={{ y: -6 }}
            onClick={() => {
              setCurrent(item);
              setPlaying(true);
            }}
            className="text-left"
          >
            <Card className="h-full overflow-hidden p-4 transition duration-300 hover:border-accent/35">
              <Cover title={item.title} large />
              <div className="mt-4 flex items-start justify-between gap-4">
                <div>
                  <div className="line-clamp-2 text-lg font-semibold">{item.title}</div>
                  <div className="mt-2 text-sm text-mutedText">{item.source} / {formatDate(item.createdAt)}</div>
                  <div className="mt-1 text-sm text-zinc-400">{formatTime(item.duration)} / {item.voice}</div>
                </div>
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-black">
                  <Play className="h-4 w-4 fill-current" />
                </span>
              </div>
            </Card>
          </motion.button>
        ))}
      </div>
    </div>
  );
}

function HistoryView(props: {
  items: LibraryItem[];
  setCurrent: (item: LibraryItem) => void;
  setPlaying: (playing: boolean) => void;
  deleteItem: (id: number) => void;
}) {
  return (
    <div>
      <SectionHeader eyebrow="History" title="Generation timeline." description="A clean record of every document, voice, and output." />
      <div className="mt-8 space-y-3">
        {props.items.map((item) => (
          <Card key={item.id} className="p-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <Cover title={item.title} />
                <div>
                  <div className="font-semibold">{item.title}</div>
                  <div className="mt-1 text-sm text-mutedText">
                    {formatDate(item.createdAt)} / {item.voice} / {formatTime(item.duration)}
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    props.setCurrent(item);
                    props.setPlaying(true);
                  }}
                >
                  <Play className="h-4 w-4" />
                  Play
                </Button>
                <Button size="sm" variant="ghost">Download</Button>
                <Button size="sm" variant="danger" onClick={() => props.deleteItem(item.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

function SettingsView(props: {
  selectedVoice: Voice;
  setSelectedVoice: (voice: Voice) => void;
  availableVoices: Voice[];
  speed: string;
  setSpeed: (speed: string) => void;
}) {
  return (
    <div>
      <SectionHeader eyebrow="Settings" title="Tune the listening system." description="Defaults for voice, playback, theme, and storage." />
      <div className="mt-8 grid gap-5 lg:grid-cols-3">
        <VoiceSelector
          selected={props.selectedVoice}
          setSelected={props.setSelectedVoice}
          availableVoices={props.availableVoices}
        />
        <ControlPanel speed={props.speed} setSpeed={props.setSpeed} />
        <Card className="p-5">
          <div className="mb-5 font-semibold">Storage</div>
          <div className="mb-3 flex justify-between text-sm">
            <span className="text-mutedText">Used</span>
            <span>3.8 GB of 20 GB</span>
          </div>
          <div className="h-2 rounded-full bg-white/[0.08]">
            <div className="h-full w-[19%] rounded-full bg-gradient-to-r from-primary to-success" />
          </div>
          <div className="mt-6 rounded-2xl border border-white/[0.08] bg-white/[0.035] p-4">
            <div className="text-sm font-medium">Theme</div>
            <div className="mt-1 text-sm text-mutedText">Dark-first workspace with subtle glass surfaces.</div>
          </div>
        </Card>
      </div>
    </div>
  );
}

function AudioPlayer({
  item,
  playing,
  setPlaying,
  speed,
  setSpeed
}: {
  item: LibraryItem;
  playing: boolean;
  setPlaying: (playing: boolean) => void;
  speed: string;
  setSpeed: (speed: string) => void;
}) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(item.duration);
  const audioSrc = item.audioPath
    ? item.audioPath.startsWith("http")
      ? item.audioPath
      : `${API_URL}${item.audioPath}`
    : "";
  const hasAudio = Boolean(audioSrc);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.playbackRate = Number.parseFloat(speed.replace("x", "")) || 1;
  }, [speed]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !hasAudio) {
      setPlaying(false);
      return;
    }
    if (playing) {
      void audio.play().catch(() => setPlaying(false));
    } else {
      audio.pause();
    }
  }, [hasAudio, playing, setPlaying, item.id]);

  function seekTo(value: number) {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = value;
    setCurrentTime(value);
  }

  function skipBy(seconds: number) {
    const audio = audioRef.current;
    if (!audio) return;
    seekTo(Math.min(Math.max(audio.currentTime + seconds, 0), duration));
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-white/[0.08] bg-background/85 px-4 py-3 backdrop-blur-2xl lg:left-72">
      <audio
        ref={audioRef}
        src={audioSrc}
        preload="metadata"
        onLoadedMetadata={(event) => setDuration(event.currentTarget.duration || item.duration)}
        onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)}
        onEnded={() => setPlaying(false)}
      />
      <div className="mx-auto grid max-w-7xl items-center gap-4 md:grid-cols-[1fr_1.4fr_1fr]">
        <div className="flex min-w-0 items-center gap-3">
          <Cover title={item.title} />
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold">{item.title}</div>
            <div className="truncate text-xs text-mutedText">
              {hasAudio ? `${item.voice} / ${formatTime(duration)}` : "Generate audio to enable playback"}
            </div>
          </div>
        </div>
        <div>
          <div className="mb-2 flex items-center justify-center gap-2">
            <Button size="icon" variant="ghost" aria-label="Skip back" disabled={!hasAudio} onClick={() => skipBy(-10)}>
              <SkipBack className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              disabled={!hasAudio}
              onClick={() => setPlaying(!playing)}
              aria-label={playing ? "Pause" : "Play"}
            >
              {playing ? <Pause className="h-4 w-4 fill-current" /> : <Play className="h-4 w-4 fill-current" />}
            </Button>
            <Button size="icon" variant="ghost" aria-label="Skip forward" disabled={!hasAudio} onClick={() => skipBy(10)}>
              <SkipForward className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex items-center gap-3 text-xs text-mutedText">
            <span>{formatTime(currentTime)}</span>
            <input
              type="range"
              min={0}
              max={Math.max(duration, 1)}
              step={1}
              value={Math.min(currentTime, duration || 1)}
              disabled={!hasAudio}
              onChange={(event) => seekTo(Number(event.target.value))}
              className="h-1.5 flex-1 accent-white"
              aria-label="Seek audio"
            />
            <span>{formatTime(duration)}</span>
          </div>
        </div>
        <div className="hidden items-center justify-end gap-3 md:flex">
          <Volume2 className="h-4 w-4 text-zinc-500" />
          <select
            value={speed}
            onChange={(event) => setSpeed(event.target.value)}
            className="rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm outline-none"
          >
            {["0.8x", "1.0x", "1.2x", "1.5x"].map((option) => (
              <option key={option} className="bg-elevated">
                {option}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}

function ProcessingTimeline({ active }: { active: number }) {
  return (
    <div className="mt-5 space-y-3">
      {stages.map((label, index) => (
        <div key={label} className="flex items-center gap-3">
          <div className={cn("flex h-7 w-7 items-center justify-center rounded-full border text-xs", index <= active ? "border-accent bg-accent/20 text-white" : "border-white/[0.08] text-zinc-500")}>
            {index + 1}
          </div>
          <div className="min-w-0 flex-1">
            <div className={cn("text-sm", index <= active ? "text-zinc-100" : "text-zinc-500")}>{label}</div>
            <div className="mt-1 h-1 overflow-hidden rounded-full bg-white/[0.06]">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-primary to-success"
                animate={{ width: index < active ? "100%" : index === active ? "72%" : "0%" }}
                transition={{ duration: 0.45 }}
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function Cover({ title, large = false }: { title: string; large?: boolean }) {
  const label = typeof title === "string" && title.trim() ? title : "Untitled";
  const initials = label
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return (
    <div
      className={cn(
        "relative flex shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-[linear-gradient(135deg,#7C3AED,#18181B_58%,#22C55E)] font-display font-semibold shadow-glow",
        large ? "aspect-[4/3] w-full text-5xl" : "h-12 w-12 text-sm"
      )}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,.3),transparent_35%)]" />
      <span className="relative">{initials}</span>
    </div>
  );
}

function SectionHeader({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return (
    <div>
      <div className="mb-3 text-sm font-medium uppercase tracking-[0.22em] text-accent">{eyebrow}</div>
      <h2 className="max-w-3xl font-display text-4xl font-semibold tracking-tight sm:text-5xl">{title}</h2>
      <p className="mt-4 max-w-2xl text-base leading-7 text-mutedText">{description}</p>
    </div>
  );
}

function EmptyState({
  icon: Icon,
  title,
  description
}: {
  icon: typeof FileText;
  title: string;
  description: string;
}) {
  return (
    <Card className="flex min-h-[260px] flex-col items-center justify-center p-8 text-center">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-white/[0.06]">
        <Icon className="h-5 w-5 text-zinc-400" />
      </div>
      <div className="font-semibold">{title}</div>
      <div className="mt-2 max-w-sm text-sm text-mutedText">{description}</div>
    </Card>
  );
}

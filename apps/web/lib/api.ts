export type Voice = {
  id: string;
  name: string;
  language: string;
  gender: string;
};

export type HistoryItem = {
  id: number;
  title: string;
  source_type: "pdf" | "text";
  voice: string;
  audio_path: string;
  duration: number;
  created_at: string;
};

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, init);
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Request failed: ${response.status}`);
  }
  return response.json() as Promise<T>;
}

export const api = {
  getVoices: () => request<Voice[]>("/voices"),
  getHistory: () => request<HistoryItem[]>("/history"),
  deleteHistory: (id: number) => request<{ ok: boolean }>(`/history/${id}`, { method: "DELETE" }),
  extractPdf: (file: File) => {
    const form = new FormData();
    form.append("file", file);
    return request<{ document_id: number; title: string; page_count: number; preview: string; text: string }>(
      "/extract-pdf",
      { method: "POST", body: form }
    );
  },
  generateAudio: (body: { title: string; text: string; voice: string; source_type: "pdf" | "text" }) =>
    request<HistoryItem>("/generate-audio", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    })
};

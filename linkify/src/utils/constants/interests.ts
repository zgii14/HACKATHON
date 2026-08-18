// Bidang minat — SINGLE SOURCE OF TRUTH (dipakai onboarding, candidates, skill-gap).
// `key` harus sinkron dengan INTEREST_SKILL_MAP di backend (app/routers/me.py).
export const INTERESTS = [
    { key: "backend", label: "Backend", emoji: "⚙️" },
    { key: "frontend", label: "Frontend", emoji: "💻" },
    { key: "fullstack", label: "Full Stack", emoji: "🌐" },
    { key: "mobile", label: "Mobile", emoji: "📱" },
    { key: "ai_ml", label: "AI / ML", emoji: "🤖" },
    { key: "data", label: "Data Engineering", emoji: "📊" },
    { key: "devops", label: "DevOps / Cloud", emoji: "☁️" },
    { key: "qa", label: "QA & Testing", emoji: "🧪" },
    { key: "security", label: "Cybersecurity", emoji: "🔒" },
    { key: "blockchain", label: "Blockchain / Web3", emoji: "⛓️" },
    { key: "game", label: "Game / AR/VR", emoji: "🎮" },
    { key: "iot", label: "IoT & Embedded", emoji: "🔌" },
] as const;

// Lookup slug → { label, emoji } (turunan dari INTERESTS, jangan diedit manual).
export const INTEREST_LABELS: Record<string, { label: string; emoji: string }> =
    Object.fromEntries(INTERESTS.map((i) => [i.key, { label: i.label, emoji: i.emoji }]));

/** Label rapih untuk slug bidang. Fallback ke slug asli kalau tak dikenal. */
export function interestLabel(slug: string): string {
    return INTEREST_LABELS[slug]?.label ?? slug;
}

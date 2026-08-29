"use client";

import { VerifiedSkill, VerifiedSkillChips } from "@/components/dashboard/verified-skills";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useApi } from "@/hooks/use-api";
import { INTEREST_LABELS } from "@/utils/constants/interests";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
    Search,
    MapPin,
    Github,
    Mail,
    Phone,
    SlidersHorizontal,
    Video,
    Map,
    Calendar,
    Sparkles,
    UserCheck,
    X,
    Code,
    MessageCircle,
    Lock
} from "lucide-react";
import Link from "next/link";
import { useState, useDeferredValue } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type Candidate = {
    id: string;
    user_id: string;
    email: string | null;
    fullName: string | null;
    phone: string | null;
    address: string | null;
    github: string | null;
    cv_skills: string[];
    merged_skills: string[];
    verified_skills?: VerifiedSkill[];
    verified_skill_count?: number;
    cv_data: any;
    interests: string[];
    is_blurred?: boolean;
    github_signals: {
        commits?: number;
        stars?: number;
        repos?: number;
        languages?: string[];
        most_active_repo?: string;
    };
};


type SearchResponse = {
    total: number;
    limit: number;
    offset: number;
    candidates: Candidate[];
    is_premium?: boolean;
};

type RecruiterJob = {
    id: string;
    title: string;
    company: string;
    location: string | null;
    is_remote: boolean;
};

export default function CandidateSearchPage() {
    const { withAuth, authReady } = useApi();
    const qc = useQueryClient();
    const router = useRouter();

    // Search and filter states
    const [q, setQ] = useState("");
    const [location, setLocation] = useState("");
    const [minCommits, setMinCommits] = useState<number | "">("");
    const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
    const [skillInput, setSkillInput] = useState("");
    
    // Pagination states
    const [page, setPage] = useState(1);
    const limit = 10;
    const offset = (page - 1) * limit;

    // Direct Invite states
    const [inviteCandidate, setInviteCandidate] = useState<Candidate | null>(null);
    const [selectedJobId, setSelectedJobId] = useState("");
    const [interviewMethod, setInterviewMethod] = useState<"online" | "offline">("online");
    const [interviewDateTime, setInterviewDateTime] = useState("");
    const [interviewLocation, setInterviewLocation] = useState("");
    const [hrMessage, setHrMessage] = useState("");
    const [hrPhone, setHrPhone] = useState("");
    const [filterOpen, setFilterOpen] = useState(false);
    const [expandedSkills, setExpandedSkills] = useState<Record<string, boolean>>({});

    const deferredQ = useDeferredValue(q);
    const deferredLocation = useDeferredValue(location);
    const deferredMinCommits = useDeferredValue(minCommits);

    // Popular skills helper list for fast clicking
    const POPULAR_SKILLS = [
        "JavaScript", "TypeScript", "Python", "React", "Next.js", "Node.js", 
        "Go", "PostgreSQL", "Docker", "Tailwind CSS", "Flutter"
    ];

    // Build API url for candidate search
    const queryParams = new URLSearchParams();
    if (deferredQ) queryParams.append("q", deferredQ);
    if (deferredLocation) queryParams.append("location", deferredLocation);
    if (deferredMinCommits !== "") queryParams.append("min_commits", String(deferredMinCommits));
    
    selectedSkills.forEach((skill) => {
        queryParams.append("skills", skill);
    });
    queryParams.append("limit", String(limit));
    queryParams.append("offset", String(offset));

    // Fetch candidates
    const { data, isLoading, isError } = useQuery<SearchResponse>({
        queryKey: ["candidates-search", deferredQ, deferredLocation, deferredMinCommits, selectedSkills, page],
        queryFn: () => withAuth(`/recruiter/candidates/search?${queryParams.toString()}`),
        enabled: authReady,
        staleTime: 10 * 1000,
    });

    // Fetch recruiter's jobs for the invitation dropdown
    const { data: myJobs = [] } = useQuery<RecruiterJob[]>({
        queryKey: ["my-jobs"],
        queryFn: () => withAuth("/recruiter/jobs/my-jobs"),
        enabled: authReady && !!inviteCandidate,
    });

    // Mutation for sending direct invite
    const inviteMutation = useMutation({
        mutationFn: ({ candidateUserId, payload }: { candidateUserId: string; payload: any }) =>
            withAuth(`/recruiter/candidates/${candidateUserId}/invite`, {
                method: "POST",
                body: JSON.stringify(payload),
            }),
        onSuccess: () => {
            toast.success("Undangan wawancara berhasil dikirim!");
            setInviteCandidate(null);
            resetInviteForm();
            qc.invalidateQueries({ queryKey: ["applicants"] });
        },
        onError: (err: any) => {
            toast.error(err.message || "Gagal mengirim undangan wawancara.");
        },
    });

    const chatMutation = useMutation({
        mutationFn: (candidateUserId: string) =>
            withAuth("/chat/start", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ candidate_id: candidateUserId }),
            }),
        onSuccess: () => {
            toast.success("Percakapan dimulai. Lanjut di halaman Chat.");
            qc.invalidateQueries({ queryKey: ["chat-conversations"] });
            router.push("/dashboard/chat");
        },
        onError: (err: any) => {
            const msg = err.message || "";
            if (msg.includes("Kuota chat")) toast.error(msg);
            else toast.error(msg || "Gagal memulai chat.");
        },
    });

    const handleAddSkill = (skill: string) => {
        const trimmed = skill.trim();
        if (trimmed && !selectedSkills.some(s => s.toLowerCase() === trimmed.toLowerCase())) {
            setSelectedSkills([...selectedSkills, trimmed]);
            setPage(1);
        }
        setSkillInput("");
    };

    const handleRemoveSkill = (skill: string) => {
        setSelectedSkills(selectedSkills.filter((s) => s !== skill));
        setPage(1);
    };

    const resetInviteForm = () => {
        setSelectedJobId("");
        setInterviewMethod("online");
        setInterviewDateTime("");
        setInterviewLocation("");
        setHrMessage("");
        setHrPhone("");
    };

    const handleInviteSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!inviteCandidate) return;
        if (!selectedJobId) {
            toast.error("Silakan pilih lowongan terlebih dahulu.");
            return;
        }
        if (!interviewDateTime || !interviewLocation) {
            toast.error("Mohon lengkapi jadwal dan link/alamat wawancara.");
            return;
        }

        inviteMutation.mutate({
            candidateUserId: inviteCandidate.user_id,
            payload: {
                job_id: selectedJobId,
                type: interviewMethod,
                datetime: interviewDateTime,
                location_or_link: interviewLocation,
                hr_message: hrMessage || null,
                hr_phone: hrPhone || null,
            },
        });
    };

    const totalPages = data ? Math.ceil(data.total / limit) : 0;

    return (
        <div className="space-y-8 max-w-6xl pb-20 relative">
            {/* Page Title */}
            <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                    <Sparkles className="w-6 h-6 text-primary" />
                    Verified Talent Sourcing
                </h1>
                <p className="text-xs text-muted-foreground mt-1">
                    Cari developer terverifikasi berdasarkan repositori GitHub, kontribusi kode, lokasi, dan set keahlian.
                </p>
            </div>

            {/* Mobile filter bar */}
            <div className="flex items-center justify-between lg:hidden">
                <button onClick={() => setFilterOpen(true)} className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-xs font-bold">
                    <SlidersHorizontal className="size-4" /> Filter {selectedSkills.length > 0 ? `· ${selectedSkills.length}` : ""}
                </button>
                <span className="font-mono text-xs text-muted-foreground">{data ? `${data.total} kandidat` : ""}</span>
            </div>
            <Dialog open={filterOpen} onOpenChange={setFilterOpen}>
                <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-md">
                    <DialogHeader><DialogTitle className="flex items-center gap-2 text-sm"><SlidersHorizontal className="size-4 text-primary" /> Filter Kandidat</DialogTitle></DialogHeader>
                    <div className="space-y-5 pt-2">
                        {/* Filter content duplicated for mobile dialog - same as desktop */}
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-muted-foreground uppercase">Kata Kunci Utama</label>
                            <div className="relative">
                                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                <input type="text" placeholder="Nama, lokasi, username github..." value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} className="w-full bg-background rounded-xl border border-border pl-9 pr-3 py-2 text-xs focus:outline-none focus:border-primary" />
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-muted-foreground uppercase">Domisili / Kota</label>
                            <div className="relative">
                                <MapPin className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                <input type="text" placeholder="Jakarta, Bengkulu, Remote..." value={location} onChange={(e) => { setLocation(e.target.value); setPage(1); }} className="w-full bg-background rounded-xl border border-border pl-9 pr-3 py-2 text-xs focus:outline-none focus:border-primary" />
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-muted-foreground uppercase">Minimal Komit GitHub</label>
                            <input type="number" min="0" placeholder="Contoh: 10, 50, 100" value={minCommits} onChange={(e) => { const val = e.target.value; setMinCommits(val === "" ? "" : Number(val)); setPage(1); }} className="w-full bg-background rounded-xl border border-border px-3 py-2 text-xs focus:outline-none focus:border-primary" />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-muted-foreground uppercase">Keahlian (Skills)</label>
                            <div className="flex gap-2">
                                <input type="text" placeholder="Tambah skill (e.g. python)" value={skillInput} onChange={(e) => setSkillInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddSkill(skillInput); } }} className="flex-1 bg-background rounded-xl border border-border px-3 py-2 text-xs focus:outline-none focus:border-primary" />
                                <Button size="sm" onClick={() => handleAddSkill(skillInput)} className="rounded-xl px-3 h-8 bg-muted hover:bg-muted/80 text-foreground">+</Button>
                            </div>
                            {selectedSkills.length > 0 && (
                                <div className="flex flex-wrap gap-1.5 pt-1">
                                    {selectedSkills.map((skill) => (
                                        <Badge key={skill} variant="secondary" className="text-[10px] px-2 py-0.5 rounded-md flex items-center gap-1 bg-primary/10 text-primary border-transparent hover:bg-primary/20">{skill}<X className="w-3 h-3 cursor-pointer hover:text-rose-500" onClick={() => handleRemoveSkill(skill)} /></Badge>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Main Split Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                
                {/* Left Side: Filter Sidebar — hidden on mobile, visible on desktop */}
                <div className="hidden lg:col-span-4 lg:flex rounded-xl border border-border bg-card p-4 space-y-4 flex-col">
                    <div className="flex items-center gap-2 border-b border-border pb-3">
                        <SlidersHorizontal className="w-4 h-4 text-primary" />
                        <h2 className="text-sm font-bold">Filter Kandidat</h2>
                    </div>

                    {/* General Text Search */}
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-muted-foreground uppercase">Kata Kunci Utama</label>
                        <div className="relative">
                            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                            <input
                                type="text"
                                placeholder="Nama, lokasi, username github..."
                                value={q}
                                onChange={(e) => { setQ(e.target.value); setPage(1); }}
                                className="w-full bg-background rounded-xl border border-border pl-9 pr-3 py-2 text-xs focus:outline-none focus:border-primary transition-colors"
                            />
                        </div>
                    </div>

                    {/* Location Filter */}
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-muted-foreground uppercase">Domisili / Kota</label>
                        <div className="relative">
                            <MapPin className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                            <input
                                type="text"
                                placeholder="Jakarta, Bengkulu, Remote..."
                                value={location}
                                onChange={(e) => { setLocation(e.target.value); setPage(1); }}
                                className="w-full bg-background rounded-xl border border-border pl-9 pr-3 py-2 text-xs focus:outline-none focus:border-primary transition-colors"
                            />
                        </div>
                    </div>

                    {/* GitHub Commits Filter */}
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-muted-foreground uppercase">Minimal Komit GitHub</label>
                        <input
                            type="number"
                            min="0"
                            placeholder="Contoh: 10, 50, 100"
                            value={minCommits}
                            onChange={(e) => {
                                const val = e.target.value;
                                setMinCommits(val === "" ? "" : Number(val));
                                setPage(1);
                            }}
                            className="w-full bg-background rounded-xl border border-border px-3 py-2 text-xs focus:outline-none focus:border-primary transition-colors"
                        />
                    </div>

                    {/* Skills Filter */}
                    <div className="space-y-3">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-muted-foreground uppercase">Keahlian (Skills)</label>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    placeholder="Tambah skill (e.g. python)"
                                    value={skillInput}
                                    onChange={(e) => setSkillInput(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter") {
                                            e.preventDefault();
                                            handleAddSkill(skillInput);
                                        }
                                    }}
                                    className="flex-1 bg-background rounded-xl border border-border px-3 py-2 text-xs focus:outline-none focus:border-primary transition-colors"
                                />
                                <Button
                                    size="sm"
                                    onClick={() => handleAddSkill(skillInput)}
                                    className="rounded-xl px-3 h-8 bg-muted hover:bg-muted/80 text-foreground"
                                >
                                    +
                                </Button>
                            </div>
                        </div>

                        {/* Selected Skills Tags */}
                        {selectedSkills.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 pt-1">
                                {selectedSkills.map((skill) => (
                                    <Badge
                                        key={skill}
                                        variant="secondary"
                                        className="text-[10px] px-2 py-0.5 rounded-md flex items-center gap-1 bg-primary/10 text-primary border-transparent hover:bg-primary/20"
                                    >
                                        {skill}
                                        <X
                                            className="w-3 h-3 cursor-pointer hover:text-rose-500"
                                            onClick={() => handleRemoveSkill(skill)}
                                        />
                                    </Badge>
                                ))}
                            </div>
                        )}

                        {/* Popular Skills Quick Clicks */}
                        <div className="space-y-1">
                            <span className="text-[9px] font-semibold text-muted-foreground">Rekomendasi Cepat:</span>
                            <div className="flex flex-wrap gap-1">
                                {POPULAR_SKILLS.map((skill) => {
                                    const active = selectedSkills.some(s => s.toLowerCase() === skill.toLowerCase());
                                    return (
                                        <button
                                            key={skill}
                                            onClick={() => active ? handleRemoveSkill(skill) : handleAddSkill(skill)}
                                            className={`text-[9px] px-2 py-0.5 rounded-full border transition-all duration-150 ${
                                                active
                                                    ? "bg-primary text-white border-transparent"
                                                    : "bg-background text-muted-foreground border-border hover:bg-muted"
                                            }`}
                                        >
                                            {skill}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Side: Sourcing Candidates Results */}
                <div className="lg:col-span-8 space-y-4">
                    {/* Active Filters Summary / Candidate Count */}
                    <div className="flex items-center justify-between border-b border-border/40 pb-3">
                        <span className="text-xs font-semibold text-muted-foreground">
                            {data ? `Ditemukan ${data.total} kandidat cocok` : "Mencari kandidat..."}
                        </span>
                        {selectedSkills.length > 0 || q || location || minCommits !== "" ? (
                            <button
                                onClick={() => {
                                    setQ("");
                                    setLocation("");
                                    setMinCommits("");
                                    setSelectedSkills([]);
                                    setPage(1);
                                }}
                                className="text-[10px] text-primary hover:underline font-bold"
                            >
                                Reset Semua Filter
                            </button>
                        ) : null}
                    </div>

                    {/* Loading State */}
                    {isLoading && (
                        <div className="space-y-3">
                            {[1, 2, 3].map((n) => (
                                <div key={n} className="h-32 rounded-2xl border bg-card animate-pulse" />
                            ))}
                        </div>
                    )}

                    {/* Error State */}
                    {isError && (
                        <div className="text-center py-12 border rounded-2xl bg-rose-500/5 text-rose-500 border-rose-500/20">
                            <p className="text-xs font-semibold">Gagal memuat basis data kandidat.</p>
                            <p className="text-[10px] mt-1 text-muted-foreground">Pastikan server backend Anda berjalan.</p>
                        </div>
                    )}

                    {/* Candidates List — Workbench */}
                    {data && data.candidates.length > 0 ? (
                        <div className="divide-y divide-border border-y border-border">
                            {data.candidates.map((candidate) => {
                                const commits = candidate.github_signals?.commits ?? 0;
                                const stars = candidate.github_signals?.stars ?? 0;
                                const repos = candidate.github_signals?.repos ?? 0;
                                const isBlurred = !!candidate.is_blurred;

                                return (
                                    <div
                                        key={candidate.id}
                                        className={`relative bg-card px-5 py-5 hover:bg-muted/20 ${isBlurred ? "overflow-hidden" : ""}`}
                                    >
                                        {isBlurred && (
                                            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-card/70 backdrop-blur-sm rounded-2xl p-5 text-center">
                                                <div className="flex size-10 items-center justify-center rounded-full bg-amber-500/10 text-amber-600">
                                                    <Lock className="size-5" />
                                                </div>
                                                <p className="text-sm font-bold">Profil terkunci</p>
                                                <p className="max-w-xs text-xs text-muted-foreground">Free hanya 5 profil/minggu. Upgrade ke Premium untuk lihat semua kandidat tanpa blur.</p>
                                                <Link href="/dashboard/recruiter/billing" className="mt-1 inline-flex rounded-full bg-violet-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-violet-700">Lihat Tagihan</Link>
                                            </div>
                                        )}
                                        <div className={isBlurred ? "blur-sm pointer-events-none select-none" : ""}>
                                        {/* Card Top Row — Workbench fix HP */}
                                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                            <div className="flex min-w-0 flex-1 items-center gap-3">
                                                <div className="size-10 shrink-0 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-black text-sm">
                                                    {candidate.fullName?.substring(0, 2).toUpperCase() || "CN"}
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <h3 className="truncate font-bold text-sm text-foreground">
                                                        {candidate.fullName || "Kandidat Tanpa Nama"}
                                                    </h3>
                                                    <div className="flex min-w-0 flex-wrap items-center gap-1 truncate text-[10px] text-muted-foreground mt-0.5">
                                                        {candidate.address && (
                                                            <span className="inline-flex min-w-0 items-center gap-0.5 truncate">
                                                                <MapPin className="size-3 shrink-0" />
                                                                <span className="truncate">{candidate.address}</span>
                                                            </span>
                                                        )}
                                                        {candidate.github && (
                                                            <>
                                                                <span>•</span>
                                                                <a
                                                                    href={`https://github.com/${candidate.github}`}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="inline-flex items-center gap-0.5 truncate text-primary hover:underline"
                                                                >
                                                                    <Github className="size-3 shrink-0 text-foreground" />
                                                                    <span className="truncate">@{candidate.github}</span>
                                                                </a>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex gap-1.5 sm:shrink-0">
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => chatMutation.mutate(candidate.user_id)}
                                                    disabled={chatMutation.isPending}
                                                    className="h-8 flex-1 text-xs font-bold gap-1 rounded-full sm:flex-none"
                                                >
                                                    <MessageCircle className="w-3.5 h-3.5" />
                                                    Chat
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    onClick={() => {
                                                        setInviteCandidate(candidate);
                                                        resetInviteForm();
                                                    }}
                                                    className="h-8 flex-1 text-xs font-bold gap-1 rounded-full bg-primary hover:bg-primary/95 text-white sm:flex-none"
                                                >
                                                    <UserCheck className="w-3.5 h-3.5" />
                                                    Invite
                                                </Button>
                                            </div>
                                        </div>

                                        {/* Bidang minat kandidat */}
                                        {candidate.interests?.length > 0 && (
                                            <div className="flex flex-wrap items-center gap-1.5">
                                                <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Minat:</span>
                                                {candidate.interests.map((key) => {
                                                    const it = INTEREST_LABELS[key];
                                                    return (
                                                        <span
                                                            key={key}
                                                            className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/30 px-2 py-0.5 text-[10px] font-medium text-foreground"
                                                        >
                                                            <span>{it?.emoji ?? "🎯"}</span>
                                                            {it?.label ?? key}
                                                        </span>
                                                    );
                                                })}
                                            </div>
                                        )}

                                        {/* Contacts & GitHub Signals Row — flat */}
                                        <div className="grid grid-cols-1 gap-3 border-t border-border pt-3 text-[10px] sm:grid-cols-2">
                                            {/* Details & Contacts */}
                                            <div className="space-y-1 min-w-0">
                                                <div className="flex min-w-0 items-center gap-1.5 text-foreground">
                                                    <Mail className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
                                                    <span className="min-w-0 truncate font-medium select-all break-all">{candidate.email || "-"}</span>
                                                </div>
                                                <div className="flex min-w-0 items-center gap-1.5 text-foreground">
                                                    <Phone className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
                                                    <span className="min-w-0 truncate font-medium select-all">{candidate.phone || "-"}</span>
                                                </div>
                                            </div>

                                            {/* GitHub Signals */}
                                            {candidate.github ? (
                                                <div className="flex flex-wrap gap-x-4 gap-y-1 md:justify-end items-center">
                                                    <div className="flex flex-col text-left md:text-right">
                                                        <span className="text-[9px] text-muted-foreground uppercase font-bold"> GitHub Commits</span>
                                                        <span className="font-black text-sm text-foreground">{commits}</span>
                                                    </div>
                                                    <div className="flex flex-col text-left md:text-right">
                                                        <span className="text-[9px] text-muted-foreground uppercase font-bold"> Stars</span>
                                                        <span className="font-black text-sm text-foreground">{stars}</span>
                                                    </div>
                                                    <div className="flex flex-col text-left md:text-right">
                                                        <span className="text-[9px] text-muted-foreground uppercase font-bold"> Repos</span>
                                                        <span className="font-black text-sm text-foreground">{repos}</span>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="text-right text-[9px] text-muted-foreground italic flex items-center justify-end">
                                                    Akun GitHub tidak terhubung
                                                </div>
                                            )}
                                        </div>

                                        {/* Skills list tags — tampil setengah */}
                                        <div className="space-y-1.5">
                                            <div className="flex items-center gap-1 text-[9px] text-muted-foreground font-bold uppercase tracking-wider">
                                                <Code className="w-3.5 h-3.5" />
                                                Declared Skills (CV + GitHub) · {candidate.merged_skills?.length ?? 0}
                                            </div>
                                            <div className="flex flex-wrap gap-1">
                                                {candidate.merged_skills && candidate.merged_skills.length > 0 ? (
                                                    (expandedSkills[candidate.id] ? candidate.merged_skills : candidate.merged_skills.slice(0, Math.ceil(candidate.merged_skills.length / 2))).map((skill) => {
                                                        const isFiltered = selectedSkills.some(s => s.toLowerCase() === skill.toLowerCase());
                                                        return (
                                                            <Badge
                                                                key={skill}
                                                                variant="secondary"
                                                                className={`text-[9px] px-2 py-0.5 rounded-md border-transparent ${
                                                                    isFiltered 
                                                                        ? "bg-primary/20 text-primary font-bold" 
                                                                        : "bg-muted text-muted-foreground"
                                                                }`}
                                                            >
                                                                {skill}
                                                            </Badge>
                                                        );
                                                    })
                                                ) : (
                                                    <span className="text-[10px] text-muted-foreground italic">Belum ada keahlian terdata</span>
                                                )}
                                                {candidate.merged_skills && candidate.merged_skills.length > 6 && (
                                                    <button onClick={() => setExpandedSkills((p) => ({ ...p, [candidate.id]: !p[candidate.id] }))} className="text-[10px] font-medium text-violet-600 hover:underline">
                                                        {expandedSkills[candidate.id] ? "Sembunyikan" : `+${candidate.merged_skills.length - Math.ceil(candidate.merged_skills.length / 2)} lagi`}
                                                    </button>
                                                )}
                                            </div>
                                        </div>

                                        {/* Skill terverifikasi — punya bukti commit di repo sendiri */}
                                        <div className="space-y-1.5">
                                            <div className="flex items-center gap-1 text-[9px] text-muted-foreground font-bold uppercase tracking-wider">
                                                <Code className="w-3.5 h-3.5" />
                                                Terverifikasi ({candidate.verified_skill_count ?? 0}) · bukti commit
                                            </div>
                                            {(candidate.verified_skills ?? []).length > 0 ? (
                                                <VerifiedSkillChips items={candidate.verified_skills ?? []} />
                                            ) : (
                                                <span className="text-[10px] text-muted-foreground italic">
                                                    Belum ada bukti commit yang cukup
                                                </span>
                                            )}
                                        </div>
                                        </div>
                                    </div>
                                );
                            })}

                            {/* Pagination Row */}
                            {totalPages > 1 && (
                                <div className="flex items-center justify-center gap-2 pt-4">
                                    <Button
                                        size="sm"
                                        disabled={page === 1}
                                        onClick={() => setPage(p => Math.max(1, p - 1))}
                                        className="rounded-xl h-8 text-xs font-bold"
                                    >
                                        Sebelumnya
                                    </Button>
                                    <span className="text-xs font-semibold text-muted-foreground">
                                        Halaman {page} dari {totalPages}
                                    </span>
                                    <Button
                                        size="sm"
                                        disabled={page === totalPages}
                                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                        className="rounded-xl h-8 text-xs font-bold"
                                    >
                                        Selanjutnya
                                    </Button>
                                </div>
                            )}
                        </div>
                    ) : (
                        !isLoading && (
                            <div className="text-center py-16 border border-dashed rounded-2xl bg-muted/5">
                                <p className="text-xs text-muted-foreground italic">
                                    Tidak ada kandidat terverifikasi yang cocok dengan filter pencarian Anda.
                                </p>
                            </div>
                        )
                    )}
                </div>
            </div>

            {/* Direct Invite Scheduling Glassmorphism Dialog Modal */}
            {inviteCandidate && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <div
                        className="fixed inset-0 bg-black/60 backdrop-blur-md"
                        onClick={() => setInviteCandidate(null)}
                    />
                    
                    {/* Dialog Container */}
                    <div className="relative w-full max-w-lg rounded-3xl border border-border bg-card/95 p-6 shadow-2xl backdrop-blur-lg animate-in fade-in-50 zoom-in-95 duration-200">
                        {/* Close button */}
                        <button
                            onClick={() => setInviteCandidate(null)}
                            className="absolute right-4 top-4 rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                        >
                            <X className="w-4 h-4" />
                        </button>

                        {/* Modal Header */}
                        <div className="flex items-center gap-2.5 pb-4 border-b border-border">
                            <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold">
                                <Calendar className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="font-bold text-sm">Undangan Direct Interview</h3>
                                <p className="text-[10px] text-muted-foreground">
                                    Kirim tawaran wawancara langsung ke <span className="text-foreground font-bold">{inviteCandidate.fullName}</span>
                                </p>
                            </div>
                        </div>

                        {/* Form */}
                        <form onSubmit={handleInviteSubmit} className="space-y-4 pt-4">
                            {/* Target Job selection */}
                            <div className="space-y-1.5">
                                <label className="text-[9px] font-bold text-muted-foreground uppercase">Pilih Lowongan Pekerjaan</label>
                                <select
                                    required
                                    value={selectedJobId}
                                    onChange={(e) => setSelectedJobId(e.target.value)}
                                    className="w-full bg-background rounded-xl border border-border px-3 py-2 text-xs focus:outline-none focus:border-primary transition-colors"
                                >
                                    <option value="">-- Pilih Lowongan --</option>
                                    {myJobs.map((job) => (
                                        <option key={job.id} value={job.id}>
                                            {job.title} ({job.company})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Interview Method & Date Row */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-[9px] font-bold text-muted-foreground uppercase">Metode Wawancara</label>
                                    <select
                                        value={interviewMethod}
                                        onChange={(e) => {
                                            setInterviewMethod(e.target.value as "online" | "offline");
                                            setInterviewLocation("");
                                        }}
                                        className="w-full bg-background rounded-xl border border-border px-3 py-2 text-xs focus:outline-none focus:border-primary transition-colors"
                                    >
                                        <option value="online">Online (Video Meet)</option>
                                        <option value="offline">Offline (Tatap Muka)</option>
                                    </select>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-[9px] font-bold text-muted-foreground uppercase">Tanggal & Waktu</label>
                                    <input
                                        required
                                        type="datetime-local"
                                        value={interviewDateTime}
                                        onChange={(e) => setInterviewDateTime(e.target.value)}
                                        className="w-full bg-background rounded-xl border border-border px-3 py-2 text-xs focus:outline-none focus:border-primary transition-colors"
                                    />
                                </div>
                            </div>

                            {/* Interview Link / Location address */}
                            <div className="space-y-1.5">
                                <label className="text-[9px] font-bold text-muted-foreground uppercase flex items-center gap-1">
                                    {interviewMethod === "online" ? (
                                        <>
                                            <Video className="w-3.5 h-3.5 text-primary" />
                                            Link Google Meet / Zoom
                                        </>
                                    ) : (
                                        <>
                                            <Map className="w-3.5 h-3.5 text-primary" />
                                            Alamat Kantor Wawancara
                                        </>
                                    )}
                                </label>
                                <input
                                    required
                                    type="text"
                                    value={interviewLocation}
                                    onChange={(e) => setInterviewLocation(e.target.value)}
                                    placeholder={interviewMethod === "online" ? "https://meet.google.com/xyz-pdq-abc" : "Jl. Gatot Subroto No. 45, Jakarta Selatan"}
                                    className="w-full bg-background rounded-xl border border-border px-3 py-2 text-xs focus:outline-none focus:border-primary transition-colors"
                                />
                            </div>

                            {/* Contact Person Details */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1.5 md:col-span-2">
                                    <label className="text-[9px] font-bold text-muted-foreground uppercase">Kontak HR (WhatsApp / Telepon)</label>
                                    <input
                                        type="text"
                                        value={hrPhone}
                                        onChange={(e) => setHrPhone(e.target.value)}
                                        placeholder="Contoh: 08123456789 (untuk konfirmasi cepat)"
                                        className="w-full bg-background rounded-xl border border-border px-3 py-2 text-xs focus:outline-none focus:border-primary transition-colors"
                                    />
                                </div>
                            </div>

                            {/* HR Custom Invitation Note Message */}
                            <div className="space-y-1.5">
                                <label className="text-[9px] font-bold text-muted-foreground uppercase">Pesan Tambahan untuk Kandidat</label>
                                <textarea
                                    rows={3}
                                    value={hrMessage}
                                    onChange={(e) => setHrMessage(e.target.value)}
                                    placeholder="Contoh: Halo! Kami tertarik dengan profil Anda dan ingin mengundang Anda dalam tahap wawancara teknis."
                                    className="w-full bg-background rounded-xl border border-border px-3 py-2 text-xs focus:outline-none focus:border-primary resize-none transition-colors"
                                />
                            </div>

                            {/* Modal Action buttons */}
                            <div className="flex items-center justify-end gap-2 border-t border-border pt-4 mt-2">
                                <Button
                                    type="button"
                                    onClick={() => setInviteCandidate(null)}
                                    className="rounded-xl px-4 h-9 bg-muted hover:bg-muted/80 text-foreground text-xs font-bold"
                                >
                                    Batal
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={inviteMutation.isPending}
                                    className="rounded-xl px-4 h-9 bg-primary hover:bg-primary/95 text-white text-xs font-bold flex items-center gap-1.5"
                                >
                                    {inviteMutation.isPending ? "Mengirim..." : "Kirim Undangan"}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

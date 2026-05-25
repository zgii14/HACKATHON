"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useApi } from "@/hooks/use-api";
import { useQuery } from "@tanstack/react-query";
import { Briefcase, MapPin, Plus, UserCheck, Users, Search } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

type RecruiterJob = {
    id: string;
    title: string;
    company: string;
    location: string | null;
    is_remote: boolean;
    required_skills: string[];
    salary: string | null;
    work_type: string | null;
    applicant_count: number;
};

export default function RecruiterJobsPage() {
    const { withAuth, authReady } = useApi();
    const [search, setSearch] = useState("");

    const { data: jobs = [], isLoading } = useQuery<RecruiterJob[]>({
        queryKey: ["my-jobs"],
        queryFn: () => withAuth("/recruiter/jobs/my-jobs"),
        enabled: authReady,
        staleTime: 30 * 1000,
    });

    const filteredJobs = jobs.filter((j) =>
        j.title.toLowerCase().includes(search.toLowerCase()) ||
        j.company.toLowerCase().includes(search.toLowerCase())
    );

    if (isLoading) {
        return (
            <div className="space-y-4 max-w-4xl">
                <div className="h-8 w-48 rounded-lg bg-muted animate-pulse" />
                <div className="h-64 rounded-2xl border bg-card animate-pulse" />
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-4xl pb-16">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/40 pb-5">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <Briefcase className="w-6 h-6 text-primary" />
                        Portal Recruiter - Lowongan Kerja
                    </h1>
                    <p className="text-muted-foreground text-xs mt-1 leading-relaxed">
                        Kelola lowongan pekerjaan yang Anda buat, pantau pelamar, dan gunakan AI Screening portofolio untuk merekrut developer terbaik.
                    </p>
                </div>

                <Link href="/dashboard/recruiter/jobs/new">
                    <Button className="h-9 text-xs gap-1.5 rounded-xl bg-primary hover:bg-primary/95 text-primary-foreground shadow-md shadow-primary/20">
                        <Plus className="w-4 h-4" />
                        Buat Lowongan
                    </Button>
                </Link>
            </div>

            {/* Filter Search */}
            <div className="relative max-w-sm">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full text-xs rounded-xl border border-border bg-muted/10 pl-9 pr-4 py-2 focus:outline-none"
                    placeholder="Cari lowongan..."
                />
            </div>

            {/* Jobs list */}
            <div className="grid grid-cols-1 gap-4">
                {filteredJobs.map((job) => (
                    <div
                        key={job.id}
                        className="rounded-2xl border border-border bg-card p-5 space-y-4 hover:shadow-lg transition-all duration-300 relative group"
                    >
                        <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
                            <div className="space-y-1">
                                <h3 className="font-bold text-base text-foreground group-hover:text-primary transition-colors">
                                    {job.title}
                                </h3>
                                <p className="text-xs text-muted-foreground font-semibold">
                                    {job.company}
                                </p>
                                
                                <div className="flex flex-wrap items-center gap-3 pt-2 text-[10px] text-muted-foreground">
                                    <span className="flex items-center gap-1">
                                        <MapPin className="w-3.5 h-3.5" />
                                        {job.location || "Indonesia"} ({job.work_type || "Hybrid"})
                                    </span>
                                    {job.salary && (
                                        <span>•  Gaji: {job.salary}</span>
                                    )}
                                </div>
                            </div>

                            {/* Applicant count & Review button */}
                            <div className="flex items-center gap-4 shrink-0 mt-3 md:mt-0">
                                <div className="text-right">
                                    <span className="text-2xl font-black text-foreground flex items-center justify-end gap-1">
                                        <Users className="w-4 h-4 text-primary" />
                                        {job.applicant_count}
                                    </span>
                                    <p className="text-[10px] text-muted-foreground font-medium">Total Pelamar</p>
                                </div>
                                
                                <Link href={`/dashboard/recruiter/jobs/${job.id}`}>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-8 text-xs gap-1 px-3.5 rounded-lg border-muted-foreground/20 hover:bg-black/[0.04] dark:hover:bg-white/[0.06] font-semibold"
                                    >
                                        <UserCheck className="w-3.5 h-3.5" />
                                        Review Pelamar
                                    </Button>
                                </Link>
                            </div>
                        </div>

                        {/* Required skills */}
                        <div className="flex flex-wrap gap-1.5 pt-2">
                            {job.required_skills.map((skill) => (
                                <Badge
                                    key={skill}
                                    variant="secondary"
                                    className="text-[10px] px-2 py-0.5 rounded-md font-medium bg-muted/60 text-muted-foreground border-none"
                                >
                                    {skill}
                                </Badge>
                            ))}
                        </div>
                    </div>
                ))}

                {filteredJobs.length === 0 && (
                    <div className="text-center py-12 border border-dashed rounded-2xl bg-muted/5">
                        <p className="text-xs text-muted-foreground italic">Belum ada lowongan pekerjaan yang diterbitkan.</p>
                    </div>
                )}
            </div>
        </div>
    );
}

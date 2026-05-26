"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useApi } from "@/hooks/use-api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
    FileText,
    Plus,
    Trash2,
    Download,
    Save,
    RotateCcw,
    Sparkles,
    GraduationCap,
    Briefcase,
    Users,
    Award,
    Settings,
    User,
    ArrowLeft,
    CheckCircle2
} from "lucide-react";
import {
    Document,
    Packer,
    Paragraph,
    TextRun,
    AlignmentType,
    convertInchesToTwip,
    Table,
    TableRow,
    TableCell,
    WidthType,
    BorderStyle
} from "docx";
import { saveAs } from "file-saver";
import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";

// ── Types ──
type EducationItem = {
    institution: string;
    location: string;
    major: string;
    degree: string;
    period: string;
    gpa: string;
};

type ExperienceItem = {
    company: string;
    role: string;
    location: string;
    period: string;
    bullets: string[];
};

type OrgItem = {
    organization: string;
    role: string;
    location: string;
    period: string;
    bullets: string[];
};

type TrainingItem = {
    title: string;
    provider: string;
    location: string;
    period: string;
    bullets: string[];
};

type CVData = {
    summary?: string;
    education?: EducationItem[];
    work_experience?: ExperienceItem[];
    org_experience?: OrgItem[];
    training?: TrainingItem[];
    skills?: {
        soft_skills?: string[];
        hard_skills?: string[];
        languages?: string[];
    };
    certifications?: string[];
    email?: string;
    linkedin?: string;
};

type Profile = {
    github_username: string | null;
    bio_full_name: string | null;
    bio_address: string | null;
    bio_phone: string | null;
    cv_skills: string[] | null;
    merged_skills: string[] | null;
    cv_data: CVData | null;
};

export default function CVGeneratorPage() {
    const { withAuth, authReady } = useApi();
    const qc = useQueryClient();

    // ── Form States ──
    const [fullName, setFullName] = useState("");
    const [phone, setPhone] = useState("");
    const [email, setEmail] = useState("");
    const [address, setAddress] = useState("");
    const [linkedin, setLinkedin] = useState("");
    const [github, setGithub] = useState("");
    const [summary, setSummary] = useState("");

    const [education, setEducation] = useState<EducationItem[]>([]);
    const [workExperience, setWorkExperience] = useState<ExperienceItem[]>([]);
    const [orgExperience, setOrgExperience] = useState<OrgItem[]>([]);
    const [training, setTraining] = useState<TrainingItem[]>([]);

    const [softSkills, setSoftSkills] = useState("");
    const [hardSkills, setHardSkills] = useState("");
    const [languages, setLanguages] = useState("");
    const [certifications, setCertifications] = useState<string[]>([]);

    // ── Fetch Profile ──
    const { data: profile, isLoading } = useQuery({
        queryKey: ["profile"],
        queryFn: () => withAuth<Profile | null>("/me/profile"),
        enabled: authReady,
        staleTime: 5 * 60 * 1000,
    });

    // Populate data when profile finishes loading
    useEffect(() => {
        if (!profile) return;
        
        // Basic Info
        setFullName(profile.bio_full_name || "");
        setPhone(profile.bio_phone || "");
        setAddress(profile.bio_address || "");
        setGithub(profile.github_username ? `https://github.com/${profile.github_username}` : "");
        
        // Fallback or read from clerk/database
        if (profile.cv_data) {
            const cd = profile.cv_data;
            setSummary(cd.summary || "");
            setEducation(cd.education || []);
            setWorkExperience(cd.work_experience || []);
            setOrgExperience(cd.org_experience || []);
            setTraining(cd.training || []);
            
            // Skills
            setSoftSkills(cd.skills?.soft_skills?.join(", ") || "");
            setHardSkills(cd.skills?.hard_skills?.join(", ") || "");
            setLanguages(cd.skills?.languages?.join(", ") || "");
            
            // Certificates
            setCertifications(cd.certifications || []);

            // Set email & linkedin from cd
            setEmail(cd.email || "");
            setLinkedin(cd.linkedin || "");
        } else {
            // Default blank states
            setSummary("");
            setEducation([]);
            setWorkExperience([]);
            setOrgExperience([]);
            setTraining([]);
            setSoftSkills("");
            setHardSkills(profile.merged_skills?.join(", ") || "");
            setLanguages("Bahasa Indonesia (Native), English (Intermediate)");
            setCertifications([]);
            setEmail("");
            setLinkedin("");
        }
    }, [profile]);

    // ── Save Mutation ──
    const saveMutation = useMutation({
        mutationFn: async (payload: CVData) => {
            // 1. Save cv_data JSON
            await withAuth("/me/profile/cv-data", {
                method: "PUT",
                body: JSON.stringify(payload),
            });
            // 2. Save basic bio data fields
            await withAuth("/me/biodata", {
                method: "PATCH",
                body: JSON.stringify({
                    bio_full_name: fullName,
                    bio_phone: phone,
                    bio_address: address,
                }),
            });
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["profile"] });
            toast.success("Riwayat CV berhasil disimpan ke database!");
        },
        onError: (err: any) => {
            toast.error(err.message || "Gagal menyimpan data.");
        },
    });

    const getPayload = (): CVData => {
        return {
            summary,
            education,
            work_experience: workExperience,
            org_experience: orgExperience,
            training,
            skills: {
                soft_skills: softSkills.split(",").map((s) => s.trim()).filter(Boolean),
                hard_skills: hardSkills.split(",").map((s) => s.trim()).filter(Boolean),
                languages: languages.split(",").map((s) => s.trim()).filter(Boolean),
            },
            certifications: certifications.filter((c) => c.trim()),
            email,
            linkedin,
        };
    };

    const handleSave = () => {
        saveMutation.mutate(getPayload());
    };

    // ── Array Operations Helpers ──
    const addEducation = () => {
        setEducation([
            ...education,
            { institution: "", location: "", major: "", degree: "", period: "", gpa: "" }
        ]);
    };

    const removeEducation = (idx: number) => {
        setEducation(education.filter((_, i) => i !== idx));
    };

    const addWork = () => {
        setWorkExperience([
            ...workExperience,
            { company: "", role: "", location: "", period: "", bullets: [""] }
        ]);
    };

    const removeWork = (idx: number) => {
        setWorkExperience(workExperience.filter((_, i) => i !== idx));
    };

    const handleWorkBulletChange = (workIdx: number, bulletIdx: number, val: string) => {
        const updated = [...workExperience];
        updated[workIdx].bullets[bulletIdx] = val;
        setWorkExperience(updated);
    };

    const addWorkBullet = (workIdx: number) => {
        const updated = [...workExperience];
        updated[workIdx].bullets.push("");
        setWorkExperience(updated);
    };

    const removeWorkBullet = (workIdx: number, bulletIdx: number) => {
        const updated = [...workExperience];
        updated[workIdx].bullets = updated[workIdx].bullets.filter((_, i) => i !== bulletIdx);
        setWorkExperience(updated);
    };

    const addOrg = () => {
        setOrgExperience([
            ...orgExperience,
            { organization: "", role: "", location: "", period: "", bullets: [""] }
        ]);
    };

    const removeOrg = (idx: number) => {
        setOrgExperience(orgExperience.filter((_, i) => i !== idx));
    };

    const handleOrgBulletChange = (orgIdx: number, bulletIdx: number, val: string) => {
        const updated = [...orgExperience];
        updated[orgIdx].bullets[bulletIdx] = val;
        setOrgExperience(updated);
    };

    const addOrgBullet = (orgIdx: number) => {
        const updated = [...orgExperience];
        updated[orgIdx].bullets.push("");
        setOrgExperience(updated);
    };

    const removeOrgBullet = (orgIdx: number, bulletIdx: number) => {
        const updated = [...orgExperience];
        updated[orgIdx].bullets = updated[orgIdx].bullets.filter((_, i) => i !== bulletIdx);
        setOrgExperience(updated);
    };

    const addTraining = () => {
        setTraining([
            ...training,
            { title: "", provider: "", location: "", period: "", bullets: [""] }
        ]);
    };

    const removeTraining = (idx: number) => {
        setTraining(training.filter((_, i) => i !== idx));
    };

    const handleTrainingBulletChange = (tIdx: number, bulletIdx: number, val: string) => {
        const updated = [...training];
        updated[tIdx].bullets[bulletIdx] = val;
        setTraining(updated);
    };

    const addTrainingBullet = (tIdx: number) => {
        const updated = [...training];
        updated[tIdx].bullets.push("");
        setTraining(updated);
    };

    const removeTrainingBullet = (tIdx: number, bulletIdx: number) => {
        const updated = [...training];
        updated[tIdx].bullets = updated[tIdx].bullets.filter((_, i) => i !== bulletIdx);
        setTraining(updated);
    };

    const addCertificate = () => {
        setCertifications([...certifications, ""]);
    };

    const handleCertChange = (idx: number, val: string) => {
        const updated = [...certifications];
        updated[idx] = val;
        setCertifications(updated);
    };

    const removeCertificate = (idx: number) => {
        setCertifications(certifications.filter((_, i) => i !== idx));
    };

    // ── DOCX Generation Logic (Harvard ATS Rozagi Layout) ──
    const generateWordCV = async () => {
        const FONT = "Times New Roman";
        const SIZE_NAME = 32; // 16pt
        const SIZE_SECTION = 22; // 11pt
        const SIZE_BODY = 20; // 10pt

        const borderNone = {
            top: { style: BorderStyle.NONE, size: 0, color: "auto" },
            bottom: { style: BorderStyle.NONE, size: 0, color: "auto" },
            left: { style: BorderStyle.NONE, size: 0, color: "auto" },
            right: { style: BorderStyle.NONE, size: 0, color: "auto" },
            insideHorizontal: { style: BorderStyle.NONE, size: 0, color: "auto" },
            insideVertical: { style: BorderStyle.NONE, size: 0, color: "auto" }
        };

        const createSectionHeader = (title: string) => {
            return new Paragraph({
                heading: "Heading 1" as any,
                border: {
                    bottom: {
                        color: "A0A0A0",
                        space: 3,
                        style: BorderStyle.SINGLE,
                        size: 6,
                    }
                },
                spacing: { before: 180, after: 80 },
                children: [
                    new TextRun({
                        text: title.toUpperCase(),
                        font: FONT,
                        size: SIZE_SECTION,
                        bold: true,
                        color: "1D1D1F"
                    })
                ]
            });
        };

        const elements: any[] = [];

        // 1. HEADER SECTION (Centered Name & Metadata)
        elements.push(
            new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { after: 60 },
                children: [
                    new TextRun({
                        text: fullName || "NAMA LENGKAP",
                        font: FONT,
                        size: SIZE_NAME,
                        bold: true,
                    })
                ]
            })
        );

        const contactParts = [
            phone && phone.trim(),
            email && email.trim(),
            linkedin && linkedin.trim(),
            github && github.trim()
        ].filter(Boolean);

        elements.push(
            new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { after: 120 },
                children: [
                    new TextRun({
                        text: contactParts.join("  |  "),
                        font: FONT,
                        size: SIZE_BODY,
                    })
                ]
            })
        );

        if (address) {
            elements.push(
                new Paragraph({
                    alignment: AlignmentType.CENTER,
                    spacing: { after: 180 },
                    children: [
                        new TextRun({
                            text: address,
                            font: FONT,
                            size: SIZE_BODY,
                        })
                    ]
                })
            );
        }

        // 2. SUMMARY
        if (summary) {
            elements.push(
                new Paragraph({
                    alignment: AlignmentType.JUSTIFIED,
                    spacing: { after: 120 },
                    children: [
                        new TextRun({
                            text: summary,
                            font: FONT,
                            size: SIZE_BODY,
                        })
                    ]
                })
            );
        }

        // 3. EDUCATION
        if (education.length > 0) {
            elements.push(createSectionHeader("Pendidikan"));
            education.forEach((edu) => {
                const table = new Table({
                    width: { size: 100, type: WidthType.PERCENTAGE },
                    borders: borderNone,
                    rows: [
                        new TableRow({
                            children: [
                                new TableCell({
                                    width: { size: 70, type: WidthType.PERCENTAGE },
                                    borders: borderNone,
                                    children: [
                                        new Paragraph({
                                            spacing: { after: 20 },
                                            children: [
                                                new TextRun({
                                                    text: `${edu.institution} – ${edu.location}`,
                                                    font: FONT,
                                                    size: SIZE_BODY,
                                                    bold: true
                                                })
                                            ]
                                        }),
                                        new Paragraph({
                                            spacing: { after: 60 },
                                            children: [
                                                new TextRun({
                                                    text: `${edu.degree}, ${edu.major}` + (edu.gpa ? `, IPK: ${edu.gpa}` : ""),
                                                    font: FONT,
                                                    size: SIZE_BODY,
                                                    italics: true
                                                })
                                            ]
                                        })
                                    ]
                                }),
                                new TableCell({
                                    width: { size: 30, type: WidthType.PERCENTAGE },
                                    borders: borderNone,
                                    children: [
                                        new Paragraph({
                                            alignment: AlignmentType.RIGHT,
                                            children: [
                                                new TextRun({
                                                    text: edu.period,
                                                    font: FONT,
                                                    size: SIZE_BODY,
                                                })
                                            ]
                                        })
                                    ]
                                })
                            ]
                        })
                    ]
                });
                elements.push(table);
            });
        }

        // 4. WORK EXPERIENCE
        if (workExperience.length > 0) {
            elements.push(createSectionHeader("Pengalaman Kerja"));
            workExperience.forEach((work) => {
                const table = new Table({
                    width: { size: 100, type: WidthType.PERCENTAGE },
                    borders: borderNone,
                    rows: [
                        new TableRow({
                            children: [
                                new TableCell({
                                    width: { size: 70, type: WidthType.PERCENTAGE },
                                    borders: borderNone,
                                    children: [
                                        new Paragraph({
                                            spacing: { after: 20 },
                                            children: [
                                                new TextRun({
                                                    text: `${work.company} – ${work.location}`,
                                                    font: FONT,
                                                    size: SIZE_BODY,
                                                    bold: true
                                                })
                                            ]
                                        }),
                                        new Paragraph({
                                            spacing: { after: 60 },
                                            children: [
                                                new TextRun({
                                                    text: work.role,
                                                    font: FONT,
                                                    size: SIZE_BODY,
                                                    italics: true
                                                })
                                            ]
                                        })
                                    ]
                                }),
                                new TableCell({
                                    width: { size: 30, type: WidthType.PERCENTAGE },
                                    borders: borderNone,
                                    children: [
                                        new Paragraph({
                                            alignment: AlignmentType.RIGHT,
                                            children: [
                                                new TextRun({
                                                    text: work.period,
                                                    font: FONT,
                                                    size: SIZE_BODY,
                                                })
                                            ]
                                        })
                                    ]
                                })
                            ]
                        })
                    ]
                });
                elements.push(table);

                // Bullets
                work.bullets.forEach((b) => {
                    if (!b.trim()) return;
                    elements.push(
                        new Paragraph({
                            bullet: { level: 0 },
                            spacing: { before: 20, after: 20 },
                            children: [
                                new TextRun({
                                    text: b.trim(),
                                    font: FONT,
                                    size: SIZE_BODY
                                })
                            ]
                        })
                    );
                });
            });
        }

        // 5. ORGANIZATIONAL EXPERIENCE
        if (orgExperience.length > 0) {
            elements.push(createSectionHeader("Pengalaman Organisasi"));
            orgExperience.forEach((org) => {
                const table = new Table({
                    width: { size: 100, type: WidthType.PERCENTAGE },
                    borders: borderNone,
                    rows: [
                        new TableRow({
                            children: [
                                new TableCell({
                                    width: { size: 70, type: WidthType.PERCENTAGE },
                                    borders: borderNone,
                                    children: [
                                        new Paragraph({
                                            spacing: { after: 20 },
                                            children: [
                                                new TextRun({
                                                    text: `${org.organization} – ${org.location}`,
                                                    font: FONT,
                                                    size: SIZE_BODY,
                                                    bold: true
                                                })
                                            ]
                                        }),
                                        new Paragraph({
                                            spacing: { after: 60 },
                                            children: [
                                                new TextRun({
                                                    text: org.role,
                                                    font: FONT,
                                                    size: SIZE_BODY,
                                                    italics: true
                                                })
                                            ]
                                        })
                                    ]
                                }),
                                new TableCell({
                                    width: { size: 30, type: WidthType.PERCENTAGE },
                                    borders: borderNone,
                                    children: [
                                        new Paragraph({
                                            alignment: AlignmentType.RIGHT,
                                            children: [
                                                new TextRun({
                                                    text: org.period,
                                                    font: FONT,
                                                    size: SIZE_BODY,
                                                })
                                            ]
                                        })
                                    ]
                                })
                            ]
                        })
                    ]
                });
                elements.push(table);

                org.bullets.forEach((b) => {
                    if (!b.trim()) return;
                    elements.push(
                        new Paragraph({
                            bullet: { level: 0 },
                            spacing: { before: 20, after: 20 },
                            children: [
                                new TextRun({
                                    text: b.trim(),
                                    font: FONT,
                                    size: SIZE_BODY
                                })
                            ]
                        })
                    );
                });
            });
        }

        // 6. TRAINING / PELATIHAN
        if (training.length > 0) {
            elements.push(createSectionHeader("Pelatihan"));
            training.forEach((t) => {
                const table = new Table({
                    width: { size: 100, type: WidthType.PERCENTAGE },
                    borders: borderNone,
                    rows: [
                        new TableRow({
                            children: [
                                new TableCell({
                                    width: { size: 70, type: WidthType.PERCENTAGE },
                                    borders: borderNone,
                                    children: [
                                        new Paragraph({
                                            spacing: { after: 20 },
                                            children: [
                                                new TextRun({
                                                    text: `${t.title} – ${t.location}`,
                                                    font: FONT,
                                                    size: SIZE_BODY,
                                                    bold: true
                                                })
                                            ]
                                        }),
                                        new Paragraph({
                                            spacing: { after: 60 },
                                            children: [
                                                new TextRun({
                                                    text: t.provider,
                                                    font: FONT,
                                                    size: SIZE_BODY,
                                                    italics: true
                                                })
                                            ]
                                        })
                                    ]
                                }),
                                new TableCell({
                                    width: { size: 30, type: WidthType.PERCENTAGE },
                                    borders: borderNone,
                                    children: [
                                        new Paragraph({
                                            alignment: AlignmentType.RIGHT,
                                            children: [
                                                new TextRun({
                                                    text: t.period,
                                                    font: FONT,
                                                    size: SIZE_BODY,
                                                })
                                            ]
                                        })
                                    ]
                                })
                            ]
                        })
                    ]
                });
                elements.push(table);

                t.bullets.forEach((b) => {
                    if (!b.trim()) return;
                    elements.push(
                        new Paragraph({
                            bullet: { level: 0 },
                            spacing: { before: 20, after: 20 },
                            children: [
                                new TextRun({
                                    text: b.trim(),
                                    font: FONT,
                                    size: SIZE_BODY
                                })
                            ]
                        })
                    );
                });
            });
        }

        // 7. SKILLS (Soft, Hard, Language)
        const hasSkills = softSkills || hardSkills || languages;
        if (hasSkills) {
            elements.push(createSectionHeader("Keahlian"));
            if (softSkills) {
                elements.push(
                    new Paragraph({
                        spacing: { before: 30, after: 30 },
                        children: [
                            new TextRun({ text: "Soft Skills: ", font: FONT, size: SIZE_BODY, bold: true }),
                            new TextRun({ text: softSkills, font: FONT, size: SIZE_BODY })
                        ]
                    })
                );
            }
            if (hardSkills) {
                elements.push(
                    new Paragraph({
                        spacing: { before: 30, after: 30 },
                        children: [
                            new TextRun({ text: "Hard Skills: ", font: FONT, size: SIZE_BODY, bold: true }),
                            new TextRun({ text: hardSkills, font: FONT, size: SIZE_BODY })
                        ]
                    })
                );
            }
            if (languages) {
                elements.push(
                    new Paragraph({
                        spacing: { before: 30, after: 30 },
                        children: [
                            new TextRun({ text: "Language: ", font: FONT, size: SIZE_BODY, bold: true }),
                            new TextRun({ text: languages, font: FONT, size: SIZE_BODY })
                        ]
                    })
                );
            }
        }

        // 8. CERTIFICATES
        if (certifications.length > 0) {
            elements.push(createSectionHeader("Sertifikat"));
            certifications.forEach((cert) => {
                if (!cert.trim()) return;
                elements.push(
                    new Paragraph({
                        bullet: { level: 0 },
                        spacing: { before: 20, after: 20 },
                        children: [
                            new TextRun({
                                text: cert.trim(),
                                font: FONT,
                                size: SIZE_BODY
                            })
                        ]
                    })
                );
            });
        }

        // Document wrapper
        const doc = new Document({
            styles: {
                default: {
                    document: {
                        run: {
                            font: FONT,
                        },
                        paragraph: {
                            spacing: {
                                line: 276, // 1.15 line spacing (1.15 * 240 dxa)
                            }
                        }
                    }
                }
            },
            sections: [
                {
                    properties: {
                        page: {
                            margin: {
                                top: convertInchesToTwip(1),
                                right: convertInchesToTwip(1),
                                bottom: convertInchesToTwip(1),
                                left: convertInchesToTwip(1)
                            }
                        }
                    },
                    children: elements
                }
            ]
        });

        // Trigger download
        try {
            const blob = await Packer.toBlob(doc);
            const filename = `CV-${fullName.replace(/\s+/g, "-") || "Resume"}.docx`;
            saveAs(blob, filename);
            toast.success("CV profesional berhasil diunduh sebagai .docx!");
        } catch (e) {
            toast.error("Gagal mendownload berkas CV.");
            console.error(e);
        }
    };

    if (isLoading) {
        return (
            <div className="space-y-4 max-w-3xl">
                <div className="h-8 w-48 rounded-lg bg-muted animate-pulse" />
                <div className="h-64 rounded-2xl border bg-card animate-pulse" />
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-3xl pb-16">
            
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/40 pb-5">
                <div>
                    <div className="flex items-center gap-2 text-muted-foreground text-xs font-semibold mb-1">
                        <Link href="/dashboard/profile" className="hover:text-primary transition-colors flex items-center gap-1">
                            <ArrowLeft className="w-3.5 h-3.5" /> Profil
                        </Link>
                        <span>/</span>
                        <span className="text-foreground">CV Generator</span>
                    </div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <FileText className="w-6 h-6 text-primary" />
                        AI CV Generator
                    </h1>
                    <p className="text-muted-foreground text-xs mt-1 leading-relaxed">
                        Tinjau, lengkapi, dan unduh CV profesional Anda dengan layout yang ATS-friendly (Harvard CV Style).
                    </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleSave}
                        disabled={saveMutation.isPending}
                        className="h-8 text-xs gap-1.5 rounded-lg border-muted-foreground/20 hover:bg-black/[0.04] dark:hover:bg-white/[0.06]"
                    >
                        <Save className="w-3.5 h-3.5" />
                        {saveMutation.isPending ? "Menyimpan..." : "Simpan Riwayat"}
                    </Button>
                    
                    <Button
                        size="sm"
                        onClick={generateWordCV}
                        className="h-8 text-xs gap-1.5 rounded-lg bg-primary hover:bg-primary/95 text-primary-foreground shadow-md shadow-primary/20"
                    >
                        <Download className="w-3.5 h-3.5" />
                        Unduh CV (.docx)
                    </Button>
                </div>
            </div>

            {/* Main Form container */}
            <div className="space-y-6">
                
                {/* 1. DATA DIRI (BIO) */}
                <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
                    <h3 className="text-sm font-semibold flex items-center gap-2 text-foreground">
                        <User className="w-4 h-4 text-violet-400" />
                        1. Informasi Kontak
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs font-semibold text-muted-foreground block mb-1">Nama Lengkap</label>
                            <input
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                                className="w-full text-xs rounded-xl border border-border bg-muted/20 px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/25"
                                placeholder="Masukkan nama..."
                            />
                        </div>
                        <div>
                            <label className="text-xs font-semibold text-muted-foreground block mb-1">Nomor Telepon</label>
                            <input
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                className="w-full text-xs rounded-xl border border-border bg-muted/20 px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/25"
                                placeholder="Contoh: +628..."
                            />
                        </div>
                        <div>
                            <label className="text-xs font-semibold text-muted-foreground block mb-1">Email</label>
                            <input
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full text-xs rounded-xl border border-border bg-muted/20 px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/25"
                                placeholder="nama@email.com"
                            />
                        </div>
                        <div>
                            <label className="text-xs font-semibold text-muted-foreground block mb-1">URL LinkedIn</label>
                            <input
                                value={linkedin}
                                onChange={(e) => setLinkedin(e.target.value)}
                                className="w-full text-xs rounded-xl border border-border bg-muted/20 px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/25"
                                placeholder="www.linkedin.com/in/username"
                            />
                        </div>
                        <div className="md:col-span-2">
                            <label className="text-xs font-semibold text-muted-foreground block mb-1">URL GitHub</label>
                            <input
                                value={github}
                                onChange={(e) => setGithub(e.target.value)}
                                className="w-full text-xs rounded-xl border border-border bg-muted/20 px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/25"
                                placeholder="https://github.com/username"
                            />
                        </div>
                        <div className="md:col-span-2">
                            <label className="text-xs font-semibold text-muted-foreground block mb-1">Alamat Domisili</label>
                            <input
                                value={address}
                                onChange={(e) => setAddress(e.target.value)}
                                className="w-full text-xs rounded-xl border border-border bg-muted/20 px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/25"
                                placeholder="Tulis alamat singkat..."
                            />
                        </div>
                    </div>
                </div>

                {/* 2. RINGKASAN PROFIL */}
                <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
                    <h3 className="text-sm font-semibold flex items-center gap-2 text-foreground">
                        <Sparkles className="w-4 h-4 text-amber-400" />
                        2. Ringkasan Profesional (Summary)
                    </h3>
                    <textarea
                        value={summary}
                        onChange={(e) => setSummary(e.target.value)}
                        rows={4}
                        className="w-full text-xs rounded-xl border border-border bg-muted/20 px-3.5 py-2.5 leading-relaxed focus:outline-none focus:ring-2 focus:ring-primary/25"
                        placeholder="Tulis ringkasan singkat profil Anda..."
                    />
                </div>

                {/* 3. PENDIDIKAN */}
                <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
                    <div className="flex items-center justify-between">
                        <h3 className="text-sm font-semibold flex items-center gap-2 text-foreground">
                            <GraduationCap className="w-4 h-4 text-emerald-400" />
                            3. Riwayat Pendidikan
                        </h3>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={addEducation}
                            className="h-7 text-[10px] gap-1 px-2.5 hover:bg-black/[0.04] dark:hover:bg-white/[0.06]"
                        >
                            <Plus className="w-3 h-3" /> Tambah Sekolah
                        </Button>
                    </div>

                    <div className="space-y-4">
                        {education.map((edu, idx) => (
                            <div key={idx} className="relative rounded-xl border border-border bg-muted/10 p-4 space-y-3">
                                <button
                                    onClick={() => removeEducation(idx)}
                                    className="absolute top-3 right-3 text-muted-foreground hover:text-rose-500 transition-colors"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                                
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-4">
                                    <div>
                                        <label className="text-[10px] font-semibold text-muted-foreground block mb-1">Nama Universitas / Sekolah</label>
                                        <input
                                            value={edu.institution}
                                            onChange={(e) => {
                                                const u = [...education];
                                                u[idx].institution = e.target.value;
                                                setEducation(u);
                                            }}
                                            className="w-full text-xs rounded-lg border border-border bg-background px-3 py-2 focus:outline-none"
                                            placeholder="Contoh: Universitas Bengkulu"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-semibold text-muted-foreground block mb-1">Lokasi</label>
                                        <input
                                            value={edu.location}
                                            onChange={(e) => {
                                                const u = [...education];
                                                u[idx].location = e.target.value;
                                                setEducation(u);
                                            }}
                                            className="w-full text-xs rounded-lg border border-border bg-background px-3 py-2"
                                            placeholder="Contoh: Bengkulu, Indonesia"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-semibold text-muted-foreground block mb-1">Gelar / Bidang Studi</label>
                                        <input
                                            value={edu.degree}
                                            onChange={(e) => {
                                                const u = [...education];
                                                u[idx].degree = e.target.value;
                                                setEducation(u);
                                            }}
                                            className="w-full text-xs rounded-lg border border-border bg-background px-3 py-2"
                                            placeholder="Contoh: Mahasiswa, Informatika"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-semibold text-muted-foreground block mb-1">Jurusan / Fokus</label>
                                        <input
                                            value={edu.major}
                                            onChange={(e) => {
                                                const u = [...education];
                                                u[idx].major = e.target.value;
                                                setEducation(u);
                                            }}
                                            className="w-full text-xs rounded-lg border border-border bg-background px-3 py-2"
                                            placeholder="Contoh: Rekayasa Perangkat Lunak"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-semibold text-muted-foreground block mb-1">Periode (Tanggal)</label>
                                        <input
                                            value={edu.period}
                                            onChange={(e) => {
                                                const u = [...education];
                                                u[idx].period = e.target.value;
                                                setEducation(u);
                                            }}
                                            className="w-full text-xs rounded-lg border border-border bg-background px-3 py-2"
                                            placeholder="Contoh: Agu 2022 - Sekarang"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-semibold text-muted-foreground block mb-1">IPK / Rata-rata</label>
                                        <input
                                            value={edu.gpa}
                                            onChange={(e) => {
                                                const u = [...education];
                                                u[idx].gpa = e.target.value;
                                                setEducation(u);
                                            }}
                                            className="w-full text-xs rounded-lg border border-border bg-background px-3 py-2"
                                            placeholder="Contoh: 3.86/4.00"
                                        />
                                    </div>
                                </div>
                            </div>
                        ))}
                        {education.length === 0 && (
                            <p className="text-xs text-muted-foreground italic text-center py-3">Belum ada riwayat pendidikan.</p>
                        )}
                    </div>
                </div>

                {/* 4. PENGALAMAN KERJA */}
                <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
                    <div className="flex items-center justify-between">
                        <h3 className="text-sm font-semibold flex items-center gap-2 text-foreground">
                            <Briefcase className="w-4 h-4 text-blue-400" />
                            4. Pengalaman Kerja
                        </h3>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={addWork}
                            className="h-7 text-[10px] gap-1 px-2.5 hover:bg-black/[0.04] dark:hover:bg-white/[0.06]"
                        >
                            <Plus className="w-3 h-3" /> Tambah Kerja
                        </Button>
                    </div>

                    <div className="space-y-4">
                        {workExperience.map((work, idx) => (
                            <div key={idx} className="relative rounded-xl border border-border bg-muted/10 p-4 space-y-3">
                                <button
                                    onClick={() => removeWork(idx)}
                                    className="absolute top-3 right-3 text-muted-foreground hover:text-rose-500 transition-colors"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                                
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-4">
                                    <div>
                                        <label className="text-[10px] font-semibold text-muted-foreground block mb-1">Nama Perusahaan / Organisasi</label>
                                        <input
                                            value={work.company}
                                            onChange={(e) => {
                                                const w = [...workExperience];
                                                w[idx].company = e.target.value;
                                                setWorkExperience(w);
                                            }}
                                            className="w-full text-xs rounded-lg border border-border bg-background px-3 py-2"
                                            placeholder="Contoh: Coding Camp 2026"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-semibold text-muted-foreground block mb-1">Lokasi</label>
                                        <input
                                            value={work.location}
                                            onChange={(e) => {
                                                const w = [...workExperience];
                                                w[idx].location = e.target.value;
                                                setWorkExperience(w);
                                            }}
                                            className="w-full text-xs rounded-lg border border-border bg-background px-3 py-2"
                                            placeholder="Contoh: Bengkulu, Indonesia"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-semibold text-muted-foreground block mb-1">Jabatan / Posisi</label>
                                        <input
                                            value={work.role}
                                            onChange={(e) => {
                                                const w = [...workExperience];
                                                w[idx].role = e.target.value;
                                                setWorkExperience(w);
                                            }}
                                            className="w-full text-xs rounded-lg border border-border bg-background px-3 py-2"
                                            placeholder="Contoh: AI Engineer"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-semibold text-muted-foreground block mb-1">Periode (Tanggal)</label>
                                        <input
                                            value={work.period}
                                            onChange={(e) => {
                                                const w = [...workExperience];
                                                w[idx].period = e.target.value;
                                                setWorkExperience(w);
                                            }}
                                            className="w-full text-xs rounded-lg border border-border bg-background px-3 py-2"
                                            placeholder="Contoh: Jan 2026 - Sekarang"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2 pt-2">
                                    <div className="flex items-center justify-between">
                                        <label className="text-[10px] font-semibold text-muted-foreground">Deskripsi Tugas / Pencapaian</label>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => addWorkBullet(idx)}
                                            className="h-6 text-[9px] text-primary px-2 hover:bg-primary/5"
                                        >
                                            + Tambah Poin
                                        </Button>
                                    </div>
                                    
                                    {work.bullets.map((b, bIdx) => (
                                        <div key={bIdx} className="flex gap-2 items-center">
                                            <input
                                                value={b}
                                                onChange={(e) => handleWorkBulletChange(idx, bIdx, e.target.value)}
                                                className="flex-1 text-xs rounded-lg border border-border bg-background px-3 py-1.5"
                                                placeholder="Tulis kontribusi..."
                                            />
                                            <button
                                                onClick={() => removeWorkBullet(idx, bIdx)}
                                                className="text-muted-foreground hover:text-rose-500 transition-colors"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                        {workExperience.length === 0 && (
                            <p className="text-xs text-muted-foreground italic text-center py-3">Belum ada riwayat pekerjaan.</p>
                        )}
                    </div>
                </div>

                {/* 5. PENGALAMAN ORGANISASI */}
                <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
                    <div className="flex items-center justify-between">
                        <h3 className="text-sm font-semibold flex items-center gap-2 text-foreground">
                            <Users className="w-4 h-4 text-violet-400" />
                            5. Pengalaman Organisasi
                        </h3>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={addOrg}
                            className="h-7 text-[10px] gap-1 px-2.5 hover:bg-black/[0.04] dark:hover:bg-white/[0.06]"
                        >
                            <Plus className="w-3 h-3" /> Tambah Organisasi
                        </Button>
                    </div>

                    <div className="space-y-4">
                        {orgExperience.map((org, idx) => (
                            <div key={idx} className="relative rounded-xl border border-border bg-muted/10 p-4 space-y-3">
                                <button
                                    onClick={() => removeOrg(idx)}
                                    className="absolute top-3 right-3 text-muted-foreground hover:text-rose-500 transition-colors"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                                
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-4">
                                    <div>
                                        <label className="text-[10px] font-semibold text-muted-foreground block mb-1">Nama Organisasi</label>
                                        <input
                                            value={org.organization}
                                            onChange={(e) => {
                                                const o = [...orgExperience];
                                                o[idx].organization = e.target.value;
                                                setOrgExperience(o);
                                            }}
                                            className="w-full text-xs rounded-lg border border-border bg-background px-3 py-2"
                                            placeholder="Contoh: MOSTANEER"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-semibold text-muted-foreground block mb-1">Lokasi</label>
                                        <input
                                            value={org.location}
                                            onChange={(e) => {
                                                const o = [...orgExperience];
                                                o[idx].location = e.target.value;
                                                setOrgExperience(o);
                                            }}
                                            className="w-full text-xs rounded-lg border border-border bg-background px-3 py-2"
                                            placeholder="Contoh: Universitas Bengkulu"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-semibold text-muted-foreground block mb-1">Divisi / Peran</label>
                                        <input
                                            value={org.role}
                                            onChange={(e) => {
                                                const o = [...orgExperience];
                                                o[idx].role = e.target.value;
                                                setOrgExperience(o);
                                            }}
                                            className="w-full text-xs rounded-lg border border-border bg-background px-3 py-2"
                                            placeholder="Contoh: Anggota Keuangan"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-semibold text-muted-foreground block mb-1">Periode (Tanggal)</label>
                                        <input
                                            value={org.period}
                                            onChange={(e) => {
                                                const o = [...orgExperience];
                                                o[idx].period = e.target.value;
                                                setOrgExperience(o);
                                            }}
                                            className="w-full text-xs rounded-lg border border-border bg-background px-3 py-2"
                                            placeholder="Contoh: Jan 2023 - Des 2023"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2 pt-2">
                                    <div className="flex items-center justify-between">
                                        <label className="text-[10px] font-semibold text-muted-foreground">Deskripsi Tugas / Kontribusi</label>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => addOrgBullet(idx)}
                                            className="h-6 text-[9px] text-primary px-2 hover:bg-primary/5"
                                        >
                                            + Tambah Poin
                                        </Button>
                                    </div>
                                    
                                    {org.bullets.map((b, bIdx) => (
                                        <div key={bIdx} className="flex gap-2 items-center">
                                            <input
                                                value={b}
                                                onChange={(e) => handleOrgBulletChange(idx, bIdx, e.target.value)}
                                                className="flex-1 text-xs rounded-lg border border-border bg-background px-3 py-1.5"
                                                placeholder="Tulis kontribusi..."
                                            />
                                            <button
                                                onClick={() => removeOrgBullet(idx, bIdx)}
                                                className="text-muted-foreground hover:text-rose-500 transition-colors"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                        {orgExperience.length === 0 && (
                            <p className="text-xs text-muted-foreground italic text-center py-3">Belum ada riwayat organisasi.</p>
                        )}
                    </div>
                </div>

                {/* 6. PELATIHAN / TRAINING */}
                <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
                    <div className="flex items-center justify-between">
                        <h3 className="text-sm font-semibold flex items-center gap-2 text-foreground">
                            <Award className="w-4 h-4 text-amber-400" />
                            6. Pelatihan & Bootcamp
                        </h3>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={addTraining}
                            className="h-7 text-[10px] gap-1 px-2.5 hover:bg-black/[0.04] dark:hover:bg-white/[0.06]"
                        >
                            <Plus className="w-3 h-3" /> Tambah Pelatihan
                        </Button>
                    </div>

                    <div className="space-y-4">
                        {training.map((t, idx) => (
                            <div key={idx} className="relative rounded-xl border border-border bg-muted/10 p-4 space-y-3">
                                <button
                                    onClick={() => removeTraining(idx)}
                                    className="absolute top-3 right-3 text-muted-foreground hover:text-rose-500 transition-colors"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                                
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-4">
                                    <div>
                                        <label className="text-[10px] font-semibold text-muted-foreground block mb-1">Judul Pelatihan</label>
                                        <input
                                            value={t.title}
                                            onChange={(e) => {
                                                const tr = [...training];
                                                tr[idx].title = e.target.value;
                                                setTraining(tr);
                                            }}
                                            className="w-full text-xs rounded-lg border border-border bg-background px-3 py-2"
                                            placeholder="Contoh: Coding Camp 2025"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-semibold text-muted-foreground block mb-1">Penyelenggara / Provider</label>
                                        <input
                                            value={t.provider}
                                            onChange={(e) => {
                                                const tr = [...training];
                                                tr[idx].provider = e.target.value;
                                                setTraining(tr);
                                            }}
                                            className="w-full text-xs rounded-lg border border-border bg-background px-3 py-2"
                                            placeholder="Contoh: DBS Foundation"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-semibold text-muted-foreground block mb-1">Lokasi</label>
                                        <input
                                            value={t.location}
                                            onChange={(e) => {
                                                const tr = [...training];
                                                tr[idx].location = e.target.value;
                                                setTraining(tr);
                                            }}
                                            className="w-full text-xs rounded-lg border border-border bg-background px-3 py-2"
                                            placeholder="Contoh: Bengkulu (Remote)"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-semibold text-muted-foreground block mb-1">Periode (Tanggal)</label>
                                        <input
                                            value={t.period}
                                            onChange={(e) => {
                                                const tr = [...training];
                                                tr[idx].period = e.target.value;
                                                setTraining(tr);
                                            }}
                                            className="w-full text-xs rounded-lg border border-border bg-background px-3 py-2"
                                            placeholder="Contoh: Feb 2025 - Juni 2025"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2 pt-2">
                                    <div className="flex items-center justify-between">
                                        <label className="text-[10px] font-semibold text-muted-foreground">Deskripsi / Hasil Pelatihan</label>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => addTrainingBullet(idx)}
                                            className="h-6 text-[9px] text-primary px-2 hover:bg-primary/5"
                                        >
                                            + Tambah Poin
                                        </Button>
                                    </div>
                                    
                                    {t.bullets.map((b, bIdx) => (
                                        <div key={bIdx} className="flex gap-2 items-center">
                                            <input
                                                value={b}
                                                onChange={(e) => handleTrainingBulletChange(idx, bIdx, e.target.value)}
                                                className="flex-1 text-xs rounded-lg border border-border bg-background px-3 py-1.5"
                                                placeholder="Tulis detail..."
                                            />
                                            <button
                                                onClick={() => removeTrainingBullet(idx, bIdx)}
                                                className="text-muted-foreground hover:text-rose-500 transition-colors"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                        {training.length === 0 && (
                            <p className="text-xs text-muted-foreground italic text-center py-3">Belum ada riwayat pelatihan.</p>
                        )}
                    </div>
                </div>

                {/* 7. KEAHLIAN / SKILLS */}
                <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
                    <h3 className="text-sm font-semibold flex items-center gap-2 text-foreground">
                        <Settings className="w-4 h-4 text-violet-400" />
                        7. Keahlian & Bahasa
                    </h3>
                    <div className="space-y-3">
                        <div>
                            <label className="text-xs font-semibold text-muted-foreground block mb-1">Soft Skills (Pisahkan dengan koma)</label>
                            <input
                                value={softSkills}
                                onChange={(e) => setSoftSkills(e.target.value)}
                                className="w-full text-xs rounded-xl border border-border bg-muted/20 px-3.5 py-2.5 focus:outline-none"
                                placeholder="Contoh: Manajemen Waktu, Berpikir Kritis, Komunikasi"
                            />
                        </div>
                        <div>
                            <label className="text-xs font-semibold text-muted-foreground block mb-1">Hard Skills (Pisahkan dengan koma)</label>
                            <input
                                value={hardSkills}
                                onChange={(e) => setHardSkills(e.target.value)}
                                className="w-full text-xs rounded-xl border border-border bg-muted/20 px-3.5 py-2.5 focus:outline-none"
                                placeholder="Contoh: Python, Machine Learning, Figma"
                            />
                        </div>
                        <div>
                            <label className="text-xs font-semibold text-muted-foreground block mb-1">Bahasa (Pisahkan dengan koma)</label>
                            <input
                                value={languages}
                                onChange={(e) => setLanguages(e.target.value)}
                                className="w-full text-xs rounded-xl border border-border bg-muted/20 px-3.5 py-2.5 focus:outline-none"
                                placeholder="Contoh: Bahasa Indonesia (Native), English (Intermediate)"
                            />
                        </div>
                    </div>
                </div>

                {/* 8. SERTIFIKAT */}
                <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
                    <div className="flex items-center justify-between">
                        <h3 className="text-sm font-semibold flex items-center gap-2 text-foreground">
                            <Award className="w-4 h-4 text-emerald-400" />
                            8. Sertifikat Penghargaan
                        </h3>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={addCertificate}
                            className="h-7 text-[10px] gap-1 px-2.5 hover:bg-black/[0.04] dark:hover:bg-white/[0.06]"
                        >
                            <Plus className="w-3 h-3" /> Tambah Sertifikat
                        </Button>
                    </div>

                    <div className="space-y-2">
                        {certifications.map((cert, idx) => (
                            <div key={idx} className="flex gap-2 items-center">
                                <input
                                    value={cert}
                                    onChange={(e) => handleCertChange(idx, e.target.value)}
                                    className="flex-1 text-xs rounded-lg border border-border bg-muted/10 px-3.5 py-2"
                                    placeholder="Contoh: Introduction to Git and GitHub (Dicoding) - 2024"
                                />
                                <button
                                    onClick={() => removeCertificate(idx)}
                                    className="text-muted-foreground hover:text-rose-500 transition-colors"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        ))}
                        {certifications.length === 0 && (
                            <p className="text-xs text-muted-foreground italic text-center py-3">Belum ada daftar sertifikat.</p>
                        )}
                    </div>
                </div>

                {/* Dynamic warning if profile has not synced */}
                {(!profile?.cv_data) && (
                    <div className="rounded-2xl border border-dashed border-violet-500/30 bg-violet-500/[0.03] p-4 flex items-start gap-3">
                        <CheckCircle2 className="w-5 h-5 text-violet-400 mt-0.5 shrink-0" />
                        <div>
                            <p className="text-xs font-semibold text-violet-300">CV Ter-auto fill!</p>
                            <p className="text-[11px] text-muted-foreground leading-relaxed mt-0.5">
                                Jika sebelumnya Anda sudah mengunggah CV PDF pada onboarding, sistem kami telah otomatis mengisi sebagian besar field di atas secara akurat menggunakan kecerdasan AI. Anda hanya perlu meninjau dan melengkapi informasi yang belum lengkap!
                            </p>
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
}

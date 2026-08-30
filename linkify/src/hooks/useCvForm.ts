"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

// ── Types ──
export type EducationItem = {
    id: string;
    institution: string;
    location: string;
    major: string;
    degree: string;
    period: string;
    gpa: string;
};

export type BulletItem = {
    id: string;
    text: string;
};

export type ExperienceItem = {
    id: string;
    company: string;
    role: string;
    location: string;
    period: string;
    bullets: BulletItem[];
};

export type OrgItem = {
    id: string;
    organization: string;
    role: string;
    location: string;
    period: string;
    bullets: BulletItem[];
};

export type TrainingItem = {
    id: string;
    title: string;
    provider: string;
    location: string;
    period: string;
    bullets: BulletItem[];
};

export type CertItem = {
    id: string;
    value: string;
};

export type CvSkills = {
    soft_skills?: string[];
    hard_skills?: string[];
    languages?: string[];
};

export type CvDataPayload = {
    summary?: string;
    education?: Omit<EducationItem, "id">[];
    work_experience?: { company: string; role: string; location: string; period: string; bullets: string[] }[];
    org_experience?: { organization: string; role: string; location: string; period: string; bullets: string[] }[];
    training?: { title: string; provider: string; location: string; period: string; bullets: string[] }[];
    skills?: CvSkills;
    certifications?: string[];
    email?: string;
    linkedin?: string;
};

export type ProfileLike = {
    github_username: string | null;
    bio_full_name: string | null;
    bio_birth_place?: string | null;
    bio_birth_date?: string | null;
    bio_address: string | null;
    bio_phone: string | null;
    merged_skills?: string[] | null;
    cv_data?: {
        summary?: string;
        education?: (Omit<EducationItem, "id"> & { id?: string })[];
        work_experience?: (Omit<ExperienceItem, "id" | "bullets"> & { id?: string; bullets?: string[] } )[];
        org_experience?: (Omit<OrgItem, "id" | "bullets"> & { id?: string; bullets?: string[] })[];
        training?: (Omit<TrainingItem, "id" | "bullets"> & { id?: string; bullets?: string[] })[];
        skills?: CvSkills;
        certifications?: string[];
        email?: string;
        linkedin?: string;
    } | null;
};

function toBulletItems(bullets?: string[] | null): BulletItem[] {
    if (!bullets || bullets.length === 0) return [{ id: crypto.randomUUID(), text: "" }];
    return bullets.map((b) => ({ id: crypto.randomUUID(), text: b ?? "" }));
}

function ensureBulletItems(raw: BulletItem[] | string[] | undefined): BulletItem[] {
    if (!raw || raw.length === 0) return [{ id: crypto.randomUUID(), text: "" }];
    // detect if already BulletItem[]
    if (typeof (raw as BulletItem[])[0] === "object" && (raw as any)[0]?.id && "text" in (raw as any)[0]) {
        return raw as BulletItem[];
    }
    return (raw as string[]).map((b) => ({ id: crypto.randomUUID(), text: b ?? "" }));
}

export function useCvForm(profile: ProfileLike | null | undefined) {
    // ── flat fields ──
    const [fullName, setFullName] = useState("");
    const [phone, setPhone] = useState("");
    const [email, setEmail] = useState("");
    const [address, setAddress] = useState("");
    const [linkedin, setLinkedin] = useState("");
    const [summary, setSummary] = useState("");

    const [bioBirthPlace, setBioBirthPlace] = useState("");
    const [bioBirthDate, setBioBirthDate] = useState("");

    const [education, setEducation] = useState<EducationItem[]>([]);
    const [workExperience, setWorkExperience] = useState<ExperienceItem[]>([]);
    const [orgExperience, setOrgExperience] = useState<OrgItem[]>([]);
    const [training, setTraining] = useState<TrainingItem[]>([]);

    const [softSkills, setSoftSkills] = useState("");
    const [hardSkills, setHardSkills] = useState("");
    const [languages, setLanguages] = useState("");
    const [certifications, setCertifications] = useState<CertItem[]>([]);

    // ── github sync (read-only) ──
    const githubUsername = profile?.github_username ?? null;
    const githubUrl = githubUsername ? `https://github.com/${githubUsername}` : "";

    // ── hydrate from profile ──
    useEffect(() => {
        if (!profile) return;

        setFullName(profile.bio_full_name || "");
        setPhone(profile.bio_phone || "");
        setAddress(profile.bio_address || "");
        setBioBirthPlace((profile.bio_birth_place as string) || "");
        setBioBirthDate((profile.bio_birth_date as string) || "");

        if (profile.cv_data) {
            const cd = profile.cv_data as any;
            setSummary(cd.summary || "");
            setEducation(
                (cd.education || []).map((item: any) => ({
                    id: item.id ?? crypto.randomUUID(),
                    institution: item.institution ?? "",
                    location: item.location ?? "",
                    major: item.major ?? "",
                    degree: item.degree ?? "",
                    period: item.period ?? "",
                    gpa: item.gpa ?? "",
                }))
            );
            setWorkExperience(
                (cd.work_experience || []).map((item: any) => ({
                    id: item.id ?? crypto.randomUUID(),
                    company: item.company ?? "",
                    role: item.role ?? "",
                    location: item.location ?? "",
                    period: item.period ?? "",
                    bullets: toBulletItems(item.bullets),
                }))
            );
            setOrgExperience(
                (cd.org_experience || []).map((item: any) => ({
                    id: item.id ?? crypto.randomUUID(),
                    organization: item.organization ?? "",
                    role: item.role ?? "",
                    location: item.location ?? "",
                    period: item.period ?? "",
                    bullets: toBulletItems(item.bullets),
                }))
            );
            setTraining(
                (cd.training || []).map((item: any) => ({
                    id: item.id ?? crypto.randomUUID(),
                    title: item.title ?? "",
                    provider: item.provider ?? "",
                    location: item.location ?? "",
                    period: item.period ?? "",
                    bullets: toBulletItems(item.bullets),
                }))
            );

            setSoftSkills(cd.skills?.soft_skills?.join(", ") || "");
            setHardSkills(cd.skills?.hard_skills?.join(", ") || "");
            setLanguages(cd.skills?.languages?.join(", ") || "");
            setCertifications(
                (cd.certifications || []).map((c: string) => ({ id: crypto.randomUUID(), value: c }))
            );
            setEmail(cd.email || "");
            setLinkedin(cd.linkedin || "");
        } else {
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

    // ── dirty guard (bio vs profile) ──
    const bioDirty = useMemo(() => {
        if (!profile) return false;
        return (
            (fullName || "") !== (profile.bio_full_name || "") ||
            (phone || "") !== (profile.bio_phone || "") ||
            (address || "") !== (profile.bio_address || "") ||
            (bioBirthPlace || "") !== ((profile.bio_birth_place as string) || "") ||
            (bioBirthDate || "") !== ((profile.bio_birth_date as string) || "")
        );
    }, [profile, fullName, phone, address, bioBirthPlace, bioBirthDate]);

    const bioFields: [string, string][] = useMemo(
        () => [
            ["cv-fullname", fullName],
            ["cv-phone", phone],
            ["cv-email", email],
            ["cv-address", address],
        ],
        [fullName, phone, email, address]
    );
    const bioFilledCount = useMemo(() => bioFields.filter(([, v]) => v.trim()).length, [bioFields]);
    const bioComplete = bioFilledCount === bioFields.length;

    // ── payload builder (bullets.filter(Boolean) + strip id) ──
    const getPayload = useCallback((): CvDataPayload => {
        const stripEducation = education.map(({ id, ...rest }) => rest);
        const stripWork = workExperience.map(({ id, bullets, ...rest }) => ({
            ...rest,
            bullets: bullets.map((b) => b.text.trim()).filter(Boolean),
        }));
        const stripOrg = orgExperience.map(({ id, bullets, ...rest }) => ({
            ...rest,
            bullets: bullets.map((b) => b.text.trim()).filter(Boolean),
        }));
        const stripTraining = training.map(({ id, bullets, ...rest }) => ({
            ...rest,
            bullets: bullets.map((b) => b.text.trim()).filter(Boolean),
        }));

        return {
            summary,
            education: stripEducation as any,
            work_experience: stripWork as any,
            org_experience: stripOrg as any,
            training: stripTraining as any,
            skills: {
                soft_skills: softSkills.split(",").map((s) => s.trim()).filter(Boolean),
                hard_skills: hardSkills.split(",").map((s) => s.trim()).filter(Boolean),
                languages: languages.split(",").map((s) => s.trim()).filter(Boolean),
            },
            certifications: certifications.map((c) => c.value.trim()).filter(Boolean),
            email,
            linkedin,
        };
    }, [education, workExperience, orgExperience, training, summary, softSkills, hardSkills, languages, certifications, email, linkedin]);

    const getBiodataPayload = useCallback(
        () => ({
            bio_full_name: fullName,
            bio_phone: phone,
            bio_address: address,
            bio_birth_place: bioBirthPlace || null,
            bio_birth_date: bioBirthDate || null,
        }),
        [fullName, phone, address, bioBirthPlace, bioBirthDate]
    );

    return {
        // raw state
        fullName, setFullName,
        phone, setPhone,
        email, setEmail,
        address, setAddress,
        linkedin, setLinkedin,
        summary, setSummary,
        bioBirthPlace, setBioBirthPlace,
        bioBirthDate, setBioBirthDate,
        education, setEducation,
        workExperience, setWorkExperience,
        orgExperience, setOrgExperience,
        training, setTraining,
        softSkills, setSoftSkills,
        hardSkills, setHardSkills,
        languages, setLanguages,
        certifications, setCertifications,
        // derived
        githubUsername,
        githubUrl,
        bioDirty,
        bioFields,
        bioFilledCount,
        bioComplete,
        highlightSave: bioComplete && bioDirty,
        getPayload,
        getBiodataPayload,
    };
}

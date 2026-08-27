"""
Penilaian dan perakitan prompt untuk AI screening kandidat.

Modul murni: tanpa HTTP, database, atau environment. Dua jaminan keras hidup
di sini (bukan di prompt) karena instruksi ke model saja tidak cukup:
skor dijepit ke anchor +/- MAX_DEVIATION, dan verdict diturunkan dari skor.
"""

from __future__ import annotations

# Batas simpangan skor AI terhadap anchor algoritmik (Jaccard)
MAX_DEVIATION = 20
# Ambang verdict. Diturunkan dari skor supaya tidak pernah bertentangan.
INTERVIEW_THRESHOLD = 60
CONSIDER_THRESHOLD = 35


def derive_verdict(score: int | float) -> str:
    """Verdict dihitung dari skor, bukan dipilih model."""
    if score >= INTERVIEW_THRESHOLD:
        return "interview"
    if score >= CONSIDER_THRESHOLD:
        return "consider"
    return "reject"


def clamp_score(score: int | float, anchor: int | None) -> int:
    """
    Jepit skor ke rentang anchor +/- MAX_DEVIATION, selalu di dalam 0-100.

    anchor None berarti lowongan tidak punya required_skills sehingga anchor
    tidak bermakna — skor dibiarkan apa adanya.
    """
    value = int(round(score))
    if anchor is None:
        return max(0, min(100, value))
    low = max(0, anchor - MAX_DEVIATION)
    high = min(100, anchor + MAX_DEVIATION)
    return max(low, min(high, value))


# Maksimal baris bukti yang dikirim ke model
MAX_PROVEN_SKILLS = 10

# Skill yang tidak mungkin terlihat dari statistik bahasa GitHub. Disaring dari
# blok "di luar jangkauan" supaya model tidak punya bahan untuk menyebutnya
# kekurangan — statistik bahasa memang tidak bisa mengukurnya.
TOOLING_SKILLS = frozenset(
    {
        "git", "github", "gitlab", "docker", "kubernetes", "ci/cd", "cicd",
        "jenkins", "github actions", "jira", "figma", "postman", "linux",
        "bash", "shell", "agile", "scrum", "trello", "notion", "slack",
    }
)


def build_proven_block(verified_skills: list[dict]) -> str:
    """Baris bukti per bahasa, satu per baris."""
    rows = []
    for item in (verified_skills or [])[:MAX_PROVEN_SKILLS]:
        evidence = item.get("evidence") or {}
        last_used = evidence.get("last_used") or "tidak diketahui"
        rows.append(
            f"    - {item.get('skill')}: {item.get('level')} | "
            f"{evidence.get('repos', 0)} repo, "
            f"{evidence.get('own_commits', 0)} commit sendiri, "
            f"terakhir {last_used}"
        )
    if not rows:
        return "    (tidak ada bahasa dengan bukti commit publik)"
    return "\n".join(rows)


def build_unverifiable_block(
    merged_skills: list[str],
    verified_skills: list[dict],
) -> str:
    """Skill CV yang berada di luar jangkauan verifikasi bahasa."""
    proven = {
        str(item.get("skill", "")).strip().lower()
        for item in (verified_skills or [])
    }
    outside = [
        skill
        for skill in (merged_skills or [])
        if isinstance(skill, str)
        and skill.strip()
        and skill.strip().lower() not in proven
        and skill.strip().lower() not in TOOLING_SKILLS
    ]
    return ", ".join(outside) if outside else "tidak ada"


def build_activity_block(signals: dict | None) -> str:
    """Ringkasan angka aktivitas GitHub — menggantikan dump JSON mentah."""
    data = signals if isinstance(signals, dict) else {}
    return (
        f"repo publik {data.get('public_repos', 0)}, "
        f"dianalisis {data.get('repos_analyzed', 0)}, "
        f"total commit {data.get('commits', 0)}, "
        f"stars {data.get('stars', 0)}"
    )


# Batas panjang CV yang dikirim ke model
CV_DATA_CHAR_CAP = 2500
# Dimasukkan ke fingerprint cache. Naikkan setiap kali prompt berubah agar
# hasil lama tidak tercampur dengan hasil prompt baru.
PROMPT_VERSION = "v2"


def build_screening_prompt(
    *,
    job_title: str,
    job_company: str,
    job_description: str,
    required_skills: list[str],
    min_experience: str = "",
    min_education: str = "",
    work_type: str = "",
    salary: str = "",
    cv_json: str,
    verified_skills: list[dict],
    merged_skills: list[str],
    signals: dict | None,
    anchor: int | None,
    matched_note: str,
    missing_note: str,
) -> str:
    """Rakit prompt screening. CV dan GitHub dinilai berimbang."""
    anchor_block = ""
    if anchor is not None:
        low = max(0, anchor - MAX_DEVIATION)
        high = min(100, anchor + MAX_DEVIATION)
        anchor_block = f"""
    --- DETERMINISTIC ANCHOR ---
    Algorithmic skill-match = {anchor}% (matched: {matched_note}; missing: {missing_note}).
    match_score WAJIB berada di rentang {low}-{high}. Anchor adalah titik awal:
    naik hanya bila ada bukti pendukung, turun bila ada risiko nyata.
"""

    return f"""
    You are an expert AI Recruiting screener. Assess how well this candidate fits the job.
    Nilai kandidat dari CV DAN GitHub secara berimbang.

    --- JOB ---
    Title: {job_title}
    Company: {job_company}
    Requirements: {job_description}
    Required Skills: {", ".join(required_skills or []) or "tidak disebutkan"}
    Min Experience: {min_experience or "tidak disebutkan"}
    Min Education: {min_education or "tidak disebutkan"}
    Work Type: {work_type or "tidak disebutkan"}
    Salary: {salary or "tidak disebutkan"}

    --- CV KANDIDAT ---
    {cv_json[:CV_DATA_CHAR_CAP]}

    --- BAHASA YANG TERBUKTI DARI COMMIT PUBLIK ---
{build_proven_block(verified_skills)}

    --- DI LUAR JANGKAUAN VERIFIKASI ---
    {build_unverifiable_block(merged_skills, verified_skills)}

    PENTING: sistem HANYA bisa memverifikasi BAHASA PEMROGRAMAN dari commit di
    repo publik. Framework, styling, layanan cloud, tooling, dan skill non-kode
    TIDAK MUNGKIN terdeteksi - begitu juga seluruh pekerjaan di repo privat atau
    repo perusahaan.
    - JANGAN menyebut skill mana pun "tidak terbukti" atau "diragukan" hanya
      karena tidak muncul di daftar bahasa. Ketiadaan bukti BUKAN bukti ketiadaan.
    - JANGAN membahas tooling (Git, Docker, CI/CD) sebagai kekurangan.
    - Nilai skill tersebut dari CV dan pengalaman kerja seperti biasa.
    - Kamu BOLEH menilai kewajaran klaim lewat bahasa dasarnya (klaim React lebih
      masuk akal bila TypeScript/JavaScript terbukti).

    --- AKTIVITAS GITHUB ---
    {build_activity_block(signals)}
{anchor_block}
    --- RULES ---
    - Sebutkan angka bukti (repo/commit) saat memuji skill yang memang terbukti.
    - Jangan mengarang. Kalau tidak ada datanya, tulis "tidak disebutkan".
    - Respond in Bahasa Indonesia.

    Return ONLY valid JSON matching this exact structure (no markdown, no code blocks):
    {{
      "match_score": 55,
      "recommendation": "consider",
      "reasoning": "...",
      "strengths": ["..."],
      "weaknesses": ["..."]
    }}
    `recommendation` must be exactly one of: "interview", "consider", "reject".
"""

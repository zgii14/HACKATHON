"""Klasifikasi kategori job. Dipakai saat seed, recruiter post, scrape, dan backfill.

Kategori adalah SINGLE SOURCE relevansi minat kandidat. Jangan pernah kembali ke
heuristik ">=1 skill overlap" — itu membuat minat backend menarik hampir semua job
karena Python/REST API/Git muncul di mana-mana (47 dari 56 job seed).
"""

from __future__ import annotations

from app.services.matching import normalize_skill

VALID_CATEGORIES: tuple[str, ...] = (
    "backend", "frontend", "fullstack", "mobile", "ai_ml", "data",
    "devops", "qa", "security", "blockchain", "game", "iot",
)

# Dicek berurutan; match pertama menang.
TITLE_RULES: tuple[tuple[tuple[str, ...], tuple[str, ...]], ...] = (
    (("full stack", "fullstack", "full-stack"), ("fullstack", "backend", "frontend")),
    (("mlops",), ("ai_ml", "devops")),
    (("machine learning", "ml engineer", "nlp", "computer vision", "ai research",
      "recommendation system", "data scientist", "deep learning"), ("ai_ml",)),
    (("data engineer", "data analyst", "analytics", "business intelligence",
      "data platform", "data warehouse"), ("data",)),
    (("sdet", "qa ", "qa)", "quality assurance", "test engineer",
      "automation engineer"), ("qa",)),
    (("cybersecurity", "security"), ("security",)),
    (("blockchain", "web3", "solidity"), ("blockchain",)),
    (("game", "unity", "ar/vr", "unreal"), ("game",)),
    (("iot", "embedded", "firmware"), ("iot",)),
    (("devops", "sre", "site reliability", "cloud engineer",
      "infrastructure", "platform engineer"), ("devops",)),
    (("android", "ios ", "ios)", "flutter", "react native", "mobile"), ("mobile",)),
    (("frontend", "front-end", "ui engineer", "web designer"), ("frontend",)),
    (("backend", "back-end", "api engineer"), ("backend",)),
)

# Skill terlalu umum untuk menentukan bidang.
GENERIC_SKILLS: frozenset[str] = frozenset({
    "git", "rest api", "sql", "docker", "linux", "bash", "python",
    "javascript", "typescript", "postgresql", "mysql", "html", "css",
})

# Skill khas per kategori (INTEREST_SKILL_MAP lama dikurangi GENERIC_SKILLS).
DISTINCTIVE_SKILLS: dict[str, frozenset[str]] = {
    "backend": frozenset({"fastapi", "django", "flask", "node.js", "go", "java",
                          "spring boot", "php", "laravel", "rust", "graphql",
                          "grpc", "microservices", "rabbitmq", "kafka"}),
    "frontend": frozenset({"react", "vue", "angular", "next.js", "nuxt.js",
                           "svelte", "tailwind css", "vite", "rxjs"}),
    "fullstack": frozenset(),  # hanya via title rule
    "mobile": frozenset({"flutter", "dart", "react native", "kotlin", "android",
                         "swift", "ios", "firebase", "xcode"}),
    "ai_ml": frozenset({"machine learning", "deep learning", "tensorflow", "pytorch",
                        "scikit-learn", "nlp", "computer vision", "hugging face",
                        "llm", "generative ai", "transformers", "opencv", "mlflow"}),
    "data": frozenset({"pandas", "apache spark", "bigquery", "dbt", "airflow",
                       "power bi", "tableau", "data warehouse", "etl", "looker", "excel"}),
    "devops": frozenset({"kubernetes", "aws", "gcp", "azure", "terraform",
                         "ci/cd", "nginx", "prometheus", "grafana"}),
    "qa": frozenset({"selenium", "playwright", "jest", "postman", "cypress",
                     "pytest", "testing", "jmeter"}),
    "security": frozenset({"networking", "penetration testing", "siem",
                           "cybersecurity", "firewall"}),
    "blockchain": frozenset({"solidity", "web3.js", "ethers.js", "hardhat", "smart contract"}),
    "game": frozenset({"unity", "c#", "unreal", "ar kit", "opengl", "3d modeling"}),
    "iot": frozenset({"c", "c++", "mqtt", "embedded"}),
}

MIN_VOTES = 2


def sanitize_categories(value) -> list[str]:
    """Bersihkan input kategori dari sumber tak dipercaya (payload recruiter, DB lama)."""
    if not isinstance(value, (list, tuple, set)):
        return []
    return sorted({v for v in value if isinstance(v, str) and v in VALID_CATEGORIES})


def classify_job_categories(title: str, required_skills) -> list[str]:
    """Tebak kategori dari judul dulu, baru voting skill khas. [] = tak terklasifikasi.

    Job tak terklasifikasi hanya muncul di mode "all", tidak pernah diklaim
    relevan dengan bidang minat tertentu.
    """
    haystack = f" {(title or '').strip().lower()} "
    for needles, cats in TITLE_RULES:
        if any(n in haystack for n in needles):
            return sorted(set(cats))

    canon = {
        normalize_skill(s)
        for s in (required_skills or [])
        if isinstance(s, str) and s.strip()
    } - GENERIC_SKILLS

    scores = {
        cat: len(canon & skills)
        for cat, skills in DISTINCTIVE_SKILLS.items()
        if canon & skills
    }
    if not scores:
        return []
    top = max(scores.values())
    if top < MIN_VOTES:
        return sorted({max(scores, key=lambda c: (scores[c], c))})
    return sorted({c for c, v in scores.items() if v == top})


def backfill_job_categories(db) -> int:
    """Isi categories untuk job lama (recruiter/scrape/seed versi lama).

    Idempoten: hanya menyentuh baris yang kategorinya belum terpakai, jadi aman
    dipanggil tiap startup. Return jumlah baris yang diproses.

    Filter dilakukan di Python, BUKAN di SQL: kolom JSON menyimpan None sebagai
    JSON 'null' (bukan SQL NULL) sehingga `IS NULL` melewatkan baris tersebut,
    dan perbandingan `== []` bergantung dialek. Tabel jobs kecil dan ini hanya
    jalan sekali saat startup.
    """
    from app.models import Job

    pending = [job for job in db.query(Job).all() if not sanitize_categories(job.categories)]
    for job in pending:
        job.categories = classify_job_categories(job.title, job.required_skills)
    if pending:
        db.commit()
    return len(pending)


# Kamus alias skill → nama kanonik (lowercase semua)
# Jika skill yang diinput cocok dengan alias, akan dikonversi ke nama kanonik
SKILL_ALIASES: dict[str, str] = {
    # JavaScript ecosystem
    "js": "javascript",
    "javascript": "javascript",
    "es6": "javascript",
    "vanilla js": "javascript",
    "vanillajs": "javascript",
    "reactjs": "react",
    "react.js": "react",
    "vuejs": "vue",
    "vue.js": "vue",
    "angular.js": "angular",
    "angularjs": "angular",
    "node": "node.js",
    "nodejs": "node.js",
    "node js": "node.js",
    "expressjs": "express.js",
    "nextjs": "next.js",
    "next js": "next.js",
    "nuxtjs": "nuxt.js",
    "nuxt js": "nuxt.js",
    "ts": "typescript",
    "nestjs": "nest.js",
    "nest js": "nest.js",

    # Python ecosystem
    "py": "python",
    "python3": "python",
    "django rest": "django",
    "flask api": "flask",
    "fastapi": "fastapi",
    "scikit learn": "scikit-learn",
    "sklearn": "scikit-learn",

    # Database
    "postgres": "postgresql",
    "pg": "postgresql",
    "psql": "postgresql",
    "mongo": "mongodb",
    "mongo db": "mongodb",
    "mysql db": "mysql",
    "mssql": "sql server",
    "ms sql": "sql server",
    "sqlite3": "sqlite",
    "elastic": "elasticsearch",

    # Go
    "golang": "go",
    "go lang": "go",

    # Java
    "springboot": "spring boot",
    "spring": "spring boot",

    # Mobile
    "flutter dart": "flutter",
    "react-native": "react native",

    # DevOps / Cloud
    "k8s": "kubernetes",
    "kube": "kubernetes",
    "aws cloud": "aws",
    "amazon web services": "aws",
    "google cloud": "gcp",
    "gcloud": "gcp",
    "google cloud platform": "gcp",
    "azure cloud": "azure",
    "microsoft azure": "azure",
    "ci/cd": "ci/cd",
    "cicd": "ci/cd",
    "github actions": "ci/cd",

    # AI / ML
    "tensorflow": "tensorflow",
    "tf": "tensorflow",
    "pytorch": "pytorch",
    "torch": "pytorch",
    "ml": "machine learning",
    "deep learning": "deep learning",
    "dl": "deep learning",
    "nlp": "nlp",
    "natural language processing": "nlp",
    "computer vision": "computer vision",
    # CATATAN: "cv" SENGAJA tidak di-alias → "computer vision"
    # karena "CV" dalam konteks profil developer = Curriculum Vitae!

    # Web general
    "html5": "html",
    "css3": "css",
    "sass": "css",
    "scss": "css",
    "tailwind": "tailwind css",
    "tailwindcss": "tailwind css",
    "rest": "rest api",
    "restful": "rest api",
    "restful api": "rest api",
    "graphql api": "graphql",

    # Version Control
    # CATATAN: github/gitlab tidak di-alias ke "git" agar keduanya dicatat terpisah
    "gitlab": "gitlab",
    "bitbucket": "bitbucket",

    # Other
    "linux os": "linux",
    "ubuntu": "linux",
    "bash scripting": "bash",
    "shell scripting": "bash",
    "redis cache": "redis",
    "rabbit mq": "rabbitmq",
}


def normalize_skill(s: str) -> str:
    """Normalisasi skill: lowercase + resolusi alias."""
    key = s.strip().lower()
    return SKILL_ALIASES.get(key, key)


def normalize_skill_set(skills: list[str]) -> set[str]:
    """Konversi list skill menjadi set yang sudah dinormalisasi."""
    return {normalize_skill(x) for x in skills if isinstance(x, str) and x.strip()}


def jaccard_score(candidate: list[str], required: list[str]) -> float:
    """
    Hitung skor kecocokan kandidat vs job.

    Menggunakan Recall-based scoring:
        skor = (skill kandidat ∩ skill required) / skill required

    Kenapa bukan Jaccard (intersection/union)?
    - Jaccard menghukum kandidat yang punya banyak skill di luar job
    - Recall lebih fair: fokus ke berapa % kebutuhan job yang terpenuhi
    - Skill Extra kandidat tidak mengurangi skor
    """
    ca = normalize_skill_set(candidate)
    rq = normalize_skill_set(required)
    if not rq:
        return 0.0
    inter = ca & rq
    return len(inter) / len(rq)


def explain_match(candidate: list[str], required: list[str]) -> tuple[list[str], list[str]]:
    ca = normalize_skill_set(candidate)
    rq = normalize_skill_set(required)
    inter = ca & rq
    missing = [x for x in required if isinstance(x, str) and normalize_skill(x) not in ca]
    reasons: list[str] = []
    if inter:
        shown = sorted(inter)[:8]
        reasons.append(f"Skill yang cocok: {', '.join(shown)}")
    if missing:
        reasons.append(f"Skill yang perlu dikembangkan: {', '.join(missing[:6])}")
    return reasons, missing


def skill_gap(candidate: list[str], required: list[str]) -> list[str]:
    ca = normalize_skill_set(candidate)
    missing: list[str] = []
    for x in required:
        if not isinstance(x, str) or not x.strip():
            continue
        if normalize_skill(x) not in ca:
            missing.append(x.strip())
    return missing

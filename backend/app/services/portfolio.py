from __future__ import annotations

from typing import Any


PORTFOLIO_THEMES = {"editorial", "developer", "professional"}
PORTFOLIO_LANGUAGES = {"id", "en"}
MAX_PROJECTS = 6

_PROJECT_FIELDS = {
    "repo_name",
    "url",
    "description",
    "tech_stack",
    "stars",
    "own_commits",
}
_EXPERIENCE_FIELDS = {"company", "role", "location", "period", "bullets"}
_EDUCATION_FIELDS = {"institution", "location", "major", "degree", "period", "gpa"}
_PUBLIC_CONTENT_FIELDS = {
    "name",
    "headline",
    "bio",
    "language",
    "theme",
    "projects",
    "skills",
    "experience",
    "education",
    "certifications",
    "contacts",
    "sections",
    "ai_enhanced",
}


def _as_list(value: Any) -> list:
    return value if isinstance(value, list) else []


def _dedupe_strings(values: list[Any], limit: int = 50) -> list[str]:
    output: list[str] = []
    seen: set[str] = set()
    for value in values:
        if not isinstance(value, str) or not value.strip():
            continue
        clean = value.strip()
        key = clean.casefold()
        if key not in seen:
            seen.add(key)
            output.append(clean)
        if len(output) >= limit:
            break
    return output


def rank_repositories(repositories: Any, limit: int = MAX_PROJECTS) -> list[dict]:
    candidates = [
        repo
        for repo in _as_list(repositories)
        if isinstance(repo, dict)
        and not repo.get("fork")
        and isinstance(repo.get("name"), str)
        and repo.get("name", "").strip()
        and isinstance(repo.get("html_url"), str)
        and repo.get("html_url", "").startswith("https://github.com/")
    ]

    def score(repo: dict) -> tuple[int, int, str]:
        stars = repo.get("stars") if isinstance(repo.get("stars"), int) else 0
        commits = repo.get("own_commits") if isinstance(repo.get("own_commits"), int) else 0
        pushed = repo.get("pushed_at") if isinstance(repo.get("pushed_at"), str) else ""
        return stars, commits, pushed

    return sorted(candidates, key=score, reverse=True)[: max(0, min(limit, MAX_PROJECTS))]


def select_repositories(repositories: Any, repo_names: list[str] | None) -> list[dict]:
    if not repo_names:
        return rank_repositories(repositories)
    if len(repo_names) > MAX_PROJECTS or len(set(repo_names)) != len(repo_names):
        raise ValueError("Pilih maksimal enam repository unik.")
    available = {
        repo["name"]: repo
        for repo in _as_list(repositories)
        if isinstance(repo, dict)
        and not repo.get("fork")
        and isinstance(repo.get("name"), str)
        and isinstance(repo.get("html_url"), str)
        and repo.get("html_url", "").startswith("https://github.com/")
    }
    if any(name not in available for name in repo_names):
        raise ValueError("Pilihan repository tidak valid.")
    return [available[name] for name in repo_names]


def _fallback_project(repo: dict, language: str) -> dict:
    tech_stack = _dedupe_strings(list((repo.get("languages") or {}).keys()), 8)
    name = repo["name"].strip()
    stack_label = ", ".join(tech_stack)
    if language == "en":
        description = f"A GitHub project built with {stack_label}." if stack_label else f"Public GitHub project: {name}."
    else:
        description = f"Proyek GitHub yang dibangun dengan {stack_label}." if stack_label else f"Proyek GitHub publik: {name}."
    return {
        "repo_name": name,
        "url": repo["html_url"],
        "description": description,
        "tech_stack": tech_stack,
        "stars": max(int(repo.get("stars") or 0), 0),
        "own_commits": max(int(repo.get("own_commits") or 0), 0),
    }


def build_fallback_draft(
    cv_data: dict | None,
    github_signals: dict | None,
    verified_skills: list | None,
    full_name: str | None,
    language: str,
) -> dict | None:
    if not isinstance(cv_data, dict) or not cv_data or not isinstance(github_signals, dict) or not github_signals:
        return None
    language = language if language in PORTFOLIO_LANGUAGES else "id"
    skills_data = cv_data.get("skills") if isinstance(cv_data.get("skills"), dict) else {}
    hard_skills = _as_list(skills_data.get("hard_skills"))
    github_languages = list((github_signals.get("languages") or {}).keys())
    skills = _dedupe_strings(hard_skills + github_languages)
    verified_names = [
        item.get("skill")
        for item in _as_list(verified_skills)
        if isinstance(item, dict)
    ]
    primary = _dedupe_strings(verified_names + skills, 3)
    joined = ", ".join(primary)
    name = (full_name or github_signals.get("name") or github_signals.get("username") or "Developer").strip()
    if language == "en":
        headline = f"Developer focused on {joined}" if joined else "Developer building useful digital products"
    else:
        headline = f"Developer dengan fokus {joined}" if joined else "Developer yang membangun produk digital bermanfaat"

    projects = [
        _fallback_project(repo, language)
        for repo in rank_repositories(github_signals.get("repos_detail"))
    ]
    github_username = github_signals.get("username")
    contacts = {
        "github": {
            "value": f"https://github.com/{github_username}" if github_username else "",
            "enabled": False,
        },
        "linkedin": {"value": cv_data.get("linkedin") or "", "enabled": False},
        "email": {"value": cv_data.get("email") or "", "enabled": False},
        "whatsapp": {"value": "", "enabled": False},
        "website": {"value": "", "enabled": False},
    }
    return {
        "name": name,
        "headline": headline,
        "bio": str(cv_data.get("summary") or "").strip(),
        "language": language,
        "theme": "professional",
        "projects": projects,
        "skills": skills,
        "experience": _as_list(cv_data.get("work_experience")),
        "education": _as_list(cv_data.get("education")),
        "certifications": _dedupe_strings(_as_list(cv_data.get("certifications")), 20),
        "contacts": contacts,
        "sections": {
            "projects": bool(projects),
            "skills": bool(skills),
            "experience": bool(cv_data.get("work_experience")),
            "education": bool(cv_data.get("education")),
            "certifications": bool(cv_data.get("certifications")),
        },
        "ai_enhanced": False,
    }


def validate_publish(content: dict | None) -> str | None:
    if not isinstance(content, dict) or not (content.get("name") or content.get("headline")):
        return "Tambahkan nama atau headline sebelum publish."
    if not (content.get("projects") or content.get("experience") or content.get("education")):
        return "Tampilkan minimal satu proyek, pengalaman, atau pendidikan."
    return None


def merge_draft(current: dict | None, patch: dict) -> dict:
    merged = dict(current or {})
    for key, value in patch.items():
        if key != "save_mode":
            merged[key] = value
    return merged


def _select_fields(item: Any, allowed: set[str]) -> dict:
    if not isinstance(item, dict):
        return {}
    return {key: item[key] for key in allowed if key in item}


def _public_contacts(value: Any) -> dict:
    if not isinstance(value, dict):
        return {}
    output: dict[str, str] = {}
    for key in ("github", "linkedin", "email", "whatsapp", "website"):
        entry = value.get(key)
        if isinstance(entry, dict) and entry.get("enabled") is True and isinstance(entry.get("value"), str):
            output[key] = entry["value"].strip()
    return output


def public_view(
    public_id: str,
    content: dict | None,
    verified_skills: list | None,
    has_photo: bool,
) -> dict:
    source = content if isinstance(content, dict) else {}
    safe = {key: source[key] for key in _PUBLIC_CONTENT_FIELDS if key in source}
    for key in ("name", "headline", "bio"):
        safe[key] = source.get(key) if isinstance(source.get(key), str) else ""
    safe["theme"] = source.get("theme") if source.get("theme") in PORTFOLIO_THEMES else "professional"
    safe["language"] = source.get("language") if source.get("language") in PORTFOLIO_LANGUAGES else "id"
    safe["projects"] = [
        _select_fields(item, _PROJECT_FIELDS)
        for item in _as_list(source.get("projects"))[:MAX_PROJECTS]
        if isinstance(item, dict)
    ]
    safe["experience"] = [
        _select_fields(item, _EXPERIENCE_FIELDS)
        for item in _as_list(source.get("experience"))
        if isinstance(item, dict)
    ]
    safe["education"] = [
        _select_fields(item, _EDUCATION_FIELDS)
        for item in _as_list(source.get("education"))
        if isinstance(item, dict)
    ]
    safe["contacts"] = _public_contacts(source.get("contacts"))
    safe["skills"] = _dedupe_strings(_as_list(source.get("skills")), 50)
    safe["certifications"] = _dedupe_strings(_as_list(source.get("certifications")), 30)
    sections = source.get("sections") if isinstance(source.get("sections"), dict) else {}
    safe["sections"] = {
        key: sections.get(key) is not False
        for key in ("projects", "skills", "experience", "education", "certifications")
    }
    safe.pop("verified_skills", None)
    system_verified: list[dict] = []
    for item in _as_list(verified_skills):
        if not isinstance(item, dict) or not isinstance(item.get("skill"), str):
            continue
        safe_item = _select_fields(item, {"skill", "level", "score"})
        evidence = _select_fields(
            item.get("evidence"),
            {"repos", "own_commits", "last_used", "confidence", "repo_names", "repo_urls"},
        )
        if evidence:
            safe_item["evidence"] = evidence
        system_verified.append(safe_item)
    return {
        "public_id": public_id,
        "content": safe,
        "verified_skills": system_verified,
        "has_photo": bool(has_photo),
    }

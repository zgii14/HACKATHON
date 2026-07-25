"""Render cv_data terstruktur menjadi PDF ATS-friendly menggunakan reportlab.

Dipakai saat kandidat memilih preferensi CV = "form": recruiter menerima
versi terstruktur (bukan PDF asli yang diupload). Layout satu kolom, heading
tegas, tanpa tabel/gambar agar ramah parser ATS.
"""

from io import BytesIO
from html import escape

from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import (
    HRFlowable,
    ListFlowable,
    ListItem,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
)


def _styles() -> dict:
    base = getSampleStyleSheet()
    return {
        "name": ParagraphStyle(
            "CVName", parent=base["Title"], fontSize=20, spaceAfter=2, leading=24,
        ),
        "contact": ParagraphStyle(
            "CVContact", parent=base["Normal"], fontSize=9.5, alignment=TA_CENTER,
            textColor="#444444", spaceAfter=8,
        ),
        "section": ParagraphStyle(
            "CVSection", parent=base["Heading2"], fontSize=12, spaceBefore=10,
            spaceAfter=2, textColor="#1a1a1a",
        ),
        "role": ParagraphStyle(
            "CVRole", parent=base["Normal"], fontSize=10.5, spaceAfter=0, leading=13,
        ),
        "meta": ParagraphStyle(
            "CVMeta", parent=base["Normal"], fontSize=9, textColor="#666666",
            spaceAfter=2, leading=12,
        ),
        "body": ParagraphStyle(
            "CVBody", parent=base["Normal"], fontSize=9.5, leading=13, spaceAfter=2,
        ),
        "bullet": ParagraphStyle(
            "CVBullet", parent=base["Normal"], fontSize=9.5, leading=12.5,
        ),
    }


def _clean(v) -> str:
    return escape(str(v).strip()) if v else ""


def _section_header(title: str, st: dict) -> list:
    return [
        Paragraph(title.upper(), st["section"]),
        HRFlowable(width="100%", thickness=0.6, color="#cccccc", spaceAfter=4),
    ]


def _bullets(items, st: dict):
    rows = [ListItem(Paragraph(_clean(b), st["bullet"]), leftIndent=8)
            for b in (items or []) if b and str(b).strip()]
    if not rows:
        return None
    return ListFlowable(rows, bulletType="bullet", start="•", leftIndent=10, bulletFontSize=7)


def render_cv_pdf(cv_data: dict, bio: dict) -> bytes:
    """cv_data: dict cv_data profil. bio: {full_name, phone, address, email, linkedin}.
    Return PDF sebagai bytes."""
    cv_data = cv_data or {}
    bio = bio or {}
    st = _styles()
    story: list = []

    # ── Header: nama + kontak ────────────────────────────────────────────────
    name = _clean(bio.get("full_name")) or _clean(bio.get("email")) or "Kandidat"
    story.append(Paragraph(name, st["name"]))

    contact_bits = [
        _clean(bio.get("email")) or _clean(cv_data.get("email")),
        _clean(bio.get("phone")),
        _clean(bio.get("address")),
        _clean(cv_data.get("linkedin")),
    ]
    contact = "  |  ".join(b for b in contact_bits if b)
    if contact:
        story.append(Paragraph(contact, st["contact"]))

    # ── Ringkasan ─────────────────────────────────────────────────────────────
    if cv_data.get("summary"):
        story += _section_header("Ringkasan", st)
        story.append(Paragraph(_clean(cv_data["summary"]), st["body"]))

    # ── Pendidikan ────────────────────────────────────────────────────────────
    edu = cv_data.get("education") or []
    if edu:
        story += _section_header("Pendidikan", st)
        for e in edu:
            head = " — ".join(x for x in [_clean(e.get("institution")), _clean(e.get("degree"))] if x)
            if head:
                story.append(Paragraph(f"<b>{head}</b>", st["role"]))
            meta = "  ·  ".join(x for x in [
                _clean(e.get("major")), _clean(e.get("period")),
                _clean(e.get("location")),
                (f"IPK {_clean(e.get('gpa'))}" if e.get("gpa") else ""),
            ] if x)
            if meta:
                story.append(Paragraph(meta, st["meta"]))

    # ── Pengalaman kerja ──────────────────────────────────────────────────────
    work = cv_data.get("work_experience") or []
    if work:
        story += _section_header("Pengalaman Kerja", st)
        for w in work:
            head = " — ".join(x for x in [_clean(w.get("role")), _clean(w.get("company"))] if x)
            if head:
                story.append(Paragraph(f"<b>{head}</b>", st["role"]))
            meta = "  ·  ".join(x for x in [_clean(w.get("period")), _clean(w.get("location"))] if x)
            if meta:
                story.append(Paragraph(meta, st["meta"]))
            bl = _bullets(w.get("bullets"), st)
            if bl:
                story.append(bl)

    # ── Pengalaman organisasi ─────────────────────────────────────────────────
    org = cv_data.get("org_experience") or []
    if org:
        story += _section_header("Pengalaman Organisasi", st)
        for o in org:
            head = " — ".join(x for x in [_clean(o.get("role")), _clean(o.get("organization"))] if x)
            if head:
                story.append(Paragraph(f"<b>{head}</b>", st["role"]))
            meta = "  ·  ".join(x for x in [_clean(o.get("period")), _clean(o.get("location"))] if x)
            if meta:
                story.append(Paragraph(meta, st["meta"]))
            bl = _bullets(o.get("bullets"), st)
            if bl:
                story.append(bl)

    # ── Pelatihan ─────────────────────────────────────────────────────────────
    training = cv_data.get("training") or []
    if training:
        story += _section_header("Pelatihan & Sertifikat Kursus", st)
        for t in training:
            head = " — ".join(x for x in [_clean(t.get("title")), _clean(t.get("provider"))] if x)
            if head:
                story.append(Paragraph(f"<b>{head}</b>", st["role"]))
            meta = "  ·  ".join(x for x in [_clean(t.get("period")), _clean(t.get("location"))] if x)
            if meta:
                story.append(Paragraph(meta, st["meta"]))
            bl = _bullets(t.get("bullets"), st)
            if bl:
                story.append(bl)

    # ── Skills ────────────────────────────────────────────────────────────────
    skills = cv_data.get("skills") or {}
    if any(skills.get(k) for k in ("hard_skills", "soft_skills", "languages")):
        story += _section_header("Keahlian", st)
        rows = [
            ("Hard skills", skills.get("hard_skills")),
            ("Soft skills", skills.get("soft_skills")),
            ("Bahasa", skills.get("languages")),
        ]
        for label, vals in rows:
            joined = ", ".join(_clean(v) for v in (vals or []) if v and str(v).strip())
            if joined:
                story.append(Paragraph(f"<b>{label}:</b> {joined}", st["body"]))

    # ── Sertifikasi ───────────────────────────────────────────────────────────
    certs = cv_data.get("certifications") or []
    if certs:
        story += _section_header("Sertifikasi", st)
        bl = _bullets(certs, st)
        if bl:
            story.append(bl)

    if len(story) <= 1:
        story.append(Spacer(1, 4 * mm))
        story.append(Paragraph("Data CV belum lengkap.", st["body"]))

    buf = BytesIO()
    doc = SimpleDocTemplate(
        buf, pagesize=A4,
        topMargin=16 * mm, bottomMargin=16 * mm,
        leftMargin=18 * mm, rightMargin=18 * mm,
        title=f"CV - {name}",
    )
    doc.build(story)
    return buf.getvalue()

from datetime import datetime

from app.config import settings
from google import genai


_client: genai.Client | None = None

GEMINI_MODEL = "gemini-3.1-flash-lite-preview"  # sama dengan gemini_service.py


def _get_client() -> genai.Client:
    global _client
    if _client is None:
        _client = genai.Client(api_key=settings.gemini_api_key)
    return _client


def generate_cover_letter(
    *,
    full_name: str,
    github_username: str | None,
    merged_skills: list[str],
    job_title: str,
    job_company: str,
    job_location: str | None,
    required_skills: list[str],
    matching_skills: list[str],
    missing_skills: list[str],
    # Bio data tambahan
    birth_place: str | None = None,
    birth_date: str | None = None,
    address: str | None = None,
    phone: str | None = None,
    email: str | None = None,
) -> str:
    """Generate formal Indonesian cover letter using Gemini AI."""

    today = datetime.now().strftime("%d %B %Y")
    skills_str = ", ".join(merged_skills[:15]) if merged_skills else "berbagai teknologi"
    matched_str = ", ".join(matching_skills[:8]) if matching_skills else "-"
    missing_str = ", ".join(missing_skills[:5]) if missing_skills else "-"

    # Bangun blok identitas diri
    identity_lines = [f"Nama              : {full_name}"]
    if birth_place and birth_date:
        identity_lines.append(f"Tempat, Tgl Lahir : {birth_place}, {birth_date}")
    elif birth_place:
        identity_lines.append(f"Tempat Lahir      : {birth_place}")
    if address:
        identity_lines.append(f"Alamat            : {address}")
    if phone:
        identity_lines.append(f"Telepon           : {phone}")
    if email:
        identity_lines.append(f"Email             : {email}")
    identity_block = "\n".join(identity_lines)

    has_bio = bool(birth_place or birth_date or address or phone or email)

    prompt = f"""Kamu adalah asisten profesional yang membantu fresh graduate Indonesia menulis surat lamaran kerja formal.

Buat surat lamaran kerja dalam Bahasa Indonesia yang formal, profesional, dan personal.
PENTING: Gunakan PERSIS format berikut, jangan ubah strukturnya:

---FORMAT SURAT---
{today}

Kepada Yth.
HRD / Tim Rekrutmen
{job_company}
di Tempat

Dengan hormat,

Saya yang bertanda tangan di bawah ini:

{identity_block}

{"Bersama surat ini saya mengajukan lamaran untuk posisi " + job_title + " di " + job_company + "." if has_bio else ""}
[Tulis 1 paragraf pembuka yang menyebut posisi ({job_title}) dan motivasi melamar ke {job_company}. Buat terdengar antusias dan profesional. Jika paragraf "Bersama surat ini..." sudah ada di atas, sambungkan saja isi setelahnya tanpa mengulang posisi dan perusahaan di kalimat pertama.]

[Tulis 1 paragraf tentang skill dan pengalaman. Sebutkan skill yang relevan: {matched_str}. Jelaskan relevansinya untuk posisi {job_title}. Jika ada skill sedang dipelajari ({missing_str}), sebutkan bahwa sedang dalam proses pendalaman.]

[Tulis 1 paragraf penutup: nyatakan kesiapan interview dan harapan bergabung dengan {job_company}.]

Demikian surat lamaran ini saya sampaikan. Atas perhatian Bapak/Ibu, saya ucapkan terima kasih.

Hormat saya,


{full_name}
---AKHIR FORMAT---

Data kandidat:
- Nama: {full_name}
- Skills dimiliki: {skills_str}
- Skills cocok dengan job: {matched_str}
- Skills sedang dipelajari: {missing_str}
- Posisi: {job_title}
- Perusahaan: {job_company}
- Lokasi: {job_location or "Remote/Tidak disebutkan"}

Aturan:
- JANGAN gunakan ** * # atau markdown apapun
- Tulis kalimat biasa yang mengalir secara natural
- Hasilkan HANYA teks surat, tanpa penjelasan tambahan, tanpa tanda ```"""

    client = _get_client()
    resp = client.models.generate_content(
        model=GEMINI_MODEL,
        contents=prompt,
    )
    return resp.text.strip()

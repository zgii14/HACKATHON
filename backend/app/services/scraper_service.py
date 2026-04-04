"""
scraper_service.py
Mengambil data lowongan kerja dari Glints menggunakan Selenium.
Dipanggil oleh endpoint POST /admin/scrape-jobs
"""
import os
import re
import uuid
import time

from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

from sqlalchemy.orm import Session
from app.models import Job

# Railway/Linux production: set ke True jika tidak ada display (DISPLAY env var kosong)
_IS_HEADLESS = os.environ.get("DISPLAY") is None or os.environ.get("RAILWAY_ENVIRONMENT") is not None


# ── Keyword yang akan di-scrape ──────────────────────────────────────────────
DEFAULT_KEYWORDS = [
    "Python Backend Developer",
    "Frontend Developer React",
    "Full Stack Developer",
    "Mobile Developer Flutter",
    "Data Engineer",
    "DevOps Engineer",
    "Machine Learning Engineer",
]

MAX_JOBS_PER_KEYWORD = 5  # Batas per keyword agar tidak terlalu lama


def _build_driver() -> webdriver.Chrome:
    """Buat Chrome WebDriver dengan konfigurasi anti-bot."""
    options = webdriver.ChromeOptions()

    if _IS_HEADLESS:
        # Mode headless untuk Railway/Linux production (tidak ada display)
        options.add_argument("--headless=new")
    else:
        # Mode non-headless untuk development (lebih reliable tapi perlu display)
        options.add_argument("--start-minimized")

    options.add_argument("--disable-gpu")
    options.add_argument("--window-size=1920,1080")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")
    options.add_argument("--disable-blink-features=AutomationControlled")
    options.add_argument(
        "--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    )

    # Jika ada custom Chrome binary (misalnya chromium dari nixpacks)
    chrome_bin = os.environ.get("CHROME_BIN")
    if chrome_bin:
        options.binary_location = chrome_bin

    service = Service()
    driver = webdriver.Chrome(service=service, options=options)
    driver.execute_script(
        "Object.defineProperty(navigator, 'webdriver', {get: () => undefined})"
    )
    return driver


def _get_job_links(driver: webdriver.Chrome, keyword: str, max_jobs: int) -> list[str]:
    """Ambil link lowongan dari halaman pencarian Glints."""
    wait = WebDriverWait(driver, 15)
    search_kw = keyword.replace(" ", "+")
    url = f"https://glints.com/id/opportunities/jobs/explore?keyword={search_kw}&country=ID"

    driver.get(url)
    time.sleep(4)

    # Tutup popup jika ada
    for xpath in [
        "//button[contains(@aria-label,'close')]",
        "//button[contains(@aria-label,'Close')]",
    ]:
        try:
            driver.find_element(By.XPATH, xpath).click()
            time.sleep(1)
            break
        except Exception:
            pass

    try:
        wait.until(EC.presence_of_element_located((By.XPATH, "//a[contains(@href, '/jobs/')]")))
    except Exception:
        return []

    link_els = driver.find_elements(
        By.XPATH, "//a[contains(@href, '/jobs/') and string-length(text()) > 3]"
    )
    seen, job_links = set(), []
    for el in link_els:
        href = el.get_attribute("href")
        if href and href not in seen:
            seen.add(href)
            job_links.append(href)

    return job_links[:max_jobs]


def _scrape_job_detail(driver: webdriver.Chrome, link: str) -> dict | None:
    """Buka halaman detail satu lowongan dan ekstrak semua data."""
    wait = WebDriverWait(driver, 15)

    try:
        driver.get(link)

        # Scroll agar konten lazy-load muncul
        for i in range(5):
            driver.execute_script(f"window.scrollTo(0, {400 * (i + 1)})")
            time.sleep(1.2)
        driver.execute_script("window.scrollTo(0, 0)")
        time.sleep(1)

        job_data: dict = {
            "url": link,
            "title": None,
            "company": None,
            "location": None,
            "description": None,
            "required_skills": [],
            "salary": None,
            "min_education": None,
            "min_experience": None,
            "work_type": None,
            "is_remote": False,
        }

        # ── Judul ──
        try:
            job_data["title"] = wait.until(
                EC.presence_of_element_located((By.TAG_NAME, "h1"))
            ).text.strip() or None
        except Exception:
            pass

        if not job_data["title"]:
            return None  # Skip kalau tidak ada judul

        # ── Perusahaan ──
        for xpath in [
            "//a[contains(@href,'/companies/')]",
            "//span[contains(@class,'company')]",
        ]:
            try:
                el = driver.find_element(By.XPATH, xpath)
                if el.text.strip():
                    job_data["company"] = el.text.strip()
                    break
            except Exception:
                pass

        # ── Full page text sekali pakai ──
        full_text: str = driver.execute_script("return document.body.innerText") or ""

        # ── Lokasi ──
        kota_pattern = (
            r"(Jakarta(?:\s+\w+)?|Bandung|Surabaya|Yogyakarta|Bali|Medan|Semarang|"
            r"Bekasi|Depok|Tangerang(?:\s+\w+)?|Bogor|Makassar|Palembang|Denpasar|"
            r"Banten|Remote|Work From Home|WFH|Hybrid|Indonesia)"
        )
        loc_matches = re.findall(kota_pattern, full_text, re.IGNORECASE)
        if loc_matches:
            seen_loc: set = set()
            unique_locs: list = []
            for m in loc_matches:
                if m.lower() not in seen_loc:
                    seen_loc.add(m.lower())
                    unique_locs.append(m)
            job_data["location"] = ", ".join(unique_locs[:3])

        # ── Gaji ──
        salary_match = re.search(r"Rp[\s\d,.]+jt(?:[-\u2013][\s\d,.]+jt)?", full_text)
        if salary_match:
            job_data["salary"] = salary_match.group(0).strip()
        elif "tidak menampilkan gaji" in full_text.lower():
            job_data["salary"] = "Gaji Tidak Ditampilkan"

        # ── Requirements (pendidikan, pengalaman, work_type) ──
        req_els = driver.find_elements(
            By.XPATH,
            "//div[contains(@class,'JobRequirementssc__Tag')]//span[contains(@class,'TagContentStyle')]",
        )
        for el in req_els:
            text = el.text.strip()
            t_lower = text.lower()
            if any(k in t_lower for k in ["sarjana", "diploma", "sma", "s1", "s2", "d3", "d4"]):
                job_data["min_education"] = text
            elif "tahun" in t_lower and "pengalaman" in t_lower:
                job_data["min_experience"] = text
            elif any(k in t_lower for k in ["kantor", "hybrid", "remote", "wfh"]):
                job_data["work_type"] = text
                job_data["is_remote"] = "remote" in t_lower or "wfh" in t_lower

        # Fallback work_type dari lokasi
        if not job_data["work_type"] and job_data["location"]:
            loc_lower = job_data["location"].lower()
            if "hybrid" in loc_lower:
                job_data["work_type"] = "Hybrid"
                job_data["is_remote"] = True
            elif "remote" in loc_lower or "wfh" in loc_lower:
                job_data["work_type"] = "Remote"
                job_data["is_remote"] = True

        # ── Skills ──
        skill_els = driver.find_elements(
            By.XPATH,
            "//p[contains(@class,'Skills') and string-length(normalize-space(text())) > 0]",
        )
        if skill_els:
            job_data["required_skills"] = [el.text.strip() for el in skill_els if el.text.strip()]
        else:
            try:
                container = driver.find_element(
                    By.XPATH,
                    "//div[contains(@class,'SkillsContainer') or contains(@class,'TagContainer')]",
                )
                texts = [
                    t.strip()
                    for t in container.text.split("\n")
                    if t.strip() and t.strip().lower() != "skills"
                ]
                job_data["required_skills"] = texts
            except Exception:
                pass

        # ── Deskripsi ──
        paragraphs = driver.find_elements(By.TAG_NAME, "p")
        long_texts = [p.text.strip() for p in paragraphs if len(p.text.strip()) > 100]
        if long_texts:
            job_data["description"] = " | ".join(long_texts[:2])[:1000]
        else:
            job_data["description"] = job_data["title"]  # Fallback minimal

        return job_data

    except Exception:
        return None


def run_scraping(
    db: Session,
    keywords: list[str] | None = None,
    max_per_keyword: int = MAX_JOBS_PER_KEYWORD,
) -> dict:
    """
    Fungsi utama yang dipanggil endpoint /admin/scrape-jobs.
    Scrape Glints berdasarkan daftar keyword, simpan ke DB, return statistik.
    """
    if keywords is None:
        keywords = DEFAULT_KEYWORDS

    driver = _build_driver()
    saved, skipped, errors = 0, 0, 0
    seen_urls: set = set()

    try:
        for keyword in keywords:
            links = _get_job_links(driver, keyword, max_per_keyword)

            for link in links:
                # Normalisasi URL (hapus query params)
                clean_url = link.split("?")[0]
                if clean_url in seen_urls:
                    skipped += 1
                    continue
                seen_urls.add(clean_url)

                job_data = _scrape_job_detail(driver, link)
                if not job_data or not job_data.get("title") or not job_data.get("company"):
                    errors += 1
                    continue

                # Cek duplikat di DB berdasarkan apply_url (clean)
                exists = db.query(Job).filter(Job.apply_url == clean_url).first()
                if exists:
                    skipped += 1
                    continue

                # Simpan ke DB
                db.add(Job(
                    id=uuid.uuid4(),
                    title=job_data["title"],
                    company=job_data["company"] or "Unknown",
                    description=job_data["description"] or job_data["title"],
                    required_skills=job_data["required_skills"],
                    location=job_data["location"],
                    is_remote=job_data["is_remote"],
                    apply_url=clean_url,
                    salary=job_data["salary"],
                    min_education=job_data["min_education"],
                    min_experience=job_data["min_experience"],
                    work_type=job_data["work_type"],
                ))
                saved += 1

                time.sleep(1.5)  # Jeda antar request

        db.commit()

    except Exception as e:
        db.rollback()
        return {"ok": False, "error": str(e), "saved": saved, "skipped": skipped}

    finally:
        driver.quit()

    return {
        "ok": True,
        "saved": saved,
        "skipped": skipped,
        "errors": errors,
        "keywords_scraped": keywords,
    }

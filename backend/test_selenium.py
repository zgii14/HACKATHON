# -*- coding: utf-8 -*-
import sys
import io
import re
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
import time

def scrape_glints_detail(keyword="Python Backend Developer", max_jobs=5):
    options = webdriver.ChromeOptions()
    options.add_argument('--disable-gpu')
    options.add_argument('--window-size=1920,1080')
    options.add_argument('--no-sandbox')
    options.add_argument('--disable-blink-features=AutomationControlled')
    options.add_experimental_option("excludeSwitches", ["enable-automation"])
    options.add_experimental_option('useAutomationExtension', False)

    print("Robot Chrome menyala...\n")
    driver = webdriver.Chrome(options=options)
    driver.execute_script("Object.defineProperty(navigator, 'webdriver', {get: () => undefined})")
    wait = WebDriverWait(driver, 15)
    results = []

    try:
        # ── LANGKAH 1: Ambil link dari halaman list ───────────────────────
        search_kw = keyword.replace(" ", "+")
        url = f"https://glints.com/id/opportunities/jobs/explore?keyword={search_kw}&country=ID"
        print(f"Mencari: '{keyword}'\nURL: {url}\n")
        driver.get(url)
        time.sleep(4)

        # Tutup popup jika ada
        for xpath in ["//button[contains(@aria-label,'close')]", "//button[contains(@aria-label,'Close')]"]:
            try:
                driver.find_element(By.XPATH, xpath).click()
                time.sleep(1)
                break
            except:
                pass

        # Kumpulkan link unik
        wait.until(EC.presence_of_element_located((By.XPATH, "//a[contains(@href, '/jobs/')]")))
        link_els = driver.find_elements(By.XPATH, "//a[contains(@href, '/jobs/') and string-length(text()) > 3]")
        seen, job_links = set(), []
        for el in link_els:
            href = el.get_attribute("href")
            if href and href not in seen:
                seen.add(href)
                job_links.append(href)
        job_links = job_links[:max_jobs]
        print(f"Ditemukan {len(job_links)} lowongan. Mulai kunjungi detail...\n")
        print("=" * 60)

        # ── LANGKAH 2: Kunjungi halaman detail ───────────────────────────
        for idx, link in enumerate(job_links, 1):
            print(f"\n[{idx}/{len(job_links)}] {link.split('?')[0]}")
            driver.get(link)

            # Scroll perlahan agar semua komponen React ter-render
            for i in range(5):
                driver.execute_script(f"window.scrollTo(0, {400 * (i+1)})")
                time.sleep(1.2)
            driver.execute_script("window.scrollTo(0, 0)")
            time.sleep(1)

            job_data = {
                "url": link,
                "title": "-",
                "company": "-",
                "location": "-",
                "description": "-",
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
                ).text.strip()
            except:
                pass

            # ── Perusahaan ──
            for xpath in ["//a[contains(@href,'/companies/')]", "//span[contains(@class,'company')]"]:
                try:
                    el = driver.find_element(By.XPATH, xpath)
                    if el.text.strip():
                        job_data["company"] = el.text.strip()
                        break
                except:
                    pass

            # ── Ambil seluruh teks halaman sekali untuk reuse ──
            full_text = driver.execute_script("return document.body.innerText") or ""

            # ── Lokasi (JS regex) ──
            try:
                kota_pattern = (
                    r'(Jakarta(?:\s+\w+)?|Bandung|Surabaya|Yogyakarta|Bali|Medan|Semarang|'
                    r'Bekasi|Depok|Tangerang(?:\s+\w+)?|Bogor|Makassar|Palembang|Denpasar|'
                    r'Banten|Remote|Work From Home|WFH|Hybrid|Indonesia)'
                )
                matches = re.findall(kota_pattern, full_text, re.IGNORECASE)
                if matches:
                    seen_loc, unique_locs = set(), []
                    for m in matches:
                        if m.lower() not in seen_loc:
                            seen_loc.add(m.lower())
                            unique_locs.append(m)
                    job_data["location"] = ", ".join(unique_locs[:3])
            except:
                pass

            # ── Gaji ── (cari pola "Rp X jt" di teks halaman)
            try:
                salary_match = re.search(r'Rp[\s\d,.]+jt(?:[-–][\s\d,.]+jt)?', full_text)
                if salary_match:
                    job_data["salary"] = salary_match.group(0).strip()
                elif "tidak menampilkan gaji" in full_text.lower():
                    job_data["salary"] = "Gaji Tidak Ditampilkan"
            except:
                pass

            # ── Requirements: pendidikan, pengalaman, work_type ──
            # Dari debug: elemen dengan class 'JobRequirementssc__Tag' berisi chips requirement
            try:
                req_els = driver.find_elements(
                    By.XPATH,
                    "//div[contains(@class,'JobRequirementssc__Tag')]//span[contains(@class,'TagContentStyle')]"
                )
                req_texts = [el.text.strip() for el in req_els if el.text.strip()]

                for text in req_texts:
                    t_lower = text.lower()
                    # Pendidikan
                    if any(k in t_lower for k in ["sarjana", "diploma", "sma", "s1", "s2", "d3", "d4"]):
                        job_data["min_education"] = text
                    # Pengalaman
                    elif "tahun" in t_lower and "pengalaman" in t_lower:
                        job_data["min_experience"] = text
                    # Work type
                    elif any(k in t_lower for k in ["kantor", "hybrid", "remote", "wfh"]):
                        job_data["work_type"] = text
                        job_data["is_remote"] = "remote" in t_lower or "wfh" in t_lower

                # Kalau work_type belum dapat, cek dari lokasi
                if not job_data["work_type"] and job_data["location"]:
                    loc_lower = job_data["location"].lower()
                    if "hybrid" in loc_lower:
                        job_data["work_type"] = "Hybrid"
                        job_data["is_remote"] = True
                    elif "remote" in loc_lower or "wfh" in loc_lower:
                        job_data["work_type"] = "Remote"
                        job_data["is_remote"] = True

            except:
                pass

            # ── Skills ── (<p> dengan class mengandung 'Skills')
            try:
                skill_els = driver.find_elements(
                    By.XPATH,
                    "//p[contains(@class,'Skills') and string-length(normalize-space(text())) > 0]"
                )
                if skill_els:
                    job_data["required_skills"] = [el.text.strip() for el in skill_els if el.text.strip()]
                else:
                    # Fallback: container SkillsContainer
                    container = driver.find_element(
                        By.XPATH,
                        "//div[contains(@class,'SkillsContainer') or contains(@class,'TagContainer')]"
                    )
                    texts = [t.strip() for t in container.text.split('\n')
                             if t.strip() and t.strip().lower() != 'skills']
                    job_data["required_skills"] = texts
            except:
                pass

            # ── Deskripsi ──
            try:
                paragraphs = driver.find_elements(By.TAG_NAME, "p")
                long_texts = [p.text.strip() for p in paragraphs if len(p.text.strip()) > 100]
                if long_texts:
                    job_data["description"] = " | ".join(long_texts[:2])[:500]
            except:
                pass

            results.append(job_data)

            print(f"   Judul      : {job_data['title']}")
            print(f"   Perusahaan : {job_data['company']}")
            print(f"   Lokasi     : {job_data['location']}")
            print(f"   Gaji       : {job_data['salary']}")
            print(f"   Pendidikan : {job_data['min_education']}")
            print(f"   Pengalaman : {job_data['min_experience']}")
            print(f"   Tipe Kerja : {job_data['work_type']} (remote={job_data['is_remote']})")
            print(f"   Skills     : {job_data['required_skills']}")
            print(f"   Deskripsi  : {job_data['description'][:100]}...")
            print("-" * 60)
            time.sleep(2)

        print(f"\nSELESAI! {len(results)} lowongan berhasil di-scrape.")

    except Exception as e:
        print(f"\nERROR: {e}")
        driver.save_screenshot("debug_screenshot.png")

    finally:
        time.sleep(2)
        driver.quit()
        print("\nBrowser ditutup.")

    return results


if __name__ == "__main__":
    scrape_glints_detail("Python Backend Developer", max_jobs=3)

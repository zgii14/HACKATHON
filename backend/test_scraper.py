import httpx
import json

def scrape_glints(keyword="backend developer", limit=5):
    # Menggunakan endpoint public API milik Glints (GraphQL)
    url = "https://glints.com/api/graphql"
    
    # Query GraphQL khusus dari Glints untuk mencari lowongan
    query = """
    query JobSearch($SearchData: JobSearchDataInput!, $Limit: Int, $Skip: Int) {
      JobSearch(searchData: $SearchData, limit: $Limit, skip: $Skip) {
        jobs {
          id
          title
          company {
            name
          }
          city {
            name
          }
          isRemote
          description
        }
      }
    }
    """
    
    # Variabel untuk pencarian
    variables = {
        "SearchData": {
            "keyword": keyword,
            "countries": ["ID"] # Filter untuk lowongan di Indonesia
        },
        "Limit": limit,
        "Skip": 0
    }
    
    # Menyamar sebagai Browser agar tidak mudah diblokir Satpam Digital (Anti-Bot)
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Content-Type": "application/json",
        "Accept": "*/*",
        "Origin": "https://glints.com",
        "Referer": "https://glints.com/id/"
    }

    print(f"🤖 Memulai Scraping lowongan '{keyword}' di Glints...\n")
    
    try:
        # Mengirim POST request ke "Pipa Rahasia" Glints
        with httpx.Client() as client:
            response = client.post(url, json={"query": query, "variables": variables}, headers=headers, timeout=15.0)
            
        response.raise_for_status()
        
        # Datanya langsung berbentuk JSON (Dictionary/Object) rapi!
        data = response.json()
        
        # Cek struktur respons
        if "errors" in data:
            print("❌ Gagal mendapat data valid. Glints mungkin memblokir query ini.")
            print(data["errors"])
            return

        jobs = data.get("data", {}).get("JobSearch", {}).get("jobs", [])
        
        if not jobs:
            print("😢 Tidak ada pekerjaan ditemukan.")
            return

        print(f"✅ BINGO! Berhasil mendapat {len(jobs)} pekerjaan mentah:\n")
        
        for idx, job in enumerate(jobs, 1):
            title = job.get("title", "Tanpa Judul")
            
            # Aman dari AttributeError kalau datanya null
            company_data = job.get("company")
            company = company_data.get("name", "Perusahaan Rahasia") if company_data else "Perusahaan Rahasia"
            
            city_data = job.get("city")
            location = city_data.get("name", "Tanpa Lokasi") if city_data else "Tanpa Lokasi"
            
            remote = "Tersedia" if job.get("isRemote") else "Tidak"
            desc = job.get("description", "")[:100].replace('\n', ' ') + "..." # Potong deskripsi kepanjangan
            
            print(f"{idx}. {title} @ {company}")
            print(f"   📍 Lokasi : {location} (Remote: {remote})")
            print(f"   📝 Cuplikan: {desc}")
            print("-" * 50)
            
    except Exception as e:
        print(f"❌ Yah, Scraping gagal. Error: {e}")

if __name__ == "__main__":
    scrape_glints("Frontend Developer Next.js", limit=3)

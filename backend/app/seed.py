import uuid
from sqlalchemy.orm import Session

from app.models import Job


DUMMY_JOBS: list[dict] = [
    # ── Backend ──────────────────────────────────────────────────────────
    {
        "title": "Junior Backend Developer",
        "company": "TechFlow ID",
        "description": "Build REST APIs and work with PostgreSQL. Collaborate in an agile team.",
        "required_skills": ["Python", "FastAPI", "PostgreSQL", "Git", "Docker"],
        "location": "Jakarta",
        "is_remote": True,
        "apply_url": "https://glints.com/id/opportunities/jobs/explore?keyword=junior+backend+developer&country=ID",
    },
    {
        "title": "Backend Engineer (Node.js)",
        "company": "Tokoseru",
        "description": "Develop high-performance APIs using Node.js and Express. Work with MongoDB and Redis caching.",
        "required_skills": ["Node.js", "Express.js", "MongoDB", "Redis", "Git", "REST API"],
        "location": "Jakarta",
        "is_remote": False,
        "apply_url": "https://www.kalibrr.com/id-ID/job-board/te/tokoseru",
    },
    {
        "title": "Go Backend Developer",
        "company": "GopayTech",
        "description": "Build scalable microservices using Go. Handle high-throughput payment processing.",
        "required_skills": ["Go", "PostgreSQL", "Docker", "Kubernetes", "REST API", "Git"],
        "location": "Jakarta",
        "is_remote": True,
        "apply_url": "https://www.linkedin.com/jobs/search/?keywords=go+backend+developer+jakarta",
    },
    {
        "title": "Junior Java Developer",
        "company": "BankMandiri Digital",
        "description": "Work on enterprise banking systems with Spring Boot and Oracle DB.",
        "required_skills": ["Java", "Spring Boot", "SQL", "Git", "REST API"],
        "location": "Jakarta",
        "is_remote": False,
        "apply_url": "https://career.bankmandiri.co.id/",
    },
    {
        "title": "Laravel PHP Developer",
        "company": "DigitalUMKM",
        "description": "Build web apps for UMKM using Laravel. Integrate with third-party payment APIs.",
        "required_skills": ["PHP", "Laravel", "MySQL", "JavaScript", "Git", "REST API"],
        "location": "Yogyakarta",
        "is_remote": True,
        "apply_url": "https://glints.com/id/opportunities/jobs/explore?keyword=laravel+developer&country=ID",
    },
    {
        "title": "Senior Backend Engineer (Python)",
        "company": "Gojek",
        "description": "Design and scale distributed systems handling millions of transactions. Lead junior engineers.",
        "required_skills": ["Python", "FastAPI", "PostgreSQL", "Redis", "Kafka", "Docker", "Kubernetes"],
        "location": "Jakarta",
        "is_remote": True,
        "apply_url": "https://www.gojek.com/id-id/about/careers/",
    },
    {
        "title": "Backend Developer (Rust)",
        "company": "CryptoNusa",
        "description": "Build ultra-low-latency trading engine in Rust for crypto exchange platform.",
        "required_skills": ["Rust", "PostgreSQL", "Redis", "Docker", "Git", "REST API"],
        "location": "Remote",
        "is_remote": True,
        "apply_url": "https://www.linkedin.com/jobs/search/?keywords=rust+backend+developer+indonesia",
    },
    {
        "title": "API Engineer (Django)",
        "company": "EduTech Pintar",
        "description": "Build RESTful APIs for online learning platform serving 500K+ students.",
        "required_skills": ["Python", "Django", "PostgreSQL", "Redis", "Git", "Docker"],
        "location": "Jakarta",
        "is_remote": True,
        "apply_url": "https://glints.com/id/opportunities/jobs/explore?keyword=django+developer&country=ID",
    },
    {
        "title": "Backend Engineer (Kotlin/JVM)",
        "company": "Traveloka",
        "description": "Build and maintain high-traffic travel booking microservices using Kotlin and Spring.",
        "required_skills": ["Kotlin", "Spring Boot", "PostgreSQL", "Docker", "Kafka", "Git"],
        "location": "Jakarta",
        "is_remote": False,
        "apply_url": "https://www.traveloka.com/id-id/careers",
    },

    # ── Frontend ─────────────────────────────────────────────────────────
    {
        "title": "Frontend Developer (React)",
        "company": "Nusantara Apps",
        "description": "Implement responsive UIs with React and TypeScript.",
        "required_skills": ["React", "TypeScript", "Next.js", "Tailwind CSS", "Git"],
        "location": "Bandung",
        "is_remote": False,
        "apply_url": "https://glints.com/id/opportunities/jobs/explore?keyword=react+developer+bandung&country=ID",
    },
    {
        "title": "Vue.js Frontend Developer",
        "company": "KantorKu",
        "description": "Build internal dashboards and HR tools with Vue 3 and Nuxt.",
        "required_skills": ["Vue", "Nuxt.js", "JavaScript", "Tailwind CSS", "Git", "REST API"],
        "location": "Surabaya",
        "is_remote": True,
        "apply_url": "https://www.kalibrr.com/id-ID/job-board/te/kantorku",
    },
    {
        "title": "UI Engineer (Angular)",
        "company": "ERPindo",
        "description": "Develop enterprise Angular apps for manufacturing clients.",
        "required_skills": ["Angular", "TypeScript", "RxJS", "HTML", "CSS", "Git"],
        "location": "Semarang",
        "is_remote": False,
        "apply_url": "https://www.jobstreet.co.id/en/job-search/angular-developer-jobs/",
    },
    {
        "title": "Senior Frontend Engineer (Next.js)",
        "company": "Tokopedia",
        "description": "Lead frontend architecture for high-traffic e-commerce pages. Mentor junior devs.",
        "required_skills": ["React", "Next.js", "TypeScript", "GraphQL", "Tailwind CSS", "Git"],
        "location": "Jakarta",
        "is_remote": True,
        "apply_url": "https://www.tokopedia.com/careers/",
    },
    {
        "title": "Frontend Developer (Svelte)",
        "company": "MediaKita",
        "description": "Build blazing-fast content delivery interfaces using SvelteKit.",
        "required_skills": ["Svelte", "TypeScript", "JavaScript", "CSS", "REST API", "Git"],
        "location": "Bali",
        "is_remote": True,
        "apply_url": "https://www.linkedin.com/jobs/search/?keywords=svelte+developer+indonesia",
    },

    # ── Full Stack ────────────────────────────────────────────────────────
    {
        "title": "Full Stack Engineer",
        "company": "StartupKita",
        "description": "Own features end-to-end: Next.js frontend and Node or Python backend.",
        "required_skills": ["JavaScript", "React", "Node.js", "PostgreSQL", "REST API"],
        "location": "Remote",
        "is_remote": True,
        "apply_url": "https://glints.com/id/opportunities/jobs/explore?keyword=full+stack+engineer&country=ID",
    },
    {
        "title": "Full Stack Developer (MERN)",
        "company": "EduPlatform",
        "description": "Build e-learning platform with MongoDB, Express, React, and Node.",
        "required_skills": ["MongoDB", "Express.js", "React", "Node.js", "JavaScript", "Git"],
        "location": "Bandung",
        "is_remote": True,
        "apply_url": "https://www.kalibrr.com/id-ID/job-board/te/eduplatform",
    },
    {
        "title": "Full Stack Engineer (Django + React)",
        "company": "AgriTech Nusantara",
        "description": "Build farm management platform serving smallholder farmers across Indonesia.",
        "required_skills": ["Python", "Django", "React", "TypeScript", "PostgreSQL", "Git"],
        "location": "Bogor",
        "is_remote": True,
        "apply_url": "https://glints.com/id/opportunities/jobs/explore?keyword=django+react+developer&country=ID",
    },
    {
        "title": "Full Stack Developer (Rails + React)",
        "company": "PropertyKita",
        "description": "Develop property listing platform with Ruby on Rails API and React frontend.",
        "required_skills": ["Ruby", "Rails", "React", "PostgreSQL", "JavaScript", "Git"],
        "location": "Jakarta",
        "is_remote": True,
        "apply_url": "https://www.linkedin.com/jobs/search/?keywords=ruby+rails+developer+jakarta",
    },

    # ── Data / Analytics ──────────────────────────────────────────────────
    {
        "title": "Data Engineer (Junior)",
        "company": "InsightLab",
        "description": "ETL pipelines, SQL, and basic cloud data services.",
        "required_skills": ["Python", "SQL", "PostgreSQL", "pandas", "Git"],
        "location": "Surabaya",
        "is_remote": False,
        "apply_url": "https://glints.com/id/opportunities/jobs/explore?keyword=data+engineer+surabaya&country=ID",
    },
    {
        "title": "Junior Data Analyst",
        "company": "RetailMart ID",
        "description": "Analyze sales data, create dashboards, and report insights to stakeholders.",
        "required_skills": ["Python", "pandas", "SQL", "Tableau", "Excel", "Git"],
        "location": "Jakarta",
        "is_remote": False,
        "apply_url": "https://www.jobstreet.co.id/en/job-search/data-analyst-jobs/",
    },
    {
        "title": "Data Scientist (Entry Level)",
        "company": "AI Nusantara",
        "description": "Build predictive models for e-commerce recommendation and churn analysis.",
        "required_skills": ["Python", "scikit-learn", "pandas", "SQL", "machine learning", "Git"],
        "location": "Remote",
        "is_remote": True,
        "apply_url": "https://glints.com/id/opportunities/jobs/explore?keyword=data+scientist+entry+level&country=ID",
    },
    {
        "title": "Business Intelligence Developer",
        "company": "LogisticsKu",
        "description": "Design data warehouse, create KPI dashboards using Power BI and SQL.",
        "required_skills": ["SQL", "Power BI", "PostgreSQL", "Python", "Excel"],
        "location": "Surabaya",
        "is_remote": False,
        "apply_url": "https://www.kalibrr.com/id-ID/job-board/te/logisticsku",
    },
    {
        "title": "Senior Data Engineer",
        "company": "Grab Indonesia",
        "description": "Design and maintain large-scale data pipelines processing billions of ride events daily.",
        "required_skills": ["Python", "Apache Spark", "Kafka", "BigQuery", "SQL", "Git", "Airflow"],
        "location": "Jakarta",
        "is_remote": False,
        "apply_url": "https://grab.careers/jobs/",
    },
    {
        "title": "Analytics Engineer",
        "company": "ShopeeID",
        "description": "Build dbt models, maintain data marts, and enable self-serve analytics.",
        "required_skills": ["SQL", "dbt", "Python", "BigQuery", "Git", "Looker"],
        "location": "Jakarta",
        "is_remote": False,
        "apply_url": "https://careers.shopee.co.id/",
    },
    {
        "title": "Data Platform Engineer",
        "company": "OVO",
        "description": "Build real-time data platform for fintech analytics and fraud detection pipelines.",
        "required_skills": ["Python", "Kafka", "Apache Spark", "PostgreSQL", "Docker", "Git"],
        "location": "Jakarta",
        "is_remote": True,
        "apply_url": "https://www.linkedin.com/jobs/search/?keywords=data+engineer+ovo+jakarta",
    },

    # ── AI / ML ───────────────────────────────────────────────────────────
    {
        "title": "Machine Learning Engineer (Junior)",
        "company": "AI Nusantara",
        "description": "Train, evaluate, and deploy ML models for computer vision tasks.",
        "required_skills": ["Python", "TensorFlow", "machine learning", "deep learning", "Git", "Docker"],
        "location": "Remote",
        "is_remote": True,
        "apply_url": "https://glints.com/id/opportunities/jobs/explore?keyword=machine+learning+engineer&country=ID",
    },
    {
        "title": "NLP Engineer",
        "company": "ChatbotKu",
        "description": "Build NLP pipelines for sentiment analysis and Indonesian text classification.",
        "required_skills": ["Python", "nlp", "PyTorch", "transformers", "machine learning", "Git"],
        "location": "Jakarta",
        "is_remote": True,
        "apply_url": "https://www.kalibrr.com/id-ID/job-board/te/chatbotku",
    },
    {
        "title": "Computer Vision Engineer",
        "company": "VerifikasiID",
        "description": "Develop face recognition and KTP OCR systems using OpenCV and deep learning.",
        "required_skills": ["Python", "computer vision", "OpenCV", "deep learning", "TensorFlow", "Git"],
        "location": "Jakarta",
        "is_remote": False,
        "apply_url": "https://www.linkedin.com/jobs/search/?keywords=computer+vision+engineer+jakarta",
    },
    {
        "title": "MLOps Engineer",
        "company": "TokopediaAI",
        "description": "Build ML infrastructure: feature stores, model serving, A/B testing, monitoring.",
        "required_skills": ["Python", "Docker", "Kubernetes", "MLflow", "machine learning", "Git", "FastAPI"],
        "location": "Jakarta",
        "is_remote": True,
        "apply_url": "https://www.tokopedia.com/careers/",
    },
    {
        "title": "AI Research Engineer",
        "company": "LabAI Indonesia",
        "description": "Research and prototype LLM-based applications for Indonesian language understanding.",
        "required_skills": ["Python", "PyTorch", "transformers", "nlp", "machine learning", "Git"],
        "location": "Remote",
        "is_remote": True,
        "apply_url": "https://glints.com/id/opportunities/jobs/explore?keyword=ai+research+engineer&country=ID",
    },
    {
        "title": "Recommendation System Engineer",
        "company": "Lazada Indonesia",
        "description": "Build and optimize product recommendation engine using collaborative filtering.",
        "required_skills": ["Python", "machine learning", "scikit-learn", "SQL", "Redis", "Git"],
        "location": "Jakarta",
        "is_remote": False,
        "apply_url": "https://careers.lazada.sg/",
    },

    # ── Mobile ────────────────────────────────────────────────────────────
    {
        "title": "Mobile Developer (Flutter)",
        "company": "PayEase",
        "description": "Ship cross-platform mobile features with Flutter.",
        "required_skills": ["Dart", "Flutter", "REST API", "Git", "Firebase"],
        "location": "Jakarta",
        "is_remote": True,
        "apply_url": "https://glints.com/id/opportunities/jobs/explore?keyword=flutter+developer&country=ID",
    },
    {
        "title": "Android Developer (Kotlin)",
        "company": "GojekMitra",
        "description": "Build native Android apps using Kotlin and Jetpack Compose.",
        "required_skills": ["Kotlin", "Android", "REST API", "Git", "Firebase"],
        "location": "Jakarta",
        "is_remote": False,
        "apply_url": "https://www.gojek.com/id-id/about/careers/",
    },
    {
        "title": "React Native Developer",
        "company": "TravelKita",
        "description": "Develop cross-platform travel apps using React Native.",
        "required_skills": ["React Native", "JavaScript", "TypeScript", "REST API", "Git"],
        "location": "Bali",
        "is_remote": True,
        "apply_url": "https://www.kalibrr.com/id-ID/job-board/te/travelkita",
    },
    {
        "title": "iOS Developer (Swift)",
        "company": "Dana Indonesia",
        "description": "Build and maintain iOS e-wallet app with 20M+ users using Swift and UIKit.",
        "required_skills": ["Swift", "iOS", "Xcode", "REST API", "Git", "Firebase"],
        "location": "Jakarta",
        "is_remote": False,
        "apply_url": "https://dana.id/karir",
    },
    {
        "title": "Senior Flutter Developer",
        "company": "SehatQ",
        "description": "Lead mobile development for telemedicine app. Architect state management solutions.",
        "required_skills": ["Dart", "Flutter", "REST API", "Firebase", "Git", "BLoC"],
        "location": "Jakarta",
        "is_remote": True,
        "apply_url": "https://www.linkedin.com/jobs/search/?keywords=flutter+developer+sehatq",
    },

    # ── DevOps / Cloud ────────────────────────────────────────────────────
    {
        "title": "DevOps Intern",
        "company": "CloudNine ID",
        "description": "CI/CD, Linux, containers, and monitoring basics.",
        "required_skills": ["Linux", "Docker", "Git", "ci/cd", "Bash"],
        "location": "Remote",
        "is_remote": True,
        "apply_url": "https://glints.com/id/opportunities/jobs/explore?keyword=devops+intern&country=ID",
    },
    {
        "title": "Cloud Engineer (AWS)",
        "company": "InfraKita",
        "description": "Manage AWS infrastructure, implement IaC with Terraform, handle deployments.",
        "required_skills": ["AWS", "Terraform", "Docker", "Kubernetes", "Linux", "ci/cd", "Git"],
        "location": "Jakarta",
        "is_remote": True,
        "apply_url": "https://www.kalibrr.com/id-ID/job-board/te/infrakita",
    },
    {
        "title": "Site Reliability Engineer (Junior)",
        "company": "MediaStreamID",
        "description": "Monitor system uptime, automate operations, improve observability.",
        "required_skills": ["Linux", "Docker", "Kubernetes", "Python", "Prometheus", "Git"],
        "location": "Remote",
        "is_remote": True,
        "apply_url": "https://www.linkedin.com/jobs/search/?keywords=sre+engineer+indonesia",
    },
    {
        "title": "Platform Engineer (GCP)",
        "company": "Bukalapak",
        "description": "Build internal developer platform on Google Cloud. IaC with Terraform and Helm.",
        "required_skills": ["GCP", "Terraform", "Kubernetes", "Docker", "Go", "Git", "Linux"],
        "location": "Jakarta",
        "is_remote": True,
        "apply_url": "https://careers.bukalapak.com/",
    },
    {
        "title": "Infrastructure Engineer",
        "company": "Kata.ai",
        "description": "Own cloud infrastructure for AI/chatbot platform serving enterprise clients.",
        "required_skills": ["AWS", "Docker", "Kubernetes", "Terraform", "Python", "Linux", "Git"],
        "location": "Jakarta",
        "is_remote": True,
        "apply_url": "https://kata.ai/careers",
    },

    # ── QA / Testing ──────────────────────────────────────────────────────
    {
        "title": "QA Engineer (Manual & Automation)",
        "company": "FinTechMu",
        "description": "Write test cases, perform regression testing, and automate tests with Selenium.",
        "required_skills": ["Selenium", "Python", "Git", "SQL", "Postman"],
        "location": "Jakarta",
        "is_remote": False,
        "apply_url": "https://glints.com/id/opportunities/jobs/explore?keyword=qa+engineer&country=ID",
    },
    {
        "title": "SDET (Software Dev Engineer in Test)",
        "company": "Blibli",
        "description": "Build API and UI automation frameworks. Champion quality across product squads.",
        "required_skills": ["Java", "Selenium", "REST API", "Git", "SQL", "CI/CD"],
        "location": "Jakarta",
        "is_remote": False,
        "apply_url": "https://www.blibli.com/page/karir",
    },
    {
        "title": "QA Automation Engineer",
        "company": "Xendit",
        "description": "Automate end-to-end payment flows. Work with payment APIs and fintech compliance.",
        "required_skills": ["Python", "Playwright", "Postman", "Git", "SQL", "REST API"],
        "location": "Jakarta",
        "is_remote": True,
        "apply_url": "https://www.xendit.co/en/careers/",
    },

    # ── Security ──────────────────────────────────────────────────────────
    {
        "title": "Junior Cybersecurity Analyst",
        "company": "SecureNet ID",
        "description": "Monitor network traffic, perform vulnerability assessments, and respond to incidents.",
        "required_skills": ["Linux", "Bash", "networking", "Python", "Git", "SQL"],
        "location": "Jakarta",
        "is_remote": False,
        "apply_url": "https://www.jobstreet.co.id/en/job-search/cybersecurity-analyst-jobs/",
    },
    {
        "title": "Application Security Engineer",
        "company": "BCA Digital",
        "description": "Conduct security reviews, penetration testing, and SAST/DAST integration.",
        "required_skills": ["Python", "Linux", "networking", "Git", "SQL", "Docker"],
        "location": "Jakarta",
        "is_remote": False,
        "apply_url": "https://karir.bca.co.id/",
    },

    # ── UI/UX + Design ────────────────────────────────────────────────────
    {
        "title": "Frontend Developer (UI Focus)",
        "company": "DesignHub",
        "description": "Implement pixel-perfect designs from Figma into React components.",
        "required_skills": ["React", "TypeScript", "Figma", "CSS", "Tailwind CSS", "Git"],
        "location": "Bandung",
        "is_remote": True,
        "apply_url": "https://glints.com/id/opportunities/jobs/explore?keyword=frontend+developer+ui&country=ID",
    },

    # ── Blockchain / Web3 ────────────────────────────────────────────────
    {
        "title": "Blockchain Developer",
        "company": "Web3 Nusantara",
        "description": "Write and audit Solidity smart contracts for DeFi and NFT marketplace.",
        "required_skills": ["Solidity", "JavaScript", "TypeScript", "Git", "Hardhat", "Web3.js"],
        "location": "Remote",
        "is_remote": True,
        "apply_url": "https://www.linkedin.com/jobs/search/?keywords=blockchain+developer+indonesia",
    },
    {
        "title": "Blockchain Backend Engineer",
        "company": "TokenAja",
        "description": "Build blockchain indexing service and wallet APIs using Node.js and Go.",
        "required_skills": ["Go", "Node.js", "PostgreSQL", "Docker", "Git", "REST API"],
        "location": "Jakarta",
        "is_remote": True,
        "apply_url": "https://www.kalibrr.com/id-ID/job-board/te/tokenaja",
    },

    # ── IoT / Embedded ────────────────────────────────────────────────────
    {
        "title": "IoT Software Engineer",
        "company": "SmartFactory ID",
        "description": "Develop firmware and cloud connectivity for industrial IoT sensors.",
        "required_skills": ["Python", "C", "MQTT", "Docker", "Linux", "Git", "REST API"],
        "location": "Bekasi",
        "is_remote": False,
        "apply_url": "https://www.jobstreet.co.id/en/job-search/iot-engineer-jobs/",
    },
    {
        "title": "Embedded Software Engineer",
        "company": "RobotikaNusa",
        "description": "Program microcontrollers and develop real-time systems for industrial robotics.",
        "required_skills": ["C", "C++", "Linux", "Git", "Python", "Bash"],
        "location": "Bandung",
        "is_remote": False,
        "apply_url": "https://glints.com/id/opportunities/jobs/explore?keyword=embedded+engineer+bandung&country=ID",
    },

    # ── Game / Creative Tech ──────────────────────────────────────────────
    {
        "title": "Game Developer (Unity)",
        "company": "GameStudio Nusantara",
        "description": "Develop 2D mobile games using Unity and C#.",
        "required_skills": ["Unity", "C#", "Git", "JavaScript"],
        "location": "Yogyakarta",
        "is_remote": True,
        "apply_url": "https://glints.com/id/opportunities/jobs/explore?keyword=unity+developer&country=ID",
    },
    {
        "title": "AR/VR Developer",
        "company": "ImmersiveID",
        "description": "Build augmented reality training simulations for manufacturing and education.",
        "required_skills": ["Unity", "C#", "AR Kit", "Git", "3D Modeling"],
        "location": "Bandung",
        "is_remote": True,
        "apply_url": "https://www.linkedin.com/jobs/search/?keywords=ar+vr+developer+indonesia",
    },

    # ── Product Engineering ───────────────────────────────────────────────
    {
        "title": "Software Engineer (Generalist)",
        "company": "Koinworks",
        "description": "Build fintech features across web and mobile. Work closely with product and design.",
        "required_skills": ["Python", "JavaScript", "PostgreSQL", "REST API", "Git", "Docker"],
        "location": "Jakarta",
        "is_remote": True,
        "apply_url": "https://koinworks.com/blog/karir/",
    },
    {
        "title": "Platform Software Engineer",
        "company": "Ajaib",
        "description": "Build core infrastructure for stock trading platform. High reliability & compliance.",
        "required_skills": ["Go", "PostgreSQL", "Kafka", "Docker", "Kubernetes", "Git"],
        "location": "Jakarta",
        "is_remote": True,
        "apply_url": "https://ajaib.co.id/karir/",
    },
    {
        "title": "Junior Software Engineer (Internship)",
        "company": "Tiket.com",
        "description": "6-month internship program. Contribute to real features under senior mentorship.",
        "required_skills": ["Python", "JavaScript", "Git", "SQL", "REST API"],
        "location": "Jakarta",
        "is_remote": False,
        "apply_url": "https://www.tiket.com/karir",
    },
]


def seed_jobs_if_empty(db: Session) -> None:
    count = db.query(Job).count()
    if count > 0:
        return
    for row in DUMMY_JOBS:
        db.add(
            Job(
                id=uuid.uuid4(),
                title=row["title"],
                company=row["company"],
                description=row["description"],
                required_skills=row["required_skills"],
                location=row.get("location"),
                is_remote=row.get("is_remote", False),
                apply_url=row.get("apply_url"),
            )
        )
    db.commit()


def reseed_jobs(db: Session) -> int:
    """Hapus semua job lama lalu isi ulang dengan data terbaru. Return jumlah job baru."""
    db.query(Job).delete()
    db.commit()
    for row in DUMMY_JOBS:
        db.add(
            Job(
                id=uuid.uuid4(),
                title=row["title"],
                company=row["company"],
                description=row["description"],
                required_skills=row["required_skills"],
                location=row.get("location"),
                is_remote=row.get("is_remote", False),
                apply_url=row.get("apply_url"),
            )
        )
    db.commit()
    return len(DUMMY_JOBS)

from fastapi import FastAPI
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional
import json, re, numpy as np, os
from sentence_transformers import SentenceTransformer
from groq import Groq
from dotenv import load_dotenv

load_dotenv()

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
if not GROQ_API_KEY:
    raise ValueError("GROQ_API_KEY not found in .env")

app = FastAPI()
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

groq_client = Groq(api_key=GROQ_API_KEY)
model       = SentenceTransformer("all-MiniLM-L6-v2")

CHUNKS_FILE = "rag_chunks_clean.json" if os.path.exists("rag_chunks_clean.json") else "rag_chunks.json"
print(f"Loading: {CHUNKS_FILE}")

with open(CHUNKS_FILE, "r", encoding="utf-8") as f:
    raw_docs = json.load(f)

documents = [d for d in raw_docs if len(d.get("text","").strip()) > 80 and "JFIF" not in d.get("text","")]
texts          = [d["text"] for d in documents]
doc_embeddings = model.encode(texts, convert_to_numpy=True, show_progress_bar=True)
print(f"Loaded {len(documents)} chunks.")

CEC_FACTS = """
KEY FACTS ABOUT COLLEGE OF ENGINEERING CHENGANNUR (CEC):
- Principal: Dr. Hari V S | Email: principal@ceconline.edu | Phone: 8547005032
- Address: College of Engineering Chengannur, Chengannur P.O., Alappuzha District, Kerala 689121
- Phone: +91-479-2455125 (Reception), +91-479-2454125 (Office), +91-479-2456046 (Principal)

B.TECH PROGRAMMES AT CEC (ONLY these engineering programmes — no medical, pharmacy, agriculture):
  * B.Tech Computer Science & Engineering (CSE) — 180 Seats
  * B.Tech Computer Science & Engineering (AI & ML) — 60 Seats
  * B.Tech Electronics & Communication Engineering (ECE) — 120 Seats
  * B.Tech Electrical & Electronics Engineering (EEE) — 60 Seats
  * MCA (Master of Computer Applications) — 60 Seats (PG, started 2022)
- Affiliated to APJ Abdul Kalam Technological University (KTU)

HODs:
  * CS / Computer Engineering HOD: Dr. Renu George (Assistant Professor & Head of Department)
  * Electronics & Communication HOD: Dr. C V Anil Kumar (Associate Professor & Head)

HOSTELS (6 hostels total):
  * Men's Hostel I (adjacent to campus, capacity 70)
  * Men's Hostel II (reserved for 1st year students)
  * Ladies Hostel – Vrindavan
  * Ladies Hostel – Gokulam
  * Ladies Hostel – Nandanam
  * Ladies Hostel – Madhavam (Mithramadam Junction)
"""

DEPT_ALIASES = {
    r"\bcs\b"              : "computer engineering CSE",
    r"\bcse\b"             : "computer engineering CSE",
    r"\bcomputer science\b": "computer engineering CSE",
    r"\bec\b"              : "electronics engineering ECE",
    r"\bece\b"             : "electronics engineering ECE",
    r"\bee\b"              : "electrical engineering EEE",
    r"\beee\b"             : "electrical engineering EEE",
}

KEYWORD_URLS = {
    ("principal", "who is principal", "head of college", "college head", "whos the principal"):
        ["ceconline.edu/administrators/hari", "ceconline.edu/about/administration", "ceconline.edu/about/committees/rti"],
    ("courses", "programmes", "programs", "what branches", "which branches", "available courses",
     "what can i study", "streams", "branches available", "what courses"):
        ["ceconline.edu/b-tech-admissionsnew", "ceconline.edu/admission/btech_admissions",
         "ceconline.edu/academics/departments"],
    ("hostel", "accommodation", "staying", "residence", "lodge"):
        ["ceconline.edu/about/facilities/hostel"],
    ("fee", "fees", "tuition", "how much", "cost", "charges", "fee structure"):
        ["ceconline.edu/wpdata/btechspotfee.pdf", "ceconline.edu/wpdata/NRIFee.pdf",
         "ceconline.edu/wpdata/LTAdmnFeestructure.pdf", "ceconline.edu/b-tech-admissionsnew"],
    ("placement", "companies", "recruiting", "job", "salary", "package", "campus recruitment"):
        ["ceconline.edu/placement"],
    ("admission", "apply", "how to join", "keam", "eligibility", "how to get admission", "joining"):
        ["ceconline.edu/b-tech-admissionsnew", "ceconline.edu/admission/btech_admissions"],
    ("contact", "phone number", "address", "location", "email", "reach", "where is"):
        ["ceconline.edu/contact-us"],
    ("hod of cs", "hod cs", "head of cs", "head computer", "hod computer", "hod of cse", "hod cse"):
        ["ceconline.edu/academics/departments/computer-science"],
    ("hod of ec", "hod ece", "head of electronics", "hod electronics", "hod ec"):
        ["ceconline.edu/academics/departments/electronics_engineering"],
    ("scholarship", "financial aid", "fee waiver", "stipend"):
        ["ceconline.edu/scholarships"],
    ("bus", "transport", "how to reach", "conveyance", "bus service", "bus route"):
        ["ceconline.edu/about/facilities/bus-service"],
    ("facilities", "infrastructure", "labs", "library", "gym"):
        ["ceconline.edu/about/facilities"],
    ("anti ragging", "ragging", "grievance", "complaint"):
        ["ceconline.edu/about/committees/anti_ragging", "ceconline.edu/grievance-redressal"],
    ("nss", "ncc", "ieee", "club", "organization", "association", "student club"):
        ["ceconline.edu/organizations"],
    ("alumni", "old students", "ex students"):
        ["ceconline.edu/alumni"],
    ("mca", "master of computer", "pg admission"):
        ["ceconline.edu/admission/mca-admissions", "ceconline.edu/mca-admissions-2025-26"],
    ("nri", "nri admission", "nri fee"):
        ["ceconline.edu/wpdata/NRIAdmn..pdf", "ceconline.edu/wpdata/NRIFee.pdf"],
    ("lateral entry", "lateral admission"):
        ["ceconline.edu/wpdata/LTAdmnFeestructure.pdf", "ceconline.edu/wpdata/Lateral.pdf"],
}

TOPIC_EXPANSIONS = {
    "admission"  : "admission apply eligibility criteria btech mca intake keam",
    "fees"       : "fee tuition scholarship payment structure amount",
    "faculties"  : "faculty professor hod head department staff lecturer",
    "faculty"    : "faculty professor hod head department staff lecturer",
    "placement"  : "placement recruitment company package salary campus drive",
    "hostel"     : "hostel accommodation boys girls mens ladies rooms facilities",
    "contact"    : "contact address phone email location reach",
    "academics"  : "course programme department btech mca seats syllabus",
}

class Query(BaseModel):
    question: str
    purpose : Optional[str] = None


def normalise(query: str) -> str:
    q = query.lower()
    for pattern, replacement in DEPT_ALIASES.items():
        q = re.sub(pattern, replacement, q)
    return q


def keyword_chunks(query: str) -> list:
    q = query.lower()
    forced_urls = []
    for keywords, urls in KEYWORD_URLS.items():
        if any(kw in q for kw in keywords):
            forced_urls.extend(urls)
    if not forced_urls:
        return []
    results, seen = [], set()
    for d in documents:
        url = d.get("url", "")
        if any(fu in url for fu in forced_urls):
            key = d["text"][:80]
            if key not in seen:
                seen.add(key)
                results.append({"text": d["text"], "url": url, "title": d.get("title",""), "score": 1.0})
    return results[:6]


def semantic_chunks(query: str, purpose: str, top_k: int = 6) -> list:
    expanded = normalise(query)
    if purpose and purpose.lower() in TOPIC_EXPANSIONS:
        expanded += " " + TOPIC_EXPANSIONS[purpose.lower()]
    qe    = model.encode(expanded, convert_to_numpy=True)
    norms = np.linalg.norm(doc_embeddings, axis=1) * np.linalg.norm(qe)
    norms[norms == 0] = 1e-10
    sims  = np.dot(doc_embeddings, qe) / norms
    top_idx = np.argsort(sims)[-top_k:][::-1]
    if sims[top_idx[0]] < 0.22:
        return []
    results, seen = [], set()
    for i in top_idx:
        key = documents[i]["text"][:80]
        if key in seen:
            continue
        seen.add(key)
        results.append({
            "text" : documents[i]["text"],
            "url"  : documents[i].get("url",""),
            "title": documents[i].get("title",""),
            "score": float(sims[i]),
        })
    return results


def retrieve_chunks(query: str, purpose: str = None) -> list:
    kw  = keyword_chunks(query)
    sem = semantic_chunks(query, purpose, top_k=6)
    seen, merged = set(), []
    for c in kw + sem:
        key = c["text"][:80]
        if key not in seen:
            seen.add(key)
            merged.append(c)
    return merged[:8]


def generate_answer(question: str, chunks: list, purpose: str = None) -> str:
    context = "\n\n".join(
        f"[Source: {c['title'] or c['url']}]\n{c['text']}"
        for c in chunks
    )
    topic_hint = f" The user is asking about: {purpose}." if purpose else ""

    prompt = f"""You are a helpful and accurate assistant for College of Engineering Chengannur (CEC), Kerala.
Answer the question using the KEY FACTS and CONTEXT below.{topic_hint}

{CEC_FACTS}

RULES:
- Always answer directly and confidently — the KEY FACTS above are 100% accurate
- Use bullet points when listing multiple items
- For courses: list ONLY CEC programmes (CSE, AI&ML, ECE, EEE, MCA) — never mention medical/pharmacy/other colleges
- For hostel: list all 6 hostels from KEY FACTS
- For principal: Dr. Hari V S
- For HOD CS/CSE/Computer Science: Dr. Renu George
- Never say "not mentioned" if the answer is in KEY FACTS
- Never include student personal data

CONTEXT FROM COLLEGE WEBSITE:
{context}

Question: {question}

Answer:"""

    response = groq_client.chat.completions.create(
        model="llama-3.1-8b-instant",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.1,
        max_tokens=500,
    )
    return response.choices[0].message.content.strip()


@app.post("/chat")
def chat(query: Query):
    chunks = retrieve_chunks(query.question, purpose=query.purpose)
    if not chunks:
        return {"answer": "I couldn't find relevant information. Please contact CEC at 0479-2452240 or principal@ceconline.edu"}
    answer  = generate_answer(query.question, chunks, query.purpose)
    sources = list({c["url"] for c in chunks if c["url"]})
    return {"answer": answer, "sources": sources[:3]}


@app.get("/health")
def health():
    return {"status": "ok", "chunks_loaded": len(documents), "chunks_file": CHUNKS_FILE}

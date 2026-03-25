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
Answer the question using the retrieved information only.{topic_hint}



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

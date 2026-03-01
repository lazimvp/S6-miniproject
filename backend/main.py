from fastapi import FastAPI
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional
import json
import numpy as np
from sentence_transformers import SentenceTransformer
from groq import Groq
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

GROQ_API_KEY = os.getenv("GROQ_API_KEY")

if not GROQ_API_KEY:
    raise ValueError("GROQ_API_KEY not found. Make sure your .env file is set correctly.")

# Initialize FastAPI
app = FastAPI()

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Groq client
groq_client = Groq(api_key=GROQ_API_KEY)

# Load embedding model
model = SentenceTransformer("all-MiniLM-L6-v2")

# Load scraped data
with open("rag_chunks.json", "r", encoding="utf-8") as f:
    raw_docs = json.load(f)

documents = [
    doc for doc in raw_docs
    if len(doc.get("text", "")) > 120 and "JFIF" not in doc.get("text", "")
]

texts = [doc["text"] for doc in documents]
doc_embeddings = model.encode(texts, convert_to_numpy=True)


# Request model
class Query(BaseModel):
    question: str
    purpose: Optional[str] = None


def retrieve_chunks(query, top_k=3):
    query_embedding = model.encode(query, convert_to_numpy=True)

    sims = np.dot(doc_embeddings, query_embedding) / (
        np.linalg.norm(doc_embeddings, axis=1) * np.linalg.norm(query_embedding)
    )

    top_idx = np.argsort(sims)[-top_k:][::-1]

    if sims[top_idx[0]] < 0.4:
        return None

    return [documents[i]["text"] for i in top_idx]


def generate_answer_groq(question, chunks):
    context = "\n\n".join(chunks)

    prompt = f"""
You are a college information assistant.
Answer clearly and concisely using ONLY the information provided in the context.
Do NOT use outside knowledge.
If the answer is not present in the context, reply exactly:
Information not available in official records.

Context:
{context}

Question:
{question}

Answer:
"""

    response = groq_client.chat.completions.create(
        model="llama-3.1-8b-instant",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.2,
        max_tokens=300
    )

    return response.choices[0].message.content.strip()


@app.post("/chat")
def chat(query: Query):
    q = query.question.lower()
    p = query.purpose.lower() if query.purpose else None
    

    # Semantic retrieval
    chunks = retrieve_chunks(query.question)
    if not chunks:
        return {"answer": "Information not available in the records."}

    answer = generate_answer_groq(query.question, chunks)
    return {"answer": answer}
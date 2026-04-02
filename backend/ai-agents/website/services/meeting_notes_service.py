# services/meeting_notes_service.py
import os
from typing import Dict, Any
from uuid import uuid4
import chromadb
from sentence_transformers import SentenceTransformer

chroma_client = chromadb.PersistentClient(path="./chroma")
collection = chroma_client.get_or_create_collection(
    name="qa_instructions",
    metadata={"hnsw:space": "cosine"}
)

embedder = SentenceTransformer("all-MiniLM-L6-v2")


class MeetingNotesService:

    @staticmethod
    def embed_text(text: str):
        if not text:
            return None
        return embedder.encode(text).tolist()

    @staticmethod
    def save_metadata(payload: Dict[str, Any]):
        print("PAYLOAD RECEIVED:", payload)
        title      = payload.get("title", "Untitled")
        project    = payload.get("project", "Unassigned")
        date       = payload.get("date", "")
        notes      = payload.get("notes", "")
        meeting_id = payload.get("meeting_id") or str(uuid4())
        print("MEETING ID:", meeting_id)

        if not notes:
            notes = title  # fallback if notes is empty

        emb = MeetingNotesService.embed_text(notes)
        if emb:
            collection.add(
                ids=[meeting_id],
                embeddings=[emb],
                metadatas=[{
                    "title":   title,
                    "project": project,
                    "date":    date,
                    "type":    "meeting_note",
                }],
                documents=[notes],
            )

    @staticmethod
    def search(query: str):
        emb = MeetingNotesService.embed_text(query)
        result = collection.query(query_embeddings=[emb], n_results=5)
        return result

    @staticmethod
    def summarize(meeting_id: str):
        result = collection.get(ids=[meeting_id])
        if result and result["documents"]:
            return result["documents"][0]
        return "No notes found for this meeting."

    @staticmethod
    def delete(meeting_id: str):
        collection.delete(ids=[meeting_id])

    @staticmethod
    def list_all():
        try:
            results = collection.get()
            files = []
            seen_titles = set()
            for i, doc in enumerate(results.get("documents", [])):
                meta = results["metadatas"][i] if results.get("metadatas") else {}
                doc_id = results["ids"][i]
                title = meta.get("title", doc[:40])
                if title not in seen_titles:
                    seen_titles.add(title)
                    files.append({
                        "id":         doc_id,
                        "name":       title,
                        "type":       "Meeting Notes",
                        "project":    meta.get("project", "Unassigned"),
                        "uploadDate": meta.get("date", ""),
                        "size":       f"{len(doc)} chars",
                        "status":     meta.get("status", "Processed")
                    })
            return {"files": files}
        except Exception as e:
            return {"files": []}

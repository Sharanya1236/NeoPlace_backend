import os
import requests
from dotenv import load_dotenv

from langchain.docstore.document import Document
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import FAISS
# --- MODIFIED: Import the new offline embedding model ---
from langchain_community.embeddings import HuggingFaceEmbeddings

def create_and_save_knowledge_base():
    print("--- Starting Knowledge Base Build Process ---")
    
    load_dotenv()
    # We don't need the Google API key for this script anymore!

    FAISS_INDEX_PATH = "faiss_index"
    if os.path.exists(FAISS_INDEX_PATH):
        print(f"⚠️ Found existing index at '{FAISS_INDEX_PATH}'. Delete it to rebuild. Exiting.")
        return

    API_URL = "http://localhost:3000/api/companies"
    
    try:
        print(f"🔧 Fetching live company data from {API_URL}...")
        response = requests.get(API_URL)
        response.raise_for_status()
        companies_json = response.json()
        print(f"✅ Received data for {len(companies_json)} companies.")

        # Your document processing code remains the same...
        all_documents = []
        for company in companies_json:
            # (Your logic for creating the 'content' string goes here)
            content = (
                f"Company Name: {company.get('name', 'N/A')}\n"
                f"Description: {company.get('description', 'N/A')}\n"
                f"Placement Rounds: {', '.join(company.get('rounds', []))}\n"
                f"Topics to Prepare: ...\n" # Make sure your full content logic is here
                f"Sample Questions: ..."
            )
            doc = Document(page_content=content, metadata={"source": company.get('name')})
            all_documents.append(doc)

        print("-> Splitting documents into chunks...")
        text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)
        texts = text_splitter.split_documents(all_documents)

        print("-> Creating vector store using a local model (this will download the model on the first run)...")
        # --- MODIFIED: Use the free, offline Hugging Face model ---
        model_name = "sentence-transformers/all-MiniLM-L6-v2"
        embeddings = HuggingFaceEmbeddings(model_name=model_name)
        
        vector_store = FAISS.from_documents(texts, embeddings)
        vector_store.save_local(FAISS_INDEX_PATH)
        print(f"✅ SUCCESS! Knowledge base built and saved to '{FAISS_INDEX_PATH}'.")
        
    except Exception as e:
        print(f"‼️ AN ERROR OCCURRED: {e}")
        print("--- Build process failed. ---")

if __name__ == "__main__":
    create_and_save_knowledge_base()
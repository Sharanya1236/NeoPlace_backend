import os
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
import json
import io
from PyPDF2 import PdfReader

# --- LangChain specific imports ---
from langchain_community.vectorstores import FAISS
from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain.prompts import PromptTemplate
from langchain_core.output_parsers import StrOutputParser


# --- SETUP ---
load_dotenv()
app = Flask(__name__)
CORS(app)

api_key = os.getenv("GEMINI_API_KEY")
if not api_key:
    print("❌ FATAL: GEMINI_API_KEY not found in .env file.")
else:
    os.environ["GOOGLE_API_KEY"] = api_key
    print("✅ Gemini API key configured successfully.")

# --- GLOBAL KNOWLEDGE BASE ---
vector_store = None
FAISS_INDEX_PATH = "faiss_index"

def load_knowledge_base():
    """
    Loads the pre-built FAISS index from disk using the offline model.
    """
    global vector_store
    if os.path.exists(FAISS_INDEX_PATH):
        try:
            print(f"✅ Loading existing knowledge base from '{FAISS_INDEX_PATH}'...")
            model_name = "sentence-transformers/all-MiniLM-L6-v2"
            embeddings = HuggingFaceEmbeddings(model_name=model_name)
            
            vector_store = FAISS.load_local(
                FAISS_INDEX_PATH, 
                embeddings, 
                allow_dangerous_deserialization=True
            )
            print("✅ Knowledge base loaded successfully.")
        except Exception as e:
            print(f"‼️ FAILED to load knowledge base: {e}")
    else:
        print(f"❌ CRITICAL: Knowledge base not found at '{FAISS_INDEX_PATH}'.")
        print("👉 Please run the 'python build_index.py' script first to create it.")

# --- THE CHAT ROUTE ---
# REPLACE your old smart_chat function with this one

@app.route('/api/chat', methods=['POST'])
def smart_chat():
    if not vector_store and not api_key: 
         return jsonify({"error": "AI service is not configured"}), 500

    data = request.get_json()
    user_question = data.get('message')
    
    if not user_question:
        return jsonify({"error": "Message is required"}), 400

    try:
        print(f"-> User question: '{user_question}'")
        
        # --- Keyword detection (same as before) ---
        placement_keywords = [
            'company', 'companies', 'placement', 'interview', 'rounds', 
            'prepare', 'preparation', 'topics', 'questions', 'hiring', 
            'recruiting', 'eligibility', 'criteria', 'package', 'salary',
            'course', 'courses', 'coding', 'problem', 'ats', 'resume' 
        ]
        is_placement_question = any(keyword in user_question.lower() for keyword in placement_keywords)
        
        prompt_template_str = ""
        input_variables = {}
        relevant_docs = []

        if is_placement_question and vector_store:
            print("-> Placement question detected. Searching knowledge base...")
            relevant_docs = vector_store.similarity_search(user_question)
            
            # --- THIS IS THE NEW, SMARTER PROMPT ---
            prompt_template_str = """
            You are a helpful and friendly placement assistant chatbot for the Placement Hub app.
            Answer the user's question about placements, companies, courses, or preparation.

            Use the following CONTEXT from the app's database as your primary source of truth. Prioritize information found in the CONTEXT.
            However, if the CONTEXT is missing details or doesn't fully answer the question, supplement your answer with your general knowledge about the company, technologies, or interview processes.
            Clearly indicate when information comes directly from the CONTEXT versus your general knowledge, if possible (e.g., "According to our database...", "Generally, companies like this...").
            If you cannot answer the question using either the CONTEXT or your general knowledge, say so politely.

            CONTEXT:
            {context}

            USER QUESTION:
            {question}

            ASSISTANT ANSWER:
            """
            input_variables = {"context": relevant_docs, "question": user_question}
            
        else:
            print("-> General question detected. Using Gemini's general knowledge...")
            # STRATEGY 2: General Knowledge (same as before)
            prompt_template_str = """
            You are a helpful AI assistant. Answer the user's question clearly and concisely.

            USER QUESTION:
            {question}

            ASSISTANT ANSWER:
            """
            input_variables = {"question": user_question}

        # --- Setup the chain and generate response (same as before) ---
        prompt = PromptTemplate.from_template(prompt_template_str)
        model = ChatGoogleGenerativeAI(model="gemini-pro-latest", temperature=0.5) 
        chain = prompt | model | StrOutputParser()

        print("-> Generating response with Gemini...")
        response = chain.invoke(input_variables)
        
        print(f"<- Bot response: '{response}'")
        return jsonify({"response": response})

    except Exception as e:
        print(f"‼️ CHAT ERROR: {e}")
        error_message = f"An error occurred: {str(e)}" 
        return jsonify({"error": error_message}), 500
# --- THE RESUME CHECKER ROUTE (UPGRADED AND MORE ROBUST) ---
@app.route('/check-resume', methods=['POST'])
def check_resume():
    if 'file' not in request.files:
        return jsonify({"message": "No file part in the request"}), 400

    file = request.files['file']
    if file.filename == '' or not file.filename.endswith('.pdf'):
        return jsonify({"message": "Invalid file. Please upload a PDF."}), 400

    try:
        print("📄 Received resume, extracting text...")
        pdf_stream = io.BytesIO(file.read())
        reader = PdfReader(pdf_stream)
        resume_text = "".join(page.extract_text() or "" for page in reader.pages)

        if not resume_text.strip():
            return jsonify({"message": "Could not extract text from the PDF."}), 400

        print("✅ Text extracted. Sending to Gemini for analysis...")

        model = ChatGoogleGenerativeAI(model="gemini-pro-latest", temperature=0.2)
        
        prompt_template = """
        You are an advanced Applicant Tracking System (ATS) bot...
        Analyze the resume text and provide a score out of 100 and actionable feedback.
        The final output MUST be a clean JSON object with two keys: "score" (an integer) and "feedback" (an array of strings).
        
        Resume Text:
        ---
        {resume_text}
        ---

        Provide your analysis in the following JSON format ONLY:
        {{
            "score": <integer_from_0_to_100>,
            "feedback": [
                "<feedback_point_1>",
                "<feedback_point_2>"
            ]
        }}
        """
        
        prompt = PromptTemplate.from_template(prompt_template)
        chain = prompt | model | StrOutputParser()

        response_str = chain.invoke({"resume_text": resume_text})
        
        # --- ROBUST JSON PARSING ---
        # Find the start and end of the JSON object, even if the AI adds extra text
        json_start = response_str.find('{')
        json_end = response_str.rfind('}') + 1
        
        if json_start == -1 or json_end == 0:
            print(f"‼️ JSON PARSING FAILED: Could not find a JSON object in the AI response.")
            print(f"--- AI Response was: ---\n{response_str}\n--------------------")
            raise ValueError("AI did not return a valid JSON object.")

        clean_json_str = response_str[json_start:json_end]
        ai_analysis = json.loads(clean_json_str)

        print("✅ Analysis complete. Sending back to user.")
        return jsonify(ai_analysis)

    except Exception as e:
        # Improved error logging to help debug
        print(f"‼️ AN ERROR OCCURRED during resume check: {e}")
        return jsonify({"message": f"An internal server error occurred while analyzing the resume."}), 500

# --- RUN THE APP ---
if __name__ == '__main__':
    load_knowledge_base()
    app.run(port=5000, debug=True)


import os
import google.generativeai as genai
from dotenv import load_dotenv

def list_my_models():
    """
    Connects to Google AI and lists all generative models available for your API key.
    """
    print("--- Checking for available Google AI models... ---")
    
    # Load the API key from your .env file
    load_dotenv()
    api_key = os.getenv("GEMINI_API_KEY")

    if not api_key:
        print("❌ FATAL: Could not find GEMINI_API_KEY in your .env file.")
        return

    try:
        genai.configure(api_key=api_key)

        print("\n✅ Found the following models:\n")
        
        for model in genai.list_models():
            # We only care about models that can generate content (the 'generateContent' method)
            if 'generateContent' in model.supported_generation_methods:
                print(f"- Model Name: {model.name}")
                print(f"  Supported Methods: {model.supported_generation_methods}\n")

        print("--- Check complete. ---")

    except Exception as e:
        print(f"‼️ An error occurred: {e}")

# --- Run the function when the script is executed ---
if __name__ == "__main__":
    list_my_models()
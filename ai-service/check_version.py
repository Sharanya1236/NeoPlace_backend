import os
import google.generativeai as genai
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

print("--- Running Diagnostic Script ---")

try:
    # Print the installed library version
    print(f"Library Version: {genai.__version__}")

    # Configure the API key
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        print("ERROR: GEMINI_API_KEY not found in .env file!")
    else:
        genai.configure(api_key=api_key)
        
        # List all available models
        print("\n--- Available Models ---")
        for m in genai.list_models():
            # Check if the model supports the 'generateContent' method
            if 'generateContent' in m.supported_generation_methods:
                print(m.name)
        print("------------------------")

except Exception as e:
    print(f"\nAn error occurred during diagnosis: {e}")
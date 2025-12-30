# backend/procurement/ai_assistant.py
import google.generativeai as genai  # or openai
from django.conf import settings

genai.configure(api_key=settings.GEMINI_API_KEY)

def suggest_pr_title_and_items(user_input: str, department: str = "") -> dict:
    prompt = f"""
    You are an expert procurement assistant for High Prosper Ltd (solar energy & services company).
    
    User request: "{user_input}"
    Department: {department or "General"}
    
    Generate:
    1. A professional PR title (max 80 chars)
    2. 3-8 line items with:
       - Item name (from catalog or logical new)
       - Suggested quantity
       - Brief reason
    
    Return ONLY JSON:
    {{
        "title": "...",
        "items": [
            {{"name": "...", "quantity": 1, "reason": "..."}},
            ...
        ]
    }}
    """

    model = genai.GenerativeModel('gemini-1.5-pro')
    response = model.generate_content(prompt)
    try:
        import json
        return json.loads(response.text)
    except:
        return {"title": "AI Suggested Requisition", "items": []}
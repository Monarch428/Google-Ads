from openai import OpenAI
import os

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

def generate_chatbot_reply(message: str) -> str:
    """
    AI assistant logic using GPT model.
    """
    prompt = f"""
    You are an AI assistant for Google Ads optimization.
    User: {message}
    Reply in a friendly and professional tone.
    """

    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "user", "content": prompt}]
    )

    return response.choices[0].message.content.strip()

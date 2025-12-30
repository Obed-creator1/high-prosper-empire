# ai_agent/amina.py
def initiate_outbound_call(customer):
    language = detect_language(customer.phone)

    script = f"""
    [In {language}]
    Hello {customer.name}, this is Amina from High Prosper.
    You have RWF 89,000 overdue.
    Can you pay 30,000 today and the rest next week?
    → Say "Yes", "No", or propose amount.
    """

    # Powered by ElevenLabs + Deepgram + GPT-4o
    call = twilio_client.calls.create(
        to=customer.phone,
        from_="+250783100100",
        url="https://ai.highprosper.africa/amina/twiml/",
        machine_detection="Enable"
    )

    # If customer says "30,000 next Friday" → auto-creates payment plan
    # Sends WhatsApp confirmation + HPC reward
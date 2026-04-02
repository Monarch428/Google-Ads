# test_meeting_notes.py

import os
from services.meeting_notes_service import process_instruction_file, run_qa_check
from fastapi import UploadFile
from io import BytesIO

# ----------------------------
# Helper to simulate UploadFile
# ----------------------------
def create_upload_file(file_content: str, filename: str) -> UploadFile:
    file_bytes = BytesIO(file_content.encode("utf-8"))
    return UploadFile(filename=filename, file=file_bytes)


# ----------------------------
# Test 1: Upload instruction file
# ----------------------------
def test_upload_instruction():
    print("Testing instruction file upload...")

    # Simulate a text instruction file
    file_content = "This is a sample instruction about QA checks for website content."
    upload_file = create_upload_file(file_content, "sample_instruction.txt")
    category = "testing"

    result = process_instruction_file(upload_file, category)
    print("Upload result:", result)


# ----------------------------
# Test 2: Run QA check
# ----------------------------
def test_run_qa_check():
    print("\nTesting QA check...")

    # Sample website text to compare
    website_text = "This is the website content to compare with stored instructions."

    report = run_qa_check(website_text)
    print("QA Check report:", report)


# ----------------------------
# Run tests
# ----------------------------
if __name__ == "__main__":
    # Make sure temp folder exists
    os.makedirs("temp", exist_ok=True)

    test_upload_instruction()
    test_run_qa_check()









from PyPDF2 import PdfReader
from docx import Document
from PIL import Image
import pytesseract # For OCR

def parse_pdf(file_path):
    """Extracts text from a PDF file."""
    text = ""
    try:
        with open(file_path, 'rb') as f:
            reader = PdfReader(f)
            for page in reader.pages:
                text += page.extract_text() or ""
    except Exception as e:
        print(f"Error parsing PDF {file_path}: {e}")
    return text

def parse_docx(file_path):
    """Extracts text from a DOCX file."""
    text = ""
    try:
        doc = Document(file_path)
        for para in doc.paragraphs:
            text += para.text + "\n"
    except Exception as e:
        print(f"Error parsing DOCX {file_path}: {e}")
    return text

def parse_image(file_path):
    """Extracts text from an image file using OCR (Tesseract)."""
    text = ""
    try:
        # Ensure Tesseract is installed and configured (e.g., tesseract_cmd)
        # You might need to set: pytesseract.pytesseract.tesseract_cmd = r'<path_to_tesseract_executable>'
        text = pytesseract.image_to_string(Image.open(file_path))
    except Exception as e:
        print(f"Error parsing image {file_path} with OCR: {e}")
        print("Make sure Tesseract OCR is installed and configured correctly.")
    return text

def parse_txt(file_path):
    """Extracts text from a TXT file."""
    text = ""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            text = f.read()
    except Exception as e:
        print(f"Error parsing TXT {file_path}: {e}")
    return text

def parse(file_path):
    """
    Determines file type and calls the appropriate parser.
    Returns the extracted text content.
    """
    if file_path.endswith(".pdf"):
        return parse_pdf(file_path)
    elif file_path.endswith(".docx"):
        return parse_docx(file_path)
    elif file_path.endswith((".png", ".jpg", ".jpeg", ".bmp", ".tiff")):
        return parse_image(file_path)
    elif file_path.endswith(".txt"):
        return parse_txt(file_path)
    else:
        print(f"Unsupported file type: {file_path}")
        return None

if __name__ == '__main__':
    # Create dummy files for testing
    with open("dummy.txt", "w") as f:
        f.write("This is a test text file.")

    # Note: For PDF, DOCX, and Image parsing, you'd need actual files.
    # Example:
    print("Parsing TXT:", parse("dummy.txt"))
    # print("Parsing PDF:", parse("example.pdf")) # Requires a PDF file
    # print("Parsing DOCX:", parse("example.docx")) # Requires a DOCX file
    # print("Parsing Image:", parse("example.png")) # Requires an image file and Tesseract installed

    import os
    os.remove("dummy.txt")

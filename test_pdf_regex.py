import pdfplumber
import requests
from io import BytesIO
import re

url = "https://drive.google.com/uc?export=download&id=1VXWQf8E4WMFwFNgPxbEs1R-YmGNgg4OP"
response = requests.get(url)
pdf = pdfplumber.open(BytesIO(response.content))

print(f"Total de páginas: {len(pdf.pages)}")

# Let's inspect the last page (usually night classes)
page = pdf.pages[-1]
text = page.extract_text()
print("--- Raw Text of Last Page ---")
print(text)

# Test the old regex
old_pattern = re.compile(r"\b(\d[A-D](?: ?- ?[A-Z]+)?)\b")
print("Turmas encontradas (Old Regex):", old_pattern.findall(text))

# Test the new regex
new_pattern = re.compile(r"\b(\d[A-Z](?: ?- ?[A-Z]+)?)\b")
print("Turmas encontradas (New Regex):", new_pattern.findall(text))

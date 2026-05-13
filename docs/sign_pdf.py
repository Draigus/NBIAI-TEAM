import fitz

pdf_path = r"D:\OneDrive\Claude_code\NBIAI_TEAM\docs\OpenArch Student Application Form - Cambridge RRA.pdf"
out_path = r"D:\OneDrive\Claude_code\NBIAI_TEAM\docs\OpenArch Student Application Form - Cambridge RRA - SIGNED.pdf"

doc = fitz.open(pdf_path)
page = doc[4]  # page 5

handwriting_font = r"C:\Windows\Fonts\LHANDW.TTF"
normal_font = "helv"
color = (0.05, 0.05, 0.15)  # very dark blue-black, like pen ink

# Guarantor's Full Name (label at y=228) - typed is fine here
page.insert_text((220, 230), "Glen Pryer", fontname=normal_font, fontsize=12, color=(0, 0, 0))

# Guarantor's Signature (label at y=259) - handwriting style, slightly larger
page.insert_text((150, 263), "Glen Pryer", fontname="F0", fontsize=16, fontfile=handwriting_font, color=color)

# Guarantor's Date (label at y=289) - normal typed
page.insert_text((120, 291), "11/05/2026", fontname=normal_font, fontsize=12, color=(0, 0, 0))

doc.save(out_path)
doc.close()
print(f"Signed PDF saved to: {out_path}")

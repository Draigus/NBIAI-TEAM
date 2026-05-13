import fitz

doc = fitz.open(r"D:\OneDrive\Claude_code\NBIAI_TEAM\docs\OpenArch Student Application Form - Cambridge RRA - SIGNED.pdf")
page = doc[4]
blocks = page.get_text("dict")["blocks"]
for b in blocks:
    if "lines" in b:
        for line in b["lines"]:
            for span in line["spans"]:
                t = span["text"].strip()
                if t:
                    oy = span["origin"][1]
                    ox = span["origin"][0]
                    sz = span["size"]
                    print(f"  y={oy:.0f} x={ox:.0f} size={sz:.1f} text={repr(t)}")
doc.close()

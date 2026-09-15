# coding=utf-8
with open(r"C:\Users\Nguyen Cong Trung\TimeZone\index.html", "r", encoding="utf-8") as f:
    content = f.read()

content = content.replace("script_v3.js?v=6", "script_v3.js?v=7")

with open(r"C:\Users\Nguyen Cong Trung\TimeZone\index.html", "w", encoding="utf-8") as f:
    f.write(content)
print("BUMPED v=7")

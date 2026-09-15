# coding=utf-8
import os

with open(r"C:\Users\Nguyen Cong Trung\TimeZone\script_v3.js", "r", encoding="utf-8") as f:
    content = f.read()

old_catch = """                } catch(e) {
                    console.error("Lỗi quy đổi giờ:", e);
                } finally {"""
new_catch = """                } catch(e) {
                    console.error("Lỗi quy đổi giờ:", e);
                    alert("LỖI QUY ĐỔI GIỜ: " + e.message);
                } finally {"""
content = content.replace(old_catch, new_catch)

with open(r"C:\Users\Nguyen Cong Trung\TimeZone\script_v3.js", "w", encoding="utf-8") as f:
    f.write(content)

print("SUCCESS")

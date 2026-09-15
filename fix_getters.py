# coding=utf-8
import os

with open(r'C:\Users\Nguyen Cong Trung\TimeZone\script_v3.js', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("targetDayjs.get('year')", "targetDayjs.year()")
content = content.replace("targetDayjs.get('month')", "targetDayjs.month()")
content = content.replace("targetDayjs.get('date')", "targetDayjs.date()")
content = content.replace("targetDayjs.get('hour')", "targetDayjs.hour()")
content = content.replace("targetDayjs.get('minute')", "targetDayjs.minute()")
content = content.replace("targetTzDayjs.get('year')", "targetTzDayjs.year()")
content = content.replace("targetTzDayjs.get('month')", "targetTzDayjs.month()")
content = content.replace("targetTzDayjs.get('date')", "targetTzDayjs.date()")
content = content.replace("targetTzDayjs.get('hour')", "targetTzDayjs.hour()")
content = content.replace("targetTzDayjs.get('minute')", "targetTzDayjs.minute()")

with open(r'C:\Users\Nguyen Cong Trung\TimeZone\script_v3.js', 'w', encoding='utf-8') as f:
    f.write(content)
print("SUCCESS")

# coding=utf-8
import os
import re

with open(r"C:\Users\Nguyen Cong Trung\TimeZone\script_v3.js", "r", encoding="utf-8") as f:
    content = f.read()

# Replace initialFakeDate creation
old_initial = """        const initialFakeDate = new Date(
            targetDayjs.year(),
            targetDayjs.month(),
            targetDayjs.date(),
            targetDayjs.hour(),
            targetDayjs.minute()
        );"""
new_initial = """        const initialFakeDate = targetDayjs.format("YYYY-MM-DD HH:mm");"""
content = content.replace(old_initial, new_initial)

# Replace fakeDate creation in onChange
old_fake = """                            const fakeDate = new Date(
                                targetTzDayjs.year(),
                                targetTzDayjs.month(),
                                targetTzDayjs.date(),
                                targetTzDayjs.hour(),
                                targetTzDayjs.minute()
                            );
                            item.fp.setDate(fakeDate, false);"""
new_fake = """                            const fakeDateStr = targetTzDayjs.format("YYYY-MM-DD HH:mm");
                            item.fp.setDate(fakeDateStr, false, "Y-m-d H:i");"""
content = content.replace(old_fake, new_fake)

with open(r"C:\Users\Nguyen Cong Trung\TimeZone\script_v3.js", "w", encoding="utf-8") as f:
    f.write(content)

print("SUCCESS")

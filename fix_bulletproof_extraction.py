# coding=utf-8
import os

with open(r"C:\Users\Nguyen Cong Trung\TimeZone\script_v3.js", "r", encoding="utf-8") as f:
    js = f.read()

# Replace the first fakeDate creation
old_fake1 = """        const fakeDate = new Date(
            targetDayjs.year(),
            targetDayjs.month(),
            targetDayjs.date(),
            targetDayjs.hour(),
            targetDayjs.minute()
        );"""
new_fake1 = """        const fakeDate = new Date(
            parseInt(targetDayjs.format("YYYY"), 10),
            parseInt(targetDayjs.format("MM"), 10) - 1,
            parseInt(targetDayjs.format("DD"), 10),
            parseInt(targetDayjs.format("HH"), 10),
            parseInt(targetDayjs.format("mm"), 10)
        );"""
js = js.replace(old_fake1, new_fake1)

# Replace the second fakeDate creation
old_fake2 = """                                const otherFakeDate = new Date(
                                    targetTzDayjs.year(),
                                    targetTzDayjs.month(),
                                    targetTzDayjs.date(),
                                    targetTzDayjs.hour(),
                                    targetTzDayjs.minute()
                                );"""
new_fake2 = """                                const otherFakeDate = new Date(
                                    parseInt(targetTzDayjs.format("YYYY"), 10),
                                    parseInt(targetTzDayjs.format("MM"), 10) - 1,
                                    parseInt(targetTzDayjs.format("DD"), 10),
                                    parseInt(targetTzDayjs.format("HH"), 10),
                                    parseInt(targetTzDayjs.format("mm"), 10)
                                );"""
js = js.replace(old_fake2, new_fake2)

# Wrap everything inside try-catch just in case!
old_loop = """        const targetDayjs = now.tz(tz);"""
new_loop = """        try {
            const targetDayjs = now.tz(tz);"""
js = js.replace(old_loop, new_loop)

old_catch = """        } catch (e) {
            console.error("Flatpickr Error: ", e);
        }
    });"""
new_catch = """        } catch (e) {
            console.error("Flatpickr Error: ", e);
            alert("LỖI CONVERTER NGHIÊM TRỌNG: " + e.message);
        }
    });"""
js = js.replace(old_catch, new_catch)


with open(r"C:\Users\Nguyen Cong Trung\TimeZone\script_v3.js", "w", encoding="utf-8") as f:
    f.write(js)

print("SUCCESS")

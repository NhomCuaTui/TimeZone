# coding=utf-8
import os

with open(r'C:\Users\Nguyen Cong Trung\TimeZone\script_v3.js', 'r', encoding='latin-1') as f:
    content = f.read()

# We can't trust the read because it's already corrupted on disk by `replace_file_content` (which uses cp1252 on windows).
# I will just write the ENTIRE script_v3.js again from scratch!

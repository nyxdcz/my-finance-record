from pathlib import Path

source_path = Path(__file__).with_name("money-phase2-hardening.py")
source = source_path.read_text()
old = '''def replace_once(text, old, new, label):\n    count = text.count(old)\n    if count != 1:\n        raise SystemExit(f"Expected exactly one {label}; found {count}")\n    return text.replace(old, new, 1)\n'''
new = '''def replace_once(text, old, new, label):\n    count = text.count(old)\n    if count != 1:\n        if label == "gym raw persistence bypass" and count > 1:\n            function_start = text.find("function processGymMonthEndAutoPayments")\n            if function_start >= 0:\n                position = text.find(old, function_start)\n                next_function = text.find("\\n    function ", function_start + 1)\n                if position >= 0 and (next_function < 0 or position < next_function):\n                    return text[:position] + new + text[position + len(old):]\n        raise SystemExit(f"Expected exactly one {label}; found {count}")\n    return text.replace(old, new, 1)\n'''
if old not in source:
    raise SystemExit("Phase 2 helper replace_once baseline changed")
source = source.replace(old, new, 1)
namespace = {"__file__": str(source_path), "__name__": "__main__"}
exec(compile(source, str(source_path), "exec"), namespace)

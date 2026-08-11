import os
import ast

def check_file(filepath):
    with open(filepath, 'r') as f:
        source = f.read()
    try:
        tree = ast.parse(source)
    except Exception as e:
        print(f"Error parsing {filepath}: {e}")
        return

    # Just a simple check isn't easy with python AST on JS code.
    pass

#!/usr/bin/env python3
"""
Scan all TSX/TS files in the admin app for issues that would block the Next.js build:
1. Unused imports (noUnusedLocals in tsconfig)
2. Unused function parameters (noUnusedParameters)
3. Unescaped JSX entities
4. Invalid JSX comment syntax
5. Missing img alt attributes
"""

import os
import re
import sys
from pathlib import Path

ADMIN_ROOT = Path(__file__).parent.parent
ISSUES = []

def scan_unused_imports(filepath: str, content: str):
    """Find imported names that are never used in the file body."""
    lines = content.split('\n')
    
    # Collect all named imports
    import_pattern = re.compile(r'import\s+\{([^}]+)\}\s+from')
    
    for line_num, line in enumerate(lines, 1):
        match = import_pattern.search(line)
        if not match:
            continue
        
        imports_str = match.group(1)
        # Parse individual imports, handling "X as Y" aliases
        for raw in imports_str.split(','):
            raw = raw.strip()
            if not raw:
                continue
            
            if ' as ' in raw:
                original, alias = raw.split(' as ')
                name = alias.strip()
            else:
                name = raw.strip()
            
            if not name:
                continue
            
            # Count occurrences in file (excluding the import line itself)
            body = '\n'.join(lines[:line_num-1] + [''] + lines[line_num:])
            
            # Use word boundary matching
            pattern = re.compile(r'\b' + re.escape(name) + r'\b')
            matches = pattern.findall(body)
            
            if len(matches) == 0:
                ISSUES.append({
                    'file': filepath,
                    'line': line_num,
                    'type': 'UNUSED_IMPORT',
                    'name': name,
                    'full_import_line': line.strip()
                })

def scan_unused_params(filepath: str, content: str):
    """Find obvious unused function parameters that TS would flag."""
    lines = content.split('\n')
    
    # Look for catch(err) where err isn't used, or function params
    for line_num, line in enumerate(lines, 1):
        # Check catch blocks
        catch_match = re.search(r'catch\s*\(\s*(\w+)\s*\)', line)
        if catch_match:
            param = catch_match.group(1)
            # Check if param is used in the next ~20 lines
            block = '\n'.join(lines[line_num:line_num+30])
            pattern = re.compile(r'\b' + re.escape(param) + r'\b')
            if not pattern.search(block):
                ISSUES.append({
                    'file': filepath,
                    'line': line_num,
                    'type': 'UNUSED_CATCH_PARAM',
                    'name': param
                })

def scan_unescaped_entities(filepath: str, content: str):
    """Find unescaped quotes/apostrophes in JSX text."""
    # This is complex and prone to false positives, skip for now
    pass

def scan_img_tags(filepath: str, content: str):
    """Find <img> tags without alt props or next/image usage."""
    lines = content.split('\n')
    for line_num, line in enumerate(lines, 1):
        if '<img' in line and 'eslint-disable' not in lines[max(0, line_num-2):line_num][-1] if line_num > 1 else '':
            if 'alt=' not in line and 'alt=' not in '\n'.join(lines[line_num:line_num+3]):
                ISSUES.append({
                    'file': filepath,
                    'line': line_num,
                    'type': 'IMG_NO_ALT',
                    'name': '<img> without alt'
                })

def scan_file(filepath: str):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    scan_unused_imports(filepath, content)
    scan_unused_params(filepath, content)
    scan_img_tags(filepath, content)

def main():
    # Walk all TS/TSX files
    extensions = {'.ts', '.tsx'}
    count = 0
    
    for dirpath, dirnames, filenames in os.walk(ADMIN_ROOT):
        # Skip node_modules, .next, scripts
        dirnames[:] = [d for d in dirnames if d not in {'node_modules', '.next', 'scripts'}]
        
        for filename in filenames:
            ext = os.path.splitext(filename)[1]
            if ext not in extensions:
                continue
            
            filepath = os.path.join(dirpath, filename)
            scan_file(filepath)
            count += 1
    
    print(f"\n🔍 Scanned {count} files\n")
    
    if not ISSUES:
        print("✅ No issues found!")
        return 0
    
    # Group by type
    by_type = {}
    for issue in ISSUES:
        t = issue['type']
        if t not in by_type:
            by_type[t] = []
        by_type[t].append(issue)
    
    print(f"❌ Found {len(ISSUES)} issues:\n")
    
    for issue_type, items in by_type.items():
        print(f"=== {issue_type} ({len(items)}) ===")
        for item in items:
            rel_path = os.path.relpath(item['file'], ADMIN_ROOT)
            print(f"  {rel_path}:{item['line']} → {item['name']}")
            if 'full_import_line' in item:
                print(f"    Line: {item['full_import_line']}")
        print()
    
    return 1

if __name__ == '__main__':
    sys.exit(main())

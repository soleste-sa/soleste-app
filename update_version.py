#!/usr/bin/env python3
# Script à exécuter avant chaque git push pour mettre à jour la version dans settings.html
# Usage: python3 update_version.py 1.5.0

import sys, re

if len(sys.argv) < 2:
    print("Usage: python3 update_version.py <version>")
    sys.exit(1)

version = sys.argv[1]

with open('settings.html') as f:
    content = f.read()

new_content = re.sub(
    r'(<tr><td class="text-muted" style="padding:6px 0;">Version</td><td>)[^<]+(</td></tr>)',
    rf'\g<1>{version}\g<2>',
    content
)

if new_content == content:
    print(f"⚠ Version non trouvée dans settings.html")
else:
    with open('settings.html', 'w') as f:
        f.write(new_content)
    print(f"✓ Version mise à jour → {version}")

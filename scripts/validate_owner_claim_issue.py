#!/usr/bin/env python3
"""
scripts/validate_owner_claim_issue.py
=====================================
Validates GitHub Issue submissions for restaurant owner claims.
Ensures:
1. Valid Nigerian 234 phone number format (e.g. 2348012345678)
2. Valid proof of ownership URL
3. Not on the moderation blocklist (data/community/blocklist.json)
4. Never overwrites OpenStreetMap data; appends to data/community/owners_ng.json
"""

import sys
import os
import json
import re
from datetime import datetime
from typing import Dict, Any, Optional

def normalize_234_phone(phone_raw: str) -> Optional[str]:
    cleaned = re.sub(r'[\s\-\(\)\.]', '', phone_raw.strip())
    if cleaned.startswith('+'):
        cleaned = cleaned[1:]
    if cleaned.startswith('0') and len(cleaned) == 11:
        cleaned = '234' + cleaned[1:]
    if len(cleaned) == 10 and re.match(r'^[789][01]\d{8}$', cleaned):
        cleaned = '234' + cleaned
    if re.match(r'^234\d{10}$', cleaned):
        return cleaned
    return None

def parse_issue_markdown(body: str) -> Dict[str, Any]:
    lines = body.splitlines()
    data: Dict[str, str] = {}
    current_key = None

    for line in lines:
        line = line.strip()
        if line.startswith('### '):
            current_key = line[4:].strip().lower()
            data[current_key] = ''
        elif current_key and line:
            if data[current_key]:
                data[current_key] += ' ' + line
            else:
                data[current_key] = line

    return data

def validate_and_stage_claim(body_text: str, root_dir: str = '.') -> Dict[str, Any]:
    parsed = parse_issue_markdown(body_text)

    # Resolve fields from common labels in issue template
    name = (
        parsed.get('restaurant name')
        or parsed.get('restaurant')
        or 'Unnamed Restaurant'
    ).strip()

    uid = (
        parsed.get('place uid')
        or parsed.get('uid')
        or f"community:owner_{int(datetime.now().timestamp())}"
    ).strip()

    owner_name = (
        parsed.get('owner / manager full name')
        or parsed.get('owner / manager name')
        or parsed.get('owner name')
        or 'Restaurant Owner'
    ).strip()

    phone_raw = (
        parsed.get('owner whatsapp phone number (234 format)')
        or parsed.get('owner whatsapp phone (234 format)')
        or parsed.get('whatsapp phone')
        or ''
    )

    hours = parsed.get('opening hours', '').strip()
    if hours.lower() in ('not specified', 'none', 'n/a'):
        hours = None

    menu_url = parsed.get('menu link or photo url', '').strip()
    if menu_url.lower() in ('not specified', 'none', 'n/a'):
        menu_url = None

    cuisines_raw = parsed.get('cuisines / specialties', '').strip()
    cuisines = [c.strip() for c in cuisines_raw.split(',') if c.strip()] if cuisines_raw else []

    delivery_raw = parsed.get('do you offer delivery?', '').lower()
    delivery = True if 'yes' in delivery_raw else (False if 'no' in delivery_raw else None)

    proof_url = (
        parsed.get('proof of ownership / business link')
        or parsed.get('proof of ownership (social link or signboard photo)')
        or ''
    ).strip()

    # 1. Validate Phone
    normalized_phone = normalize_234_phone(phone_raw)
    if not normalized_phone:
        raise ValueError(f"Invalid Nigerian WhatsApp phone number: '{phone_raw}'. Must be 234 format (e.g. 2348012345678).")

    # 2. Check Blocklist
    blocklist_path = os.path.join(root_dir, 'data/community/blocklist.json')
    if os.path.exists(blocklist_path):
        with open(blocklist_path, 'r', encoding='utf-8') as f:
            blocklist = json.load(f)
            if normalized_phone in blocklist.get('blocked_numbers', []):
                raise ValueError(f"Phone number {normalized_phone} is on the blocklist.")
            for domain in blocklist.get('blocked_domains', []):
                if domain.lower() in proof_url.lower() or (menu_url and domain.lower() in menu_url.lower()):
                    raise ValueError(f"Submission contains domain '{domain}' which is on the blocklist.")

    # 3. Validate Proof URL
    if not (proof_url.startswith('http://') or proof_url.startswith('https://')):
        raise ValueError(f"Proof URL must be a valid http/https link: '{proof_url}'.")

    today_str = datetime.now().strftime('%Y-%m-%d')
    owner_record: Dict[str, Any] = {
        "uid": uid,
        "restaurant_name": name,
        "owner_name": owner_name,
        "whatsapp_phone": normalized_phone,
        "opening_hours": hours,
        "menu_url": menu_url,
        "cuisines": cuisines,
        "delivery": delivery,
        "proof_url": proof_url,
        "source": "owner",
        "verified_at": today_str,
        "license_note": "Supplied directly by restaurant owner under TasteMatch Community Contributor Terms. Kept distinct from OpenStreetMap data.",
        "attribution": f"Provided by owner, {today_str}"
    }

    # 4. Save into data/community/owners_ng.json
    owners_path = os.path.join(root_dir, 'data/community/owners_ng.json')
    owners = []
    if os.path.exists(owners_path):
        with open(owners_path, 'r', encoding='utf-8') as f:
            try:
                owners = json.load(f)
            except Exception:
                owners = []

    # Update existing or append
    updated = False
    for idx, existing in enumerate(owners):
        if existing.get('uid') == uid:
            owners[idx] = owner_record
            updated = True
            break
    if not updated:
        owners.append(owner_record)

    with open(owners_path, 'w', encoding='utf-8') as f:
        json.dump(owners, f, indent=2, ensure_ascii=False)
        f.write('\n')

    # Also sync to tastematch/public and tastematch/src
    for mirror_rel in [
        'tastematch/public/data/community/owners_ng.json',
        'tastematch/src/data/owners_ng.json'
    ]:
        mirror_path = os.path.join(root_dir, mirror_rel)
        os.makedirs(os.path.dirname(mirror_path), exist_ok=True)
        with open(mirror_path, 'w', encoding='utf-8') as f:
            json.dump(owners, f, indent=2, ensure_ascii=False)
            f.write('\n')

    return owner_record

if __name__ == '__main__':
    if len(sys.argv) > 1:
        issue_body_file = sys.argv[1]
        with open(issue_body_file, 'r', encoding='utf-8') as f:
            body = f.read()
    else:
        body = sys.stdin.read()

    try:
        record = validate_and_stage_claim(body)
        print("SUCCESS: Validated owner claim:")
        print(json.dumps(record, indent=2))
        sys.exit(0)
    except Exception as e:
        print(f"VALIDATION FAILED: {e}", file=sys.stderr)
        sys.exit(1)

#!/usr/bin/env python3
"""Assemble tasks/tasks-ultra.json from tasks/ultra/<ID>/task.json.

Each prompt gets the anti-cheating rules from tasks/ultra/RULES.txt inserted
immediately before its final line (the category's answer-format tail), so the
rules are part of the task text every arm sees and the tail stays last.
"""
import glob
import json
import os

ROOT = os.path.join(os.path.dirname(__file__), "..", "tasks")
rules = open(os.path.join(ROOT, "ultra", "RULES.txt"), encoding="utf-8").read().strip()
tasks = []
for path in sorted(glob.glob(os.path.join(ROOT, "ultra", "*", "task.json"))):
    task = json.load(open(path, encoding="utf-8"))
    body, tail = task["prompt"].rstrip().rsplit("\n", 1)
    if rules not in body:
        task["prompt"] = f"{body.rstrip()}\n\n{rules}\n\n{tail}"
    tasks.append(task)
with open(os.path.join(ROOT, "tasks-ultra.json"), "w", encoding="utf-8") as fh:
    json.dump({"version": 1, "tasks": tasks}, fh, indent=2, ensure_ascii=False)
    fh.write("\n")
print(f"{len(tasks)} tasks -> tasks/tasks-ultra.json")

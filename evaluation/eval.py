#!/usr/bin/env python3

import sys
import json
import matplotlib.pyplot as plt

filterHost = None
# url for filtering given?
try:
    filterHost = sys.argv[2]
except IndexError:
    filterHost = None

jsonFile = open(sys.argv[1])

data = []
if filterHost:
    data = list(filter(lambda e: e['detail']['url'] == filterHost, json.load(jsonFile)))
else:
    data = json.load(jsonFile)

colors = ['red', 'green', 'blue', 'yellow', 'orange']
urls = set(event['detail']['url'] for event in data)
url_colors = {url: colors[i % len(colors)] for (i, url) in enumerate(urls)}

# normalize millis
start_time = data[0]['startTime']
for event in data:
    event['startTime'] -= start_time

fig, ax = plt.subplots(figsize=(10, len(data) * 0.5))

for i, event in enumerate(data):
    color = url_colors.get(event['detail']['url'], 'grey')
    ax.barh(i + 0.25, event['duration'], left=event['startTime'], height=0.5, align='center', color=color)
    label = event['detail']['url'] if event['detail']['name'] == 'webRequest' else event['detail']['name'].replace(':', ' ')
    ax.text(event['startTime'], i, label, ha='left', va='top')

ax.set_xlabel('Time in ms')
ax.set_ylabel('Event')
ax.set_yticklabels([])
ax.grid(True)

plt.tight_layout()
plt.show()

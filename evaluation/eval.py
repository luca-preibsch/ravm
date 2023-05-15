#!/usr/bin/env python3

import sys
import json
import matplotlib.pyplot as plt

url = sys.argv[2]

jsonFile = open(sys.argv[1])
data = list(filter(lambda e: e['detail']['url'] == url, json.load(jsonFile)))
events = []

for current_event, next_event in zip(data, data[1:] + [None]):
    event = {
        'start': current_event['startTime'],
        'end': next_event['startTime'] if next_event else current_event['startTime'],
        'label': current_event['name']
    }
    events.append(event)

fig, ax = plt.subplots()

# TODO: refactor with better code
for i, event in enumerate(events):
    ax.barh(i, event['end'] - event['start'], left=event['start'], height=0.5, align='center')
    ax.text(event['start'], i, event['label'], va='center')

ax.set_xlabel('Time')
ax.set_ylabel('Event')
ax.grid(True)

plt.tight_layout()
plt.show()

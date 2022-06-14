#!/usr/bin/python3
import sys
import json
import getpass
import requests
import pandas as pd


def currentMillis():
    return round(1000 * time.time())

def prompt(text):
    print(text)
    return input()

def alpha(str):
    return ''.join([i for i in str if i.isalpha()])

def printJson(d):
    json.dumps(d, sort_keys=True, indent=4)

# Get while throwing error
def postJSON(url, parameters):
    try:
        r = requests.post(url, json=parameters)
        r.raise_for_status()
        return r.json()
    except requests.exceptions.HTTPError as e:
        print('===============ERROR=================')
        print(e)
        print('Quitting...')
        sys.exit(1)

def getApiKey(hostname):
    apiKey = postJSON(f'{hostname}/auth/api_key/new_with_email',
                 {
                     'email': prompt(f'Enter an user email to log onto {hostname}:'),
                     'password': prompt(f'Enter password to log onto {hostname}:'),
                     'duration': 60*60*1000 # One hour
                 })
    return apiKey['Ok']['key'];


# Bail if not correct
if len(sys.argv) != 3:
    print('===> Error: Need 2 arguments: file as xlsx and the url of the server')
    sys.exit(1)

filepath = sys.argv[1]
hostname = sys.argv[2]

apiKey = getApiKey(hostname)
df = pd.read_excel(filepath)

print('===> Adding New Article')
article_data = postJSON(f'{hostname}/critica/article/new',
                        {
                            'title':prompt('===> Enter Title:'),
                            'durationEstimate': 10*60*1000, # 10 min
                            'apiKey':apiKey
                        })['Ok']


for position, row in df.iterrows():
  for variant, section_text in enumerate(row):
      print(f'> Adding variant {variant} at position {position}')
      postJSON(f'{hostname}/critica/article_section/new',
               {
                  'articleId': article_data['article']['articleId'],
                  'position': position,
                  'variant': variant,
                  'sectionText': section_text,
                  'active': True,
                  'apiKey': apiKey
               })['Ok']

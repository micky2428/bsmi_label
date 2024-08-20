# 相當於ai小組的app.py
#! /usr/bin/env python3
# encoding: utf-8
#

from flask import Flask, request, session, g, redirect, url_for, abort, render_template, flash, jsonify
from sqlite3 import dbapi2 as sqlite3
from datetime import datetime
from markupsafe import escape
import sys, os, re

OPENAI_API_KEY='00000000'

from openai import OpenAI
client = OpenAI(api_key = OPENAI_API_KEY)

ppath = os.path.abspath(os.path.dirname(__file__))
DATABASE = os.path.join(ppath,'./log.db')


app = Flask(__name__)

def connect_db():
"""Returns a new connection to the database."""
return sqlite3.connect(DATABASE)

def query_db(query, args=(), one=False):
"""Queries the database and returns a list of dictionaries."""
cur = g.db.execute(query, args)
rv = [dict((cur.description[idx][0], value) for idx, value in enumerate(row)) for row in cur.fetchall()]
return (rv[0] if rv else None) if one else rv

@app.before_request
def before_request():
"""Make sure we are connected to the database each request."""
g.db = connect_db()

@app.before_request
def before_request():
"""Make sure we are connected to the database each request."""
g.db = connect_db()

@app.after_request
def after_request(response):
"""Closes the database again at the end of the request."""
g.db.close()
return response


@app.route("/")
def index():
return render_template('index.html')

@app.route("/gpt", methods=['POST'])
def gpt():
vmail = open(os.path.join(ppath,"./v-email"),"r").read().split("\n")[:-1]
req_email = escape(request.values.get('email'))
if request.method == 'POST' and req_email in vmail:
post_data = request.files['resp_msg'].read().decode('utf-8')
msg = '\n'.join(post_data.splitlines()[2:])
f = open(os.path.join(ppath,"./condi"), "r", encoding="utf-8")
completion = client.chat.completions.create(
model="gpt-4-turbo-preview",
max_tokens=400,
temperature=0,
top_p=0,
response_format={ "type": "text" },
messages=[
{"role": "system", "content": f.read()},
{"role": "user", "content": "幫我審查玩具標示如下：\n\n\#\#\#\n" + msg + "\n\#\#\#"}
]
)
resp = completion.choices[0].message.content

g.db.execute('insert into request_log (email, user, assist, log_time) values (?, ?, ?, datetime(\'now\',\'+8 hours\'));', [req_email, msg, resp])
g.db.commit()

return resp
else:
return "mooo!!!"


if __name__ == '__main__':
app.run('0.0.0.0', 8000)

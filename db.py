import random
import string

from google.appengine.ext import webapp
from google.appengine.ext.webapp.util import run_wsgi_app
from google.appengine.ext import db

#
# Datastore classes
#

class Event(db.Model):
  #path is the key_name
  dates = db.StringProperty()
  access = db.StringProperty()

class Response(db.Model):
  path = db.StringProperty()
  available = db.StringProperty()
  busy = db.StringProperty()
  name = db.StringProperty()

#
# Helper functions
#

def randomString(length):
  str = ''.join((random.choice(string.letters + string.digits)) for x in range(length))
  return str

#
# Calendar API functions
#

def getDates(self, path):
  if path == None:
    self.response.out.write('')
    return

  event = Event.get_by_key_name(path)
  if event != None:
    self.response.out.write(event.dates)
  else:
    self.response.out.write('')

def requestEvent(self):
  while True:
    path = randomString(6)
    event = Event.get_by_key_name(path)
    if event == None:
      break

  event = Event(key_name = path)
  event.dates = ''
  event.access = randomString(8)
  event.put()

  self.response.out.write(path + ', ' + event.access)

def updateEvent(self, path, access, dates):
  if path == None:
    return

  event = Event.get_by_key_name(path)

  if event == None:
    return
  if event.access != access:
    return

  event.dates = dates
  event.put()

def removeEvent(self, path, access):
  if path == None:
    return

  event = Event.get_by_key_name(path)

  if event == None:
    return
  if event.access != access:
    return

  event.dates = ''
  event.put()

def addResponse(self, path, response):
  if path == None:
    return

  event = Event.get_by_key_name(path)

  if event == None:
    return

  list = response.split('x', 2)

  response = Response()
  response.path = path
  response.available = list[0]
  response.busy = list[1]
  response.name = list[2]
  response.put();

def eventReview(self, path):
  if path == None:
    self.response.out.write('null')
    return

  event = Event.get_by_key_name(path)

  if event == None:
    self.response.out.write('null')
    return

  #Build a complex dict containing user-availability information for each date.
  dates = event.dates.split(', ')
  data = dict((dates[i], [0, 0, 0, [], [], []]) for i in range(len(dates)))
  query = db.GqlQuery('SELECT * FROM Response WHERE path = :1', path)
  for response in query:
    available = response.available.split(', ')
    busy = response.busy.split(', ')
    unspecified = [d for d in dates if d not in available and d not in busy]
    for d in available:
      if d == '':
        continue
      if not data.has_key(d):
        data[d] = [0, 0, 0, [], [], []]
      data[d][0] = data[d][0] + 1
      data[d][3].append(response.name)
    for d in busy:
      if d == '':
        continue
      if not data.has_key(d):
        data[d] = [0, 0, 0, [], [], []]
      data[d][1] = data[d][1] + 1
      data[d][4].append(response.name)
    for d in unspecified:
      if d == '':
        continue
      if not data.has_key(d):
        data[d] = [0, 0, 0, [], [], []]
      data[d][2] = data[d][2] + 1
      data[d][5].append(response.name)
  dates = data.keys()
  dates.sort()

  #Build a sorted string from the dict, adding delimiters as appropriate
  ret = ''
  for d in dates:
    if ret != '':
      ret += ':'
    ret += d + ';'
    ret += str(data[d][0]) + ';'
    ret += str(data[d][1]) + ';'
    ret += str(data[d][2]) + ';'
    for i in range(len(data[d][3])):
      if i != 0:
        ret += ','
      ret += data[d][3][i]
    ret += ';'
    for i in range(len(data[d][4])):
      if i != 0:
        ret += ','
      ret += data[d][4][i]
    ret += ';'
    for i in range(len(data[d][5])):
      if i != 0:
        ret += ','
      ret += data[d][5][i]

  self.response.out.write(ret)

#
# Webapp handler
#

def databaseHandler(self):
  path = self.request.path[len('/db/'):]
  data = self.request.get('data')
  if data != '':
    path += '/' + data
  list = path.split('/')

  #add a try except at the end
  if list[0] == 'getDates':
    getDates(self, *list[1:])
  elif list[0] == 'requestEvent':
    requestEvent(self, *list[1:])
  elif list[0] == 'updateEvent':
    updateEvent(self, *list[1:])
  elif list[0] == 'removeEvent':
    removeEvent(self, *list[1:])
  elif list[0] == 'addResponse':
    addResponse(self, *list[1:])
  elif list[0] == 'eventReview':
    eventReview(self, *list[1:])
  else:
    self.redirect('/')

class DatabaseHandler(webapp.RequestHandler):
  def get(self):
    databaseHandler(self)
  def post(self):
    databaseHandler(self)

class NotFound(webapp.RequestHandler):
  def get(self):
    self.redirect('/')

application = webapp.WSGIApplication(
                                     [('/review/.*', NotFound),
                                     ('/db/.*', DatabaseHandler),
                                     ('/.*', NotFound)],
                                     debug=True)

def main():
    run_wsgi_app(application)

if __name__ == "__main__":
    main()
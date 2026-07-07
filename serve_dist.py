import http.server, os
os.chdir(os.path.join(os.path.dirname(os.path.abspath(__file__)),'dist'))
h = http.server.SimpleHTTPRequestHandler
h.extensions_map['.html'] = 'text/html; charset=utf-8'
http.server.HTTPServer(('127.0.0.1', 8390), h).serve_forever()

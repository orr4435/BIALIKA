# -*- coding: utf-8 -*-
"""Local test server: serves dist/ and mocks the DeepSeek proxy at /api/chat.
   First call returns a tool_call; once the client sends tool results, the mock
   echoes real numbers from them — proving the whole loop works end-to-end."""
import http.server, json, os

os.chdir(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'dist'))

class H(http.server.SimpleHTTPRequestHandler):
    extensions_map = {**http.server.SimpleHTTPRequestHandler.extensions_map,
                      '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8'}

    def do_POST(self):
        if self.path != '/api/chat':
            self.send_error(404); return
        n = int(self.headers.get('Content-Length', 0))
        body = json.loads(self.rfile.read(n))
        tool_msgs = [m for m in body['messages'] if m.get('role') == 'tool']
        if tool_msgs:
            data = json.loads(tool_msgs[-1]['content'])
            top = data['streets'][0]
            content = ('MOCK-AI: לפי הכלי, הרחוב העמוס ביותר הוא {} עם {:,} פניות '
                       '(אזור {}).').format(top['name'], top['count'], top['area'])
            msg = {'role': 'assistant', 'content': content}
        else:
            msg = {'role': 'assistant', 'content': None, 'tool_calls': [{
                'id': 'call_1', 'type': 'function',
                'function': {'name': 'top_list', 'arguments': '{"dimension":"streets","n":3}'},
            }]}
        out = json.dumps({'choices': [{'message': msg}]}, ensure_ascii=False).encode('utf-8')
        self.send_response(200)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(out)))
        self.end_headers()
        self.wfile.write(out)

http.server.HTTPServer(('127.0.0.1', 8391), H).serve_forever()

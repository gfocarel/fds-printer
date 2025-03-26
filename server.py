from http.server import HTTPServer, SimpleHTTPRequestHandler

def run_server(port=8022):
    server_address = ('', port)
    httpd = HTTPServer(server_address, SimpleHTTPRequestHandler)
    print(f'Server avviato su http://localhost:{port}')
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print('\nServer arrestato')
        httpd.server_close()

if __name__ == '__main__':
    run_server()
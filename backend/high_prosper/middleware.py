class ContentTypeMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)
        if request.path.endswith('.css'):
            response['Content-Type'] = 'text/css; charset=utf-8'
        elif request.path.endswith('.js'):
            response['Content-Type'] = 'application/javascript; charset=utf-8'
        else:
            response['Content-Type'] = 'text/html; charset=utf-8'
        response['Cache-Control'] = 'no-cache, max-age=0'
        response['X-Content-Type-Options'] = 'nosniff'
        if 'Expires' in response:
            del response['Expires']
        if 'Pragma' in response:
            del response['Pragma']
        return response
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response

class CustomerPagination(PageNumberPagination):
    page_size = 50  # default number of customers per page
    page_size_query_param = 'page_size'
    max_page_size = 500

    def get_paginated_response(self, data):
        return Response({
            'links': {
                'next': self.get_next_link(),
                'previous': self.get_previous_link()
            },
            'count': self.page.paginator.count,
            'total_pages': self.page.paginator.num_pages,
            'current_page': self.page.number,
            'results': data
        })

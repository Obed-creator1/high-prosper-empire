from django import template
register = template.Library()

@register.filter
def abs(value):
    try:
        return abs(float(value))
    except:
        return value
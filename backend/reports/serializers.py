# reports/serializers.py
from rest_framework import serializers
from .models import Report, ReportTemplate, ReportCategory, ReportLog
from django.utils import timezone
from datetime import datetime

class ReportCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = ReportCategory
        fields = '__all__'

class ReportTemplateSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.name', read_only=True)
    category_icon = serializers.CharField(source='category.icon', read_only=True)

    class Meta:
        model = ReportTemplate
        fields = '__all__'

class ReportLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = ReportLog
        fields = ['id', 'level', 'message', 'timestamp', 'metadata']
        read_only_fields = '__all__'

class ReportSerializer(serializers.ModelSerializer):
    """Detailed report serializer"""
    user_name = serializers.CharField(source='user.username', read_only=True)
    template_name = serializers.CharField(source='template.name', read_only=True)
    category_name = serializers.CharField(source='category.name', read_only=True)
    file_url = serializers.SerializerMethodField()
    progress = serializers.SerializerMethodField()
    can_cancel = serializers.SerializerMethodField()
    logs = ReportLogSerializer(many=True, read_only=True)

    class Meta:
        model = Report
        fields = [
            'id', 'title', 'template', 'template_name', 'category', 'category_name',
            'user', 'user_name', 'parameters', 'status', 'priority', 'format',
            'file', 'file_url', 'file_size', 'generated_at', 'completed_at',
            'duration_seconds', 'row_count', 'error_message', 'progress',
            'can_cancel', 'logs', 'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'user', 'status', 'file', 'file_url', 'generated_at',
            'completed_at', 'duration_seconds', 'row_count', 'error_message',
            'progress', 'can_cancel', 'logs', 'created_at', 'updated_at'
        ]

    def get_file_url(self, obj):
        request = self.context.get('request')
        if obj.file and request:
            return request.build_absolute_uri(obj.file.url)
        return None

    def get_progress(self, obj):
        """Calculate progress based on status"""
        if obj.status == 'completed':
            return 100
        elif obj.status == 'generating':
            return 50
        elif obj.status == 'pending':
            return 10
        return 0

    def get_can_cancel(self, obj):
        return obj.status in ['pending', 'generating']

class ReportCreateSerializer(serializers.Serializer):
    """Serializer for creating new reports"""
    title = serializers.CharField(max_length=200)
    template_id = serializers.UUIDField()
    parameters = serializers.JSONField(default=dict)
    priority = serializers.ChoiceField(choices=Report.PRIORITY_CHOICES, default='normal')
    format = serializers.ChoiceField(choices=Report.FORMAT_CHOICES, default='pdf')

    def validate_template_id(self, value):
        from .models import ReportTemplate
        template = ReportTemplate.objects.filter(id=value, is_active=True).first()
        if not template:
            raise serializers.ValidationError("Invalid or inactive template")
        return value

    def validate_parameters(self, value):
        template_id = self.initial_data.get('template_id')
        from .models import ReportTemplate
        template = ReportTemplate.objects.get(id=template_id)
        required_params = template.parameters.get('required', [])

        for param in required_params:
            if param not in value or not value[param]:
                raise serializers.ValidationError(f"Missing required parameter: {param}")
        return value

class ReportStatusSerializer(serializers.Serializer):
    """Serializer for report status updates"""
    status = serializers.ChoiceField(choices=Report.STATUS_CHOICES)
    progress = serializers.IntegerField(min_value=0, max_value=100, required=False)
    message = serializers.CharField(max_length=500, required=False)
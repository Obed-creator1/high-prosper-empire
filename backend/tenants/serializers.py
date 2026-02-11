# backend/tenants/serializers.py
from django.template.defaultfilters import slugify
from rest_framework import serializers
from rest_framework.exceptions import ValidationError
from django.utils.translation import gettext_lazy as _
from .models import Company, Branch
from django.contrib.auth import get_user_model

User = get_user_model()


class CompanyMinimalSerializer(serializers.ModelSerializer):
    """For dropdowns in user form"""
    class Meta:
        model = Company
        fields = ['id', 'name', 'slug', 'logo', 'is_active']
        read_only_fields = ['slug']


class BranchMinimalSerializer(serializers.ModelSerializer):
    """For dropdowns in user form - filtered by company"""
    class Meta:
        model = Branch
        fields = ['id', 'name', 'slug', 'company_id', 'city', 'is_active']
        read_only_fields = ['slug', 'company_id']




class CompanySerializer(serializers.ModelSerializer):
    """
    Full Company (Tenant) serializer with nested branches read support
    Supports create/update with auto-assign creator
    """
    branches = BranchMinimalSerializer(many=True, read_only=True)
    branch_count = serializers.IntegerField(read_only=True, source='branches.count')
    user_count = serializers.IntegerField(read_only=True, source='users.count')
    created_by_username = serializers.CharField(source='created_by.username', read_only=True, allow_null=True)

    class Meta:
        model = Company
        fields = [
            'id', 'name', 'slug', 'logo', 'website',
            'email', 'phone', 'address', 'city', 'country',
            'currency', 'timezone', 'tax_id',
            'is_active',
            'created_at', 'updated_at', 'created_by', 'created_by_username',
            'branches', 'branch_count', 'user_count',
        ]
        read_only_fields = [
            'slug', 'created_at', 'updated_at',
            'created_by_username', 'branch_count', 'user_count'
        ]
        extra_kwargs = {
            'created_by': {'write_only': True, 'required': False},
        }

    def validate(self, data):
        # Ensure name is unique (case-insensitive)
        name = data.get('name')
        if name and self.instance is None:  # Create
            if Company.objects.filter(name__iexact=name).exists():
                raise ValidationError({"name": _("A company with this name already exists.")})
        return data

    def create(self, validated_data):
        # Auto-assign current user as creator
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            validated_data['created_by'] = request.user

        # Auto-generate slug
        if 'name' in validated_data and not validated_data.get('slug'):
            validated_data['slug'] = slugify(validated_data['name'])

        return super().create(validated_data)

    def update(self, instance, validated_data):
        # Prevent changing slug manually after creation
        if 'slug' in validated_data:
            validated_data.pop('slug')

        return super().update(instance, validated_data)


# Optional: Serializer for list-only or dropdowns with extra stats
class CompanyListSerializer(CompanySerializer):
    class Meta(CompanySerializer.Meta):
        fields = [
            'id', 'name', 'slug', 'logo', 'is_active',
            'branch_count', 'user_count',
            'created_at',
        ]

class BranchSerializer(serializers.ModelSerializer):
    """
    Full Branch serializer with support for create/update/delete.
    Supports nested company reference and manager assignment by ID.
    """
    company = CompanySerializer(read_only=True)  # nested company
    company_id = serializers.PrimaryKeyRelatedField(
        queryset=Company.objects.all(),
        source='company',
        write_only=True,
        required=False
    )
    # Read-only computed/display fields
    company_name = serializers.CharField(source='company.name', read_only=True, allow_null=True)
    manager_name = serializers.CharField(source='manager.get_full_name', read_only=True, allow_null=True)
    user_count = serializers.IntegerField(read_only=True, source='users.count', default=0)

    class Meta:
        model = Branch
        fields = [
            'id',
            # Company - allow input by ID, show name in response
            'company',             # ← ADD THIS (or 'company_id' if that's what you use)
            'company_id',          # ← keep this if you have it
            'company_name',
            # Branch core fields
            'name', 'slug',
            'address', 'city', 'region',
            'phone', 'email',
            # Manager - allow input by ID, show name in response
            'manager', 'manager_name',
            # Status & timestamps
            'is_active',
            'created_at', 'updated_at',
            # Stats
            'user_count',
        ]

        read_only_fields = [
            'id',
            'company_name',
            'manager_name',
            'user_count',
            'created_at',
            'updated_at',
        ]

        # Only set write_only/write rules here — never combine with read_only
        extra_kwargs = {
            'company_id': {'write_only': True, 'required': False},  # accept ID on create/update
            'manager': {'write_only': True, 'required': False, 'allow_null': True},
            'slug': {'read_only': True},  # if slug is auto-generated, keep read_only
        }

    def validate(self, data):
        # Ensure either company or company_id is provided
        if not data.get('company') and not data.get('company_id'):
            raise ValidationError(_("Either 'company' or 'company_id' must be provided."))

        # Prevent assigning manager from different company
        if data.get('manager'):
            company = data.get('company') or Company.objects.filter(id=data.get('company_id')).first()
            if company and data['manager'].company != company:
                raise ValidationError(_("Manager must belong to the same company as the branch."))

        return data

    def create(self, validated_data):
        company_id = validated_data.pop('company_id', None)
        if company_id:
            validated_data['company_id'] = company_id

        # Auto-generate slug if not provided
        if 'name' in validated_data and not validated_data.get('slug'):
            validated_data['slug'] = slugify(f"{validated_data['company'].name}-{validated_data['name']}")

        return super().create(validated_data)

    def update(self, instance, validated_data):
        # Allow changing company (careful - may affect data isolation)
        if 'company_id' in validated_data:
            instance.company_id = validated_data.pop('company_id')

        return super().update(instance, validated_data)


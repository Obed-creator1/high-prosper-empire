from django.urls import reverse
from rest_framework.test import APITestCase
from rest_framework import status
from unittest.mock import patch
from users.models import CustomUser
from customers.models import Customer
from .models import Invoice, Payment


class PaymentViewsTestCase(APITestCase):

    def setUp(self):
        # Create user & customer
        self.user = CustomUser.objects.create_user(
            username="testuser", password="password123", role="customer"
        )
        self.customer = Customer.objects.create(
            user=self.user, name="Test Customer", payment_account="250788123456", outstanding=0
        )
        self.invoice = Invoice.objects.create(
            customer=self.customer, amount=1000, due_date="2025-11-20"
        )
        self.payment = Payment.objects.create(
            customer=self.customer,
            invoice=self.invoice,
            amount=1000,
            method="momo"
        )
        self.client.force_authenticate(user=self.user)

    @patch("payments.models.requests.post")
    @patch("payments.models.Payment.get_momo_token")
    def test_api_initiate_momo_payment(self, mock_token, mock_post):
        mock_token.return_value = "dummy_token"
        mock_post.return_value.status_code = 202
        mock_post.return_value.json.return_value = {"transactionId": "1234", "status": "Initiated"}

        url = reverse("payments-initiate", args=[self.payment.id])
        response = self.client.post(url)

        self.payment.refresh_from_db()
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(self.payment.status, "Initiated")
        self.assertIn("transactionId", response.json())

    @patch("payments.models.requests.get")
    @patch("payments.models.Payment.get_momo_token")
    def test_api_confirm_momo_payment(self, mock_token, mock_get):
        mock_token.return_value = "dummy_token"
        mock_get.return_value.json.return_value = {"status": "SUCCESSFUL"}

        url = reverse("payments-confirm", args=[self.payment.id])
        response = self.client.post(url, {"transaction_id": "1234"}, format="json")

        self.payment.refresh_from_db()
        self.invoice.refresh_from_db()
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(self.payment.status, "Paid")
        self.assertEqual(self.invoice.status, "Paid")

    @patch("payments.models.requests.post")
    @patch("payments.models.Payment.get_irembo_token")
    def test_api_initiate_irembo_payment(self, mock_token, mock_post):
        mock_token.return_value = "dummy_token"
        mock_post.return_value.status_code = 200
        mock_post.return_value.json.return_value = {"transactionId": "5678", "status": "Initiated"}

        self.payment.method = "irembo"
        self.payment.save()

        url = reverse("payments-initiate", args=[self.payment.id])
        response = self.client.post(url)

        self.payment.refresh_from_db()
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(self.payment.status, "Initiated")
        self.assertIn("transactionId", response.json())

    @patch("payments.models.requests.get")
    @patch("payments.models.Payment.get_irembo_token")
    def test_api_confirm_irembo_payment(self, mock_token, mock_get):
        mock_token.return_value = "dummy_token"
        mock_get.return_value.json.return_value = {"status": "SUCCESS"}

        self.payment.method = "irembo"
        self.payment.save()

        url = reverse("payments-confirm", args=[self.payment.id])
        response = self.client.post(url, {"transaction_id": "5678"}, format="json")

        self.payment.refresh_from_db()
        self.invoice.refresh_from_db()
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(self.payment.status, "Paid")
        self.assertEqual(self.invoice.status, "Paid")
